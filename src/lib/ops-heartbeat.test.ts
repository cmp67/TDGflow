import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { sql } from '@vercel/postgres'
import {
  readOpsConfig,
  buildHeartbeatPayload,
  sendHeartbeat,
  collectLumisSnapshot,
  checkDatabase,
  OPS_TIMEOUT_MS,
} from './ops-heartbeat'
import { getCurrentPeriod, POOL_CONFIG } from './credits'

// ── Config ───────────────────────────────────────────────────────────────────

describe('readOpsConfig', () => {
  it('sem OPS_URL, devolve null (nada muda no Flow)', () => {
    expect(readOpsConfig({})).toBeNull()
    expect(readOpsConfig({ OPS_HEARTBEAT_TOKEN: 'x' })).toBeNull()
  })

  it('com OPS_URL mas sem token, devolve null — nunca manda heartbeat anônimo', () => {
    expect(readOpsConfig({ OPS_URL: 'https://ops.example' })).toBeNull()
  })

  it('com os dois, devolve url sem barra final e o token', () => {
    expect(readOpsConfig({ OPS_URL: 'https://ops.example/', OPS_HEARTBEAT_TOKEN: 'tok' }))
      .toEqual({ url: 'https://ops.example', token: 'tok' })
  })
})

// ── Payload ──────────────────────────────────────────────────────────────────

describe('buildHeartbeatPayload', () => {
  const lumis = { ciclo_inicio: '2026-10-01', incluidos: 9500, extras: 120, consumidos: 312 }

  it('banco ok + lumis → status ok com os campos exatos do contrato (nada a mais)', () => {
    const payload = buildHeartbeatPayload({ dbOk: true, latencyMs: 42, version: 'v7.203', lumis })
    expect(payload).toEqual({
      status: 'ok', version: 'v7.203', db_ok: true, latency_ms: 42, lumis,
    })
    expect(Object.keys(payload).sort()).toEqual(['db_ok', 'latency_ms', 'lumis', 'status', 'version'])
  })

  it('banco fora → status down, sem bloco lumis', () => {
    const payload = buildHeartbeatPayload({ dbOk: false, latencyMs: 5000, version: 'v7.203', lumis: null })
    expect(payload).toEqual({ status: 'down', version: 'v7.203', db_ok: false, latency_ms: 5000 })
    expect('lumis' in payload).toBe(false)
  })

  it('banco ok mas snapshot de lumis falhou → degraded, sem bloco lumis', () => {
    const payload = buildHeartbeatPayload({ dbOk: true, latencyMs: 10, version: 'v7.203', lumis: null })
    expect(payload.status).toBe('degraded')
    expect('lumis' in payload).toBe(false)
  })

  it('latência vira inteiro ≥ 0 (o Ops exige int ge=0)', () => {
    const payload = buildHeartbeatPayload({ dbOk: true, latencyMs: 12.7, version: 'v', lumis })
    expect(payload.latency_ms).toBe(13)
    expect(Number.isInteger(payload.latency_ms)).toBe(true)
  })
})

// ── Envio ────────────────────────────────────────────────────────────────────

describe('sendHeartbeat', () => {
  const config = { url: 'https://ops.example', token: 'segredo' }
  const payload = { status: 'ok' as const, version: 'v7.203', db_ok: true, latency_ms: 1 }

  afterEach(() => { vi.unstubAllGlobals() })

  it('faz POST em /api/v1/heartbeat com X-Heartbeat-Token, JSON e timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"received":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendHeartbeat(payload, config)

    expect(result).toEqual({ sent: true, httpStatus: 200 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ops.example/api/v1/heartbeat')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Heartbeat-Token']).toBe('segredo')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(payload)
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('resposta não-2xx (429, 422) → sent false com o status, sem lançar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('cedo demais', { status: 429 })))
    const result = await sendHeartbeat(payload, config)
    expect(result).toEqual({ sent: false, httpStatus: 429, error: 'cedo demais' })
  })

  it('erro de rede / timeout → sent false com a mensagem, sem lançar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    const result = await sendHeartbeat(payload, config)
    expect(result).toEqual({ sent: false, error: 'fetch failed' })
  })

  it('nunca inclui o token no resultado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')))
    const result = await sendHeartbeat(payload, config)
    expect(JSON.stringify(result)).not.toContain('segredo')
  })

  it('timeout é de 5 s', () => {
    expect(OPS_TIMEOUT_MS).toBe(5000)
  })
})

// ── Banco (integração — Neon dev) ────────────────────────────────────────────

describe('checkDatabase', () => {
  it('responde ok com latência medida quando o banco está de pé', async () => {
    const result = await checkDatabase()
    expect(result.ok).toBe(true)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })
})

// ── Snapshot de Lumis (integração — Neon dev) ────────────────────────────────
// Uma agência descartável entra no ciclo corrente com cota, consumo, devolução
// ao pool e top-up; o snapshot precisa refletir cada regra do handoff. Uma
// segunda agência (is_test = true) existe só pra provar que fica de fora.

