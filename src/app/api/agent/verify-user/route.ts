import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorMatch } from '@/lib/author-match'

export const dynamic = 'force-dynamic'

type UserRow = {
  id: string
  name: string
  agency_name: string
  role: string
  active: boolean
  agent_interaction_id: string | null
}

async function ensureFallbackLogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_agent_name_fallback_log (
      id              SERIAL PRIMARY KEY,
      matched_user_id TEXT,
      matched_name    TEXT,
      input_name      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

async function ensureRequestLogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_agent_verify_request_log (
      id          SERIAL PRIMARY KEY,
      raw_query   TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

async function logRequest(rawQuery: string) {
  await ensureRequestLogTable()
  await sql`
    INSERT INTO tdg_agent_verify_request_log (raw_query)
    VALUES (${rawQuery})
  `
}

// Celular BR chega do WhatsApp às vezes sem o 9 depois do DDD (achado
// 11/09: Dani Filippozzi chega como 555181477111, cadastrada como
// 5551981477111). Mesmo número, dois formatos — devolve os dois pra
// busca casar em qualquer sentido. Fora do padrão BR, só o próprio número.
// Só ganha o 9 quem já era celular no formato antigo (começava com 6-9) —
// fixo (2-5) nunca, senão casaria com o celular de outra pessoa.
function brPhoneVariants(phoneNorm: string): [string, string] {
  const isBr = phoneNorm.startsWith('55')
  if (isBr && phoneNorm.length === 12 && /[6-9]/.test(phoneNorm[4])) {
    return [phoneNorm, `${phoneNorm.slice(0, 4)}9${phoneNorm.slice(4)}`]
  }
  if (isBr && phoneNorm.length === 13 && phoneNorm[4] === '9') {
    return [phoneNorm, `${phoneNorm.slice(0, 4)}${phoneNorm.slice(5)}`]
  }
  return [phoneNorm, phoneNorm]
}

// Achado 11/09: o modelo do Max não enxerga o telefone do contato — mandou
// phone=0 num 1:1 real. O GPT Maker injeta `contact_phone` como variável de
// SISTEMA (não passa pelo modelo), então ela manda na identidade:
// - 1:1: contact_phone é o número de quem fala → identidade confiável.
// - grupo: contact_phone é o ID do grupo "<número do criador>-<timestamp>" →
//   só prova que é grupo; NUNCA vira identidade (senão todo membro vira o
//   criador). A identidade volta a ser o telefone/nome que o modelo lê da
//   mensagem, com o fallback por nome liberado.
// O "grupo vs. individual" também sai da mão do modelo quando há sinal do
// sistema — ele não consegue mais abrir o fallback por nome num 1:1.
// Sem contact_phone (intenção antiga), comportamento anterior intacto.
// Formato real: número completo com DDI (10+ dígitos) + timestamp unix de
// 10 dígitos. Estrito de propósito — um número hifenizado de 1:1
// ("96398-9538") não pode virar "grupo" e abrir o fallback por nome.
const GROUP_JID = /^\d{10,15}-\d{10}$/
// Segundo sinal, também de sistema: chat_id de grupo é "<canal hex>-<número
// do criador>-<timestamp>" (1:1 é "<canal hex>-<número>"). Rede de segurança
// caso o GPT Maker mande em grupo só o número do criador em contact_phone —
// sem isso, todo membro autenticaria como o criador. Chat de API
// ("public-api-…") não tem o prefixo hex e fica de fora.
const GROUP_CHAT_ID = /^[0-9A-F]{32}-\d{10,15}-\d{10}$/i

type Identity = { phoneNorm: string; context: string; hasSystemContact: boolean }

function resolveIdentity(params: URLSearchParams): Identity {
  // Sufixo de JID do WhatsApp (@g.us, @lid, @s.whatsapp.net) não faz parte do número.
  const contactPhone = (params.get('contact_phone') ?? '').trim().replace(/@.*$/, '')
  const modelPhoneNorm = (params.get('phone') ?? '').replace(/\D/g, '')
  // Em produção (11/09) o ID do grupo chegou GRUDADO, sem hífen — 23
  // dígitos. E.164 vai até 15, então qualquer coisa maior é ID de grupo.
  const contactIsTooLongForPhone = contactPhone.replace(/\D/g, '').length > 15
  const isGroup =
    GROUP_JID.test(contactPhone) ||
    contactIsTooLongForPhone ||
    GROUP_CHAT_ID.test(params.get('chat_id') ?? '')
  if (isGroup) {
    return { phoneNorm: modelPhoneNorm, context: 'grupo', hasSystemContact: true }
  }
  const contactDigits = contactPhone.replace(/\D/g, '')
  if (contactDigits.length >= 10) {
    return { phoneNorm: contactDigits, context: 'individual', hasSystemContact: true }
  }
  return { phoneNorm: modelPhoneNorm, context: params.get('context') ?? '', hasSystemContact: false }
}

function respondForUser(user: UserRow, verifiedBy: 'phone' | 'name') {
  if (!user.active) {
    return NextResponse.json({ registered: true, active: false, name: user.name }, { status: 403 })
  }
  return NextResponse.json({
    registered: true,
    active: true,
    id: user.id,
    name: user.name,
    agency: user.agency_name,
    role: user.role,
    agent_interaction_id: user.agent_interaction_id,
    verified_by: verifiedBy,
  })
}

// GET /api/agent/verify-user?phone=5511999920122&name=Fulano&context=grupo
// Called by MAX TDG agent to check if a WhatsApp sender is a registered TDG user.
// Returns user info if found and active; 404 if not registered.
// Protected by AGENT_SECRET env var — MAX TDG must send ?secret=... or Authorization header.
//
// Achado da Carla, 25/08: o WhatsApp vem migrando remetentes pra um
// identificador opaco (LID, "linked ID") que esconde o número real — o
// participantPhone que o Max recebe chega cada vez mais como null, mesmo
// pra gente cadastrada. Telefone continua a checagem primária (mais
// forte); quando falha, cai num fallback por nome via isAuthorMatch — mas
// SÓ dentro do grupo oficial da TDG (context=grupo), nunca em conversa
// individual, porque só lá existe vetting social real (quem está no grupo
// foi adicionado como TD de verdade; no 1:1 qualquer um pode se passar por
// qualquer nome). Cada match por nome fica registrado em
// tdg_agent_name_fallback_log pra auditoria — não bloqueia, só deixa
// rastro pra revisão posterior.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret') ?? ''
  const agentSecret = process.env.AGENT_SECRET ?? ''

  if (agentSecret && authHeader !== `Bearer ${agentSecret}` && secret !== agentSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { phoneNorm, context, hasSystemContact } = resolveIdentity(url.searchParams)
  const name = (url.searchParams.get('name') ?? '').trim()

  const loggedParams = new URLSearchParams(url.searchParams)
  loggedParams.delete('secret')
  await logRequest(loggedParams.toString())

  if (phoneNorm.length < 10 && !name && !hasSystemContact) {
    return NextResponse.json({ error: 'phone or name param required' }, { status: 400 })
  }

  if (phoneNorm.length >= 10) {
    const [asSent, alternate] = brPhoneVariants(phoneNorm)
    const { rows } = await sql`
      SELECT id, name, agency_name, role, active, agent_interaction_id
      FROM tdg_users
      WHERE whatsapp = ${asSent} OR whatsapp = ${alternate}
      ORDER BY (whatsapp = ${asSent}) DESC
      LIMIT 1
    `
    if (rows[0]) {
      return respondForUser(rows[0] as UserRow, 'phone')
    }
  }

  if (context === 'grupo' && name) {
    const { rows: candidates } = await sql`
      SELECT id, name, agency_name, role, active, agent_interaction_id
      FROM tdg_users
      WHERE active = true
    `
    const matches = candidates.filter(u => isAuthorMatch(name, u.name as string))
    if (matches.length === 1) {
      const matched = matches[0] as UserRow
      await ensureFallbackLogTable()
      await sql`
        INSERT INTO tdg_agent_name_fallback_log (matched_user_id, matched_name, input_name)
        VALUES (${matched.id}, ${matched.name}, ${name})
      `
      return respondForUser(matched, 'name')
    }
  }

  return NextResponse.json({ registered: false }, { status: 404 })
}
