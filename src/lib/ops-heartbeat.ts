import { sql } from '@vercel/postgres'
import { getCurrentPeriod, POOL_CONFIG } from './credits'

/* Heartbeat do TDG Flow pro Bemgsy Ops (central de monitoramento da Bemgsy).
   Contrato: ~/Projects/bemgsy-ops/docs/central-de-agentes.md — POST
   /api/v1/heartbeat com `X-Heartbeat-Token`, corpo fechado (o Ops responde
   422 pra qualquer campo extra) e bloco opcional `lumis` com a foto do pool
   do ciclo corrente. O pool do Ops é POR SISTEMA: o Flow inteiro, todas as
   agências somadas; a repartição por agência fica só aqui no produto.

   Regra de ouro: falar com o Ops NUNCA afeta o Flow. Nada aqui lança pra
   fora — timeout curto, log, segue. Sem OPS_URL configurada, nada acontece. */

export const OPS_TIMEOUT_MS = 5000

export type OpsConfig = { url: string; token: string }

export type LumisSnapshot = {
  ciclo_inicio: string
  incluidos:    number
  extras:       number
  consumidos:   number
}

export type HeartbeatStatus = 'ok' | 'degraded' | 'down'

export type HeartbeatPayload = {
  status:     HeartbeatStatus
  version:    string
  db_ok:      boolean
  latency_ms: number
  lumis?:     LumisSnapshot
  componentes?: { nome: string; ok: boolean; detalhe?: string }[]
}

export type SendResult =
  | { sent: true;  httpStatus: number }
  | { sent: false; httpStatus?: number; error: string }

// ── Config ───────────────────────────────────────────────────────────────────

export function readOpsConfig(env: Record<string, string | undefined>): OpsConfig | null {
  const url   = env.OPS_URL?.trim()
  const token = env.OPS_HEARTBEAT_TOKEN?.trim()
  if (!url || !token) return null
  return { url: url.replace(/\/+$/, ''), token }
}

// ── Banco ────────────────────────────────────────────────────────────────────

export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now()
  try {
    await sql`SELECT 1`
    return { ok: true, latencyMs: Date.now() - started }
  } catch (err) {
    console.error('[ops-heartbeat] banco não respondeu', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, latencyMs: Date.now() - started }
  }
}

// ── Foto de Lumis do ciclo ───────────────────────────────────────────────────
// Mês civil UTC, igual a getCurrentPeriod() em credits.ts. Só agências
// `active = true AND is_test = false`, como getAgencyBreakdown() — e nunca
// as `__TDD…` que um teste interrompido deixa pra trás (achado 17/10: o Ops
// contava 25 agências em vez das 19 do contrato).
//   incluidos  = SUM(quota) das linhas de tdg_agency_cycles do período; agência
//                ainda sem linha conta POOL_CONFIG.quotaPerAgency (é o que a
//                linha receberia ao ser criada — ensureCycleRow).
//   consumidos = SUM(ABS(amount)) do ledger com amount < 0, created_at no mês,
//                qualquer fonte (quota/central_pool/topup/soft), menos
//                'pool_return' (é devolução, não consumo).
//   extras     = SUM(GREATEST(balance, 0)) de tdg_credits_balance (saldo de
//                recarga que não expira) + tdg_central_pool.balance do período.

function clampInt(value: unknown): number {
  const n = Math.round(Number(value ?? 0))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export async function collectLumisSnapshot(): Promise<LumisSnapshot> {
  const period = getCurrentPeriod()
  const defaultQuota = POOL_CONFIG.quotaPerAgency

  const [included, consumed, extras] = await Promise.all([
    sql`
      SELECT COALESCE(SUM(COALESCE(c.quota, ${defaultQuota})), 0)::bigint AS total
      FROM tdg_agencies a
      LEFT JOIN tdg_agency_cycles c
        ON c.agency_id = a.id AND c.period = ${period}::date
      WHERE a.active = true AND a.is_test = false AND a.name NOT LIKE '\\_\\_TDD%'
    `,
    sql`
      SELECT COALESCE(SUM(ABS(l.amount)), 0)::bigint AS total
      FROM tdg_credits_ledger l
      JOIN tdg_agencies a ON a.id = l.agency_id
      WHERE a.active = true AND a.is_test = false AND a.name NOT LIKE '\\_\\_TDD%'
        AND l.amount < 0
        AND l.action_type <> 'pool_return'
        AND l.created_at >= ${period}::date
        AND l.created_at <  (${period}::date + INTERVAL '1 month')
    `,
    sql`
      SELECT
        (SELECT COALESCE(SUM(GREATEST(b.balance, 0)), 0)
           FROM tdg_credits_balance b
           JOIN tdg_agencies a ON a.id = b.agency_id
          WHERE a.active = true AND a.is_test = false)
        + COALESCE((SELECT balance FROM tdg_central_pool WHERE period = ${period}::date), 0)
        AS total
    `,
  ])

  return {
    ciclo_inicio: period,
    incluidos:    clampInt(included.rows[0]?.total),
    consumidos:   clampInt(consumed.rows[0]?.total),
    extras:       clampInt(extras.rows[0]?.total),
  }
}

// ── Payload ──────────────────────────────────────────────────────────────────

export function buildHeartbeatPayload(input: {
  dbOk:      boolean
  latencyMs: number
  version:   string
  lumis:     LumisSnapshot | null
  componentes?: { nome: string; ok: boolean; detalhe?: string }[]
}): HeartbeatPayload {
  const componentes = input.componentes ?? []
  const pecaFalhou = componentes.some(c => !c.ok)
  const status: HeartbeatStatus = !input.dbOk ? 'down' : input.lumis && !pecaFalhou ? 'ok' : 'degraded'
  const base = {
    status,
    version:    input.version,
    db_ok:      input.dbOk,
    latency_ms: clampInt(input.latencyMs),
  }
  const withLumis = input.lumis ? { ...base, lumis: input.lumis } : base
  return componentes.length ? { ...withLumis, componentes } : withLumis
}

// ── Envio ────────────────────────────────────────────────────────────────────

export async function sendHeartbeat(payload: HeartbeatPayload, config: OpsConfig): Promise<SendResult> {
  try {
    const res = await fetch(`${config.url}/api/v1/heartbeat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Heartbeat-Token': config.token },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(OPS_TIMEOUT_MS),
    })
    if (res.ok) return { sent: true, httpStatus: res.status }

    const error = (await res.text().catch(() => '')).slice(0, 300)
    console.warn('[ops-heartbeat] Ops recusou o heartbeat', { httpStatus: res.status, error })
    return { sent: false, httpStatus: res.status, error }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.warn('[ops-heartbeat] não conseguiu falar com o Ops', { error })
    return { sent: false, error }
  }
}