describe('collectLumisSnapshot', () => {
  const period = getCurrentPeriod()
  let agencyId: string
  let testAgencyId: string
  const suffix = Date.now().toString().slice(-4)

  beforeAll(async () => {
    const a = await sql`INSERT INTO tdg_agencies (name, cnpj) VALUES ('__HB_TEST_AGENCY__', ${`11.000.000/${suffix}-00`}) RETURNING id`
    agencyId = a.rows[0].id as string
    const t = await sql`INSERT INTO tdg_agencies (name, cnpj, is_test) VALUES ('__HB_TEST_AGENCY_T__', ${`12.000.000/${suffix}-00`}, true) RETURNING id`
    testAgencyId = t.rows[0].id as string

    await sql`INSERT INTO tdg_agency_cycles (agency_id, period, quota, consumed, returned) VALUES (${agencyId}, ${period}, 500, 30, 0)`
    await sql`INSERT INTO tdg_agency_cycles (agency_id, period, quota, consumed, returned) VALUES (${testAgencyId}, ${period}, 500, 999, 0)`
    await sql`INSERT INTO tdg_credits_balance (agency_id, balance, tier) VALUES (${agencyId}, 70, 'pkg_100')`
    await sql`INSERT INTO tdg_credits_balance (agency_id, balance, tier) VALUES (${testAgencyId}, 1000, 'pkg_500')`
    // Consumo real: chat (9) + transcription (5) de cota, 7 de topup, 9 'soft'
    await sql`INSERT INTO tdg_credits_ledger (agency_id, amount, action_type, user_email, source) VALUES
      (${agencyId}, -9, 'chat', 'hb@example.com', 'quota'),
      (${agencyId}, -5, 'transcription', 'hb@example.com', 'quota'),
      (${agencyId}, -7, 'chat', 'hb@example.com', 'topup'),
      (${agencyId}, -9, 'transcription', 'hb@example.com', 'soft'),
      (${agencyId}, -50, 'pool_return', 'hb@example.com', 'quota'),
      (${agencyId}, 100, 'purchase', 'hb@example.com', 'topup'),
      (${testAgencyId}, -99, 'chat', 'hb@example.com', 'quota')`
  })

  afterAll(async () => {
    for (const id of [agencyId, testAgencyId]) {
      await sql`DELETE FROM tdg_credits_ledger WHERE agency_id = ${id}`
      await sql`DELETE FROM tdg_agency_cycles WHERE agency_id = ${id}`
      await sql`DELETE FROM tdg_credits_balance WHERE agency_id = ${id}`
      await sql`DELETE FROM tdg_agencies WHERE id = ${id}`
    }
  })

  it('ciclo_inicio é o mês civil UTC, igual a getCurrentPeriod()', async () => {
    const snap = await collectLumisSnapshot()
    expect(snap.ciclo_inicio).toBe(period)
    expect(snap.ciclo_inicio).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('consumidos conta débitos do mês de qualquer fonte, sem pool_return nem créditos, e ignora agência de teste', async () => {
    const baseline = await collectLumisSnapshot()
    // 9 + 5 + 7 + 9 = 30 desta agência; -50 pool_return e +100 purchase ficam de fora;
    // a agência is_test nunca entra. O baseline inclui o resto da rede, então
    // comparamos a diferença após remover só as linhas desta agência.
    await sql`DELETE FROM tdg_credits_ledger WHERE agency_id = ${agencyId}`
    const without = await collectLumisSnapshot()
    expect(baseline.consumidos - without.consumidos).toBe(30)
  })

  it('incluidos soma a cota das agências ativas e conta quotaPerAgency pra quem ainda não tem linha no ciclo', async () => {
    const withRow = await collectLumisSnapshot()
    await sql`DELETE FROM tdg_agency_cycles WHERE agency_id = ${agencyId} AND period = ${period}`
    const withoutRow = await collectLumisSnapshot()
    // Sem linha, a agência conta a cota padrão (500) — igual à linha que tinha.
    expect(withoutRow.incluidos).toBe(withRow.incluidos)
    await sql`UPDATE tdg_agencies SET active = false WHERE id = ${agencyId}`
    const inactive = await collectLumisSnapshot()
    expect(withRow.incluidos - inactive.incluidos).toBe(POOL_CONFIG.quotaPerAgency)
    await sql`UPDATE tdg_agencies SET active = true WHERE id = ${agencyId}`
  })

  it('extras soma top-up (≥0) das agências ativas mais o pool central do período', async () => {
    const before = await collectLumisSnapshot()
    await sql`UPDATE tdg_credits_balance SET balance = -40 WHERE agency_id = ${agencyId}`
    const negative = await collectLumisSnapshot()
    // 70 → 0 (GREATEST com 0): cai exatamente 70
    expect(before.extras - negative.extras).toBe(70)
    await sql`INSERT INTO tdg_central_pool (period, balance) VALUES (${period}, 0) ON CONFLICT (period) DO NOTHING`
    await sql`UPDATE tdg_central_pool SET balance = balance + 25 WHERE period = ${period}`
    const withPool = await collectLumisSnapshot()
    expect(withPool.extras - negative.extras).toBe(25)
    await sql`UPDATE tdg_central_pool SET balance = balance - 25 WHERE period = ${period}`
  })

  it('agência __TDD sobrando de teste interrompido nunca entra na cota (achado 17/10)', async () => {
    const before = await collectLumisSnapshot()
    const { rows } = await sql`INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_SOBRA_HB__', ${`99.000.000/${suffix}-00`}) RETURNING id`
    try {
      const after = await collectLumisSnapshot()
      expect(after.incluidos).toBe(before.incluidos)
    } finally {
      await sql`DELETE FROM tdg_agencies WHERE id = ${rows[0].id}`
    }
  })

  it('todos os campos são inteiros não negativos (contrato do Ops: ge=0)', async () => {
    const snap = await collectLumisSnapshot()
    for (const key of ['incluidos', 'extras', 'consumidos'] as const) {
      expect(Number.isInteger(snap[key])).toBe(true)
      expect(snap[key]).toBeGreaterThanOrEqual(0)
    }
  })
})
