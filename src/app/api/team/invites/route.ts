import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { generateInviteToken, getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// ── Team invites ("Minha Equipe") ────────────────────────────────────────────
// Allowed for role IN ('admin', 'agency_admin').
//
// SECURITY: when the caller is 'agency_admin', agency_id and role are NEVER
// taken from the request body — they are hard-pinned to the caller's own
// agency_id (resolved server-side from the session) and role='agent'. An
// agency_admin cannot mint another agency_admin, and cannot target another
// agency's roster, no matter what the client sends.
//
// Global admin is the secondary case: the principal product flow is
// agency_admin inviting agents into their own team, but admin may also seed
// a team invite for any agency directly (must specify agency_id explicitly —
// admin has no agency_id of its own to default to).
//
// Unlike /api/admin/invites (one live agency_admin invite per agency,
// reused), every call here always mints a brand-new token: a team can invite
// several different people in parallel, each with a personal single-use
// link.

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, agencyId, userId } = await getCallerContext(session.user.email)
  if (role !== 'admin' && role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as { agency_id?: string; role?: string }

  let targetAgencyId: string
  let targetRole: 'agent' | 'agency_admin'

  if (role === 'agency_admin') {
    if (!agencyId) return NextResponse.json({ error: 'Usuário sem agência vinculada' }, { status: 422 })
    targetAgencyId = agencyId
    targetRole = 'agent'
  } else {
    if (!body.agency_id) return NextResponse.json({ error: 'agency_id obrigatório' }, { status: 400 })
    const { rows: agencyRows } = await sql`
      SELECT id FROM tdg_agencies WHERE id = ${body.agency_id} AND active = true
    `
    if (!agencyRows.length) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    targetAgencyId = body.agency_id
    targetRole = body.role === 'agency_admin' ? 'agency_admin' : 'agent'
  }

  const token = generateInviteToken()
  const { rows } = await sql`
    INSERT INTO tdg_invites (token, agency_id, role, created_by)
    VALUES (${token}, ${targetAgencyId}, ${targetRole}, ${userId})
    RETURNING token, expires_at
  `

  return NextResponse.json({ token: rows[0].token, expiresAt: rows[0].expires_at })
}
