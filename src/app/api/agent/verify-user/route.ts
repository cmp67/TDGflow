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

  const phone = url.searchParams.get('phone') ?? ''
  const phoneNorm = phone.replace(/\D/g, '')
  const name = (url.searchParams.get('name') ?? '').trim()
  const context = url.searchParams.get('context') ?? ''

  if (phoneNorm.length < 10 && !name) {
    return NextResponse.json({ error: 'phone or name param required' }, { status: 400 })
  }

  if (phoneNorm.length >= 10) {
    const { rows } = await sql`
      SELECT id, name, agency_name, role, active, agent_interaction_id
      FROM tdg_users
      WHERE whatsapp = ${phoneNorm}
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
