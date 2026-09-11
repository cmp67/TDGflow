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

describe('GET /api/agent/verify-user — nono dígito do celular BR (achado 11/09)', () => {
  // WhatsApp entrega alguns celulares sem o 9 depois do DDD (ex. Dani
  // Filippozzi chega como 555181477111, cadastrada como 5551981477111) —
  // mesmo número, dois formatos. Precisa casar nos dois sentidos.
  const suffix = Date.now() + 10
  // Começa com 8: celular no formato antigo (fixo 2-5 não ganha o 9).
  const tail8 = `8${String(suffix).slice(-7)}`
  const phone13 = `55519${tail8}`
  const phone12 = `5551${tail8}`
  const email13 = `__tdd_verify_9dig13_${suffix}__@example.com`

  const suffixB = suffix + 1
  const tail8B = `8${String(suffixB).slice(-7)}`
  const phone13B = `55519${tail8B}`
  const phone12B = `5551${tail8B}`
  const email12 = `__tdd_verify_9dig12_${suffixB}__@example.com`

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp, active)
      VALUES (${'TDD NineDigitA' + suffix}, ${email13}, 'TDD Agency', 'x', 'agent', ${phone13}, true)
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp, active)
      VALUES (${'TDD NineDigitB' + suffixB}, ${email12}, 'TDD Agency', 'x', 'agent', ${phone12B}, true)
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${email13}, ${email12})`
  })

  it('cadastro com 9 (13 dígitos) casa quando o WhatsApp manda sem o 9 (12 dígitos)', async () => {
    const res = await GET(req(`?phone=${phone12}&context=grupo`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('phone')
  })

  it('cadastro sem 9 (12 dígitos) casa quando o WhatsApp manda com o 9 (13 dígitos)', async () => {
    const res = await GET(req(`?phone=${phone13B}&context=individual`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('phone')
  })

  it('telefone com + e espaços continua casando (formato livre)', async () => {
    const res = await GET(req(`?phone=${encodeURIComponent('+55 51 ' + tail8)}`))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/agent/verify-user — identidade vinda do sistema, não do modelo (achado 11/09)', () => {
  // O Max (DeepSeek) não enxerga o telefone do contato: mandou phone=0 num
  // 1:1 real e phone="AUDIT T1 Humberto" (nome do chat) num teste. O GPT
  // Maker injeta contact_phone/chat_id como variável de sistema — isso
  // passa a ser a fonte da verdade. Em grupo, contact_phone é o ID do
  // grupo ("<número do criador>-<timestamp>"): serve só pra saber que é
  // grupo, NUNCA como identidade (senão todo mundo vira o criador).
  const suffix = Date.now() + 20
  const phone = `55119${String(suffix).slice(-8)}`
  const email = `__tdd_verify_sys_${suffix}__@example.com`
  const fullName = `TDD SystemVarCase${suffix} Solo`
  const groupJid = `${phone}-1597779397`

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp, active)
      VALUES (${fullName}, ${email}, 'TDD Agency', 'x', 'agent', ${phone}, true)
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_agent_name_fallback_log WHERE input_name = ${fullName}`
  })

  it('1:1: usa contact_phone do sistema mesmo com phone lixo vindo do modelo', async () => {
    const res = await GET(req(`?contact_phone=${phone}&phone=${encodeURIComponent('AUDIT T1 Humberto')}&context=individual`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('phone')
  })

  it('grupo: ID do grupo (número do criador) nunca autentica ninguém sozinho', async () => {
    const res = await GET(req(`?contact_phone=${groupJid}&phone=0&context=grupo`))
    expect(res.status).toBe(404)
  })

  it('grupo: autentica pelo telefone do remetente que o modelo leu da mensagem', async () => {
    const res = await GET(req(`?contact_phone=${encodeURIComponent('5511000000000-1597779397')}&phone=${phone}&context=grupo`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('phone')
  })

  it('grupo detectado pelo sistema libera fallback por nome mesmo se o modelo disser "individual"', async () => {
    const res = await GET(req(`?contact_phone=${encodeURIComponent('5511000000000-1597779397')}&phone=0&name=${encodeURIComponent(fullName)}&context=individual`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('name')
  })

  it('1:1 detectado pelo sistema bloqueia fallback por nome mesmo se o modelo disser "grupo"', async () => {
    const res = await GET(req(`?contact_phone=5511900000009&name=${encodeURIComponent(fullName)}&context=grupo`))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/agent/verify-user — bordas apontadas na revisão (11/09)', () => {
  const suffix = Date.now() + 30
  const tail8 = String(suffix).slice(-8)
  // Celular novo que começa com 9 3xxx-xxxx: sem a trava 6-9, o fixo
  // 3xxx-xxxx do mesmo DDD ganharia um 9 e casaria com ele.
  const mobile = `551193${tail8.slice(1)}`
  const email = `__tdd_verify_edge_${suffix}__@example.com`
  const fullName = `TDD EdgeCase${suffix} Solo`

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp, active)
      VALUES (${fullName}, ${email}, 'TDD Agency', 'x', 'agent', ${mobile}, true)
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_agent_name_fallback_log WHERE input_name = ${fullName}`
  })

  it('número hifenizado de 1:1 não vira "grupo" nem libera fallback por nome', async () => {
    const res = await GET(req(`?contact_phone=96398-9538&name=${encodeURIComponent(fullName)}`))
    expect(res.status).toBe(404)
  })

  it('ID de grupo com sufixo @g.us continua reconhecido como grupo', async () => {
    const res = await GET(req(`?contact_phone=${encodeURIComponent('5511000000000-1597779397@g.us')}&phone=0&name=${encodeURIComponent(fullName)}`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('name')
  })

  it('fixo de 12 dígitos (começa com 2-5) não ganha 9 e não casa com celular de outra pessoa', async () => {
    const landlineTail = `3${tail8.slice(1)}`
    const res = await GET(req(`?phone=5511${landlineTail}`))
    expect(res.status).toBe(404)
  })

  // Rede de segurança: se o GPT Maker mandar em grupo só o número do
  // criador em contact_phone (em vez do ID do grupo), o chat_id ainda
  // denuncia o grupo — "<canal hex>-<número>-<timestamp>".
  const channel = '3F61D3C497FCA16E05B0BAC033931060'

  it('grupo pelo chat_id: número do criador em contact_phone NÃO autentica o criador', async () => {
    const res = await GET(req(`?contact_phone=${mobile}&chat_id=${channel}-${mobile}-1597779397&phone=desconhecido&name=desconhecido`))
    expect(res.status).toBe(404)
  })

  it('grupo pelo chat_id: libera fallback por nome do remetente', async () => {
    const res = await GET(req(`?contact_phone=5511000000000&chat_id=${channel}-5511000000000-1597779397&phone=desconhecido&name=${encodeURIComponent(fullName)}`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('name')
  })

  it('1:1 pelo chat_id continua autenticando pelo contact_phone', async () => {
    const res = await GET(req(`?contact_phone=${mobile}&chat_id=${channel}-${mobile}&phone=sistema`))
    expect(res.status).toBe(200)
  })

  it('chat de API com hífens no contexto não é tratado como grupo', async () => {
    const res = await GET(req(`?contact_phone=${mobile}&chat_id=public-api-3F1A294F6854313BDCA57A2FA8D0FC36-audit-0911-99-12345&phone=sistema`))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified_by).toBe('phone')
  })
})
