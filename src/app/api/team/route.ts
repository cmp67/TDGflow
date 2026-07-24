import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// GET /api/team — the caller's own agency roster (agency_admin's "Minha
// Equipe"). Scoped strictly to the caller's own agency_id, resolved
// server-side from the session — never trusts a client-supplied agency_id.
//
// Global admin has no agency_id of its own: cross-agency rosters already
// exist at /flow/gestao (all 19 agencies), so this endpoint intentionally
// does NOT support an admin-wide view — it fails with a clear 422 instead of
// silently returning nothing or leaking every agency through one endpoint.
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, agencyId } = await getCallerContext(session.user.email)
  if (role !== 'admin' && role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!agencyId) {
    return NextResponse.json({ error: 'Usuário sem agência vinculada' }, { status: 422 })
  }

  const { rows } = await sql`
    SELECT id, name, email, role, active, created_at
    FROM tdg_users
    WHERE agency_id = ${agencyId}
    ORDER BY created_at ASC
  `

  return NextResponse.json({ members: rows })
}
