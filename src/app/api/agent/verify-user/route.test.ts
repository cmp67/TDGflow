import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { GET } from './route'

const AGENT_SECRET = (process.env.AGENT_SECRET ?? '').trim()

function req(qs: string, token = AGENT_SECRET) {
  return new Request(`http://localhost/api/agent/verify-user${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/agent/verify-user — fallback por nome (LID do WhatsApp escondendo telefone, 25/08)', () => {
  // Segundas palavras deliberadamente distintas entre os grupos de fixture
  // (FallbackCase/DupCase/InactiveCase) — isAuthorMatch casa por primeira
  // palavra + qualquer outra, e todo fixture de teste começa com "TDD"; se
  // os grupos compartilhassem uma segunda palavra (ex. "Verify" em todos),
  // um teste vazaria match pro fixture do outro.
  const suffix = Date.now()
  // slice(-8) preserva os últimos dígitos (onde a variação entre suffix/
  // +1/+2 realmente mora) — slice(0, N) cortaria justo essa parte fora e
  // gerava telefones de teste colidindo entre si (achado rodando o teste).
  const phone = `55119${String(suffix).slice(-8)}`
  const email = `__tdd_verify_${suffix}__@example.com`
  const fullName = `TDD FallbackCase${suffix} Solo`

  const dupSuffix = suffix + 1
  const dupEmail1 = `__tdd_verify_dup1_${dupSuffix}__@example.com`
  const dupEmail2 = `__tdd_verify_dup2_${dupSuffix}__@example.com`
  const dupNameBase = `TDD DupCase${dupSuffix}`

  const inactiveSuffix = suffix + 2
  const inactivePhone = `55119${String(inactiveSuffix).slice(-8)}`
  const inactiveEmail = `__tdd_verify_inactive_${inactiveSuffix}__@example.com`
  const inactiveName = `TDD InactiveCase${inactiveSuffix}`

  beforeAll(async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS tdg_agent_name_fallback_log (
        id              SERIAL PRIMARY KEY,
        matched_user_id TEXT,
        matched_name    TEXT,
        input_name      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp, active)
      VALUES (${fullName}, ${email}, 'TDD Agency', 'x', 'agent', ${phone}, true)
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, active)
      VALUES (${dupNameBase + ' Adams'}, ${dupEmail1}, 'TDD Agency', 'x', 'agent', true)
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, active)
      VALUES (${dupNameBase + ' Baker'}, ${dupEmail2}, 'TDD Agency', 'x', 'agent', true)
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp, active)
      VALUES (${inactiveName}, ${inactiveEmail}, 'TDD Agency', 'x', 'agent', ${inactivePhone}, false)
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${email}, ${dupEmail1}, ${dupEmail2}, ${inactiveEmail})`
    await sql`DELETE FROM tdg_agent_name_fallback_log WHERE input_name = ${fullName}`
  })

  it('rejeita sem secret quando AGENT_SECRET está configurado', () => {
    if (!AGENT_SECRET) return // ambiente local sem o secret — checagem desligada de propósito
    return GET(req(`?phone=${phone}`, '')).then(res => expect(res.status).toBe(401))
  })

  it('exige phone ou name', async () => {
    const res = await GET(req(''))
    expect(res.status).toBe(400)
  })

  it('verifica por telefone normalmente (caminho primário, sem mudança)', async () => {
    const res = await GET(req(`?phone=${phone}`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.registered).toBe(true)
    expect(data.verified_by).toBe('phone')
  })

  it('telefone inativo retorna 403, sem tentar fallback por nome', async () => {
    const res = await GET(req(`?phone=${inactivePhone}`))
    expect(res.status).toBe(403)
  })

  it('sem telefone, com nome, mas SEM context=grupo: não faz fallback (1:1 não é confiável)', async () => {
    const res = await GET(req(`?name=${encodeURIComponent(fullName)}&context=individual`))
    expect(res.status).toBe(404)
  })

  it('sem telefone, com nome e context=grupo: cai no fallback por nome', async () => {
    const res = await GET(req(`?name=${encodeURIComponent(fullName)}&context=grupo`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.registered).toBe(true)
    expect(data.verified_by).toBe('name')

    const { rows } = await sql`SELECT * FROM tdg_agent_name_fallback_log WHERE input_name = ${fullName}`
    expect(rows.length).toBe(1)
  })

  it('nome ambíguo (bate com mais de uma conta) não resolve sozinho — não escolhe ao acaso', async () => {
    const res = await GET(req(`?name=${encodeURIComponent(dupNameBase)}&context=grupo`))
    expect(res.status).toBe(404)
  })
})
