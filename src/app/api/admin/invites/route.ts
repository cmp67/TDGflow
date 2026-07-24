import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { generateInviteToken, getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// ── Global-admin only: one 'agency_admin' invite per agency (the 19 real
//    contracted agencies onboarding themselves). ────────────────────────────
// GET  — status of every agency (none / pending / registered) for the admin
//        onboarding screen.
// POST — generate (or reuse) the agency's invite link.

type AgencyStatus = 'none' | 'pending' | 'registered'

interface AgencyInviteRow {
  id:         string
  name:       string
  status:     AgencyStatus
  token:      string | null
  expiresAt:  string | null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await getCallerContext(session.user.email)
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows } = await sql`
    SELECT
      a.id,
      a.name,
      EXISTS (SELECT 1 FROM tdg_users u WHERE u.agency_id = a.id) AS registered,
      i.token,
      i.expires_at
    FROM tdg_agencies a
    LEFT JOIN LATERAL (
      SELECT token, expires_at
      FROM tdg_invites
      WHERE agency_id   = a.id
        AND role        = 'agency_admin'
        AND used_at     IS NULL
        AND expires_at  > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    ) i ON true
    WHERE a.active = true
    ORDER BY a.name
  `

  const agencies: AgencyInviteRow[] = rows.map(r => ({
    id:        r.id as string,
    name:      r.name as string,
    status:    r.registered ? 'registered' : r.token ? 'pending' : 'none',
    token:     (r.token as string | null) ?? null,
    expiresAt: (r.expires_at as string | null) ?? null,
  }))

  return NextResponse.json({ agencies })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, userId } = await getCallerContext(session.user.email)
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { agency_id?: string; force?: boolean }
  const agencyId = body.agency_id
  if (!agencyId) return NextResponse.json({ error: 'agency_id obrigatório' }, { status: 400 })

  const { rows: agencyRows } = await sql`
    SELECT id FROM tdg_agencies WHERE id = ${agencyId} AND active = true
  `
  if (!agencyRows.length) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

  // Product decision (documented in the migration + PR report): a leaked or
  // wrong-recipient link should be invalidatable — force=true expires any
  // pending invite for this agency before minting a fresh one instead of
  // leaving two live links outstanding.
  if (body.force) {
    await sql`
      UPDATE tdg_invites
      SET expires_at = NOW()
      WHERE agency_id = ${agencyId} AND role = 'agency_admin' AND used_at IS NULL
    `
  } else {
    const { rows: existing } = await sql`
      SELECT token, expires_at FROM tdg_invites
      WHERE agency_id  = ${agencyId}
        AND role       = 'agency_admin'
        AND used_at    IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (existing.length) {
      return NextResponse.json({
        token:     existing[0].token,
        expiresAt: existing[0].expires_at,
        reused:    true,
      })
    }
  }

  const token = generateInviteToken()
  const { rows } = await sql`
    INSERT INTO tdg_invites (token, agency_id, role, created_by)
    VALUES (${token}, ${agencyId}, 'agency_admin', ${userId})
    RETURNING token, expires_at
  `

  return NextResponse.json({
    token:     rows[0].token,
    expiresAt: rows[0].expires_at,
    reused:    false,
  })
}
