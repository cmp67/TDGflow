import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_suggestions (
      id           SERIAL PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      agency_name  TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'improvement',
      impact       INTEGER NOT NULL DEFAULT 3,
      status       TEXT NOT NULL DEFAULT 'pending',
      votes        INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_suggestion_votes (
      suggestion_id INTEGER NOT NULL,
      user_email    TEXT NOT NULL,
      PRIMARY KEY (suggestion_id, user_email)
    )
  `
  // Migrate existing table — add columns if missing
  await sql`ALTER TABLE tdg_suggestions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'improvement'`
  await sql`ALTER TABLE tdg_suggestions ADD COLUMN IF NOT EXISTS impact INTEGER NOT NULL DEFAULT 3`
  await sql`ALTER TABLE tdg_suggestions ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id)`
}

// GET /api/suggestions — list all sorted by weighted score (votes × impact) desc
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTables()
    const email = session.user?.email ?? ''
    const { rows } = await sql`
      SELECT
        s.id,
        s.title,
        s.description,
        s.type,
        s.impact,
        s.status,
        s.votes,
        s.created_at,
        CASE WHEN v.user_email IS NOT NULL THEN TRUE ELSE FALSE END AS voted
      FROM tdg_suggestions s
      LEFT JOIN tdg_suggestion_votes v
        ON v.suggestion_id = s.id AND v.user_email = ${email}
      ORDER BY
        CASE s.status WHEN 'done' THEN 2 WHEN 'in_progress' THEN 1 ELSE 0 END ASC,
        (s.votes * s.impact) DESC,
        s.created_at DESC
    `
    return NextResponse.json({ suggestions: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/suggestions — create new suggestion
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTables()
    const { title, description, type, impact } = await req.json()
    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
    }

    const email = session.user?.email ?? ''
    const name  = session.user?.name ?? email
    const safeType   = ['improvement', 'new_feature'].includes(type) ? type : 'improvement'
    const safeImpact = Math.min(5, Math.max(1, Number(impact) || 3))

    let agencyName = ''
    let agencyId: string | null = null
    try {
      const { rows } = await sql`SELECT agency_name, agency_id FROM tdg_users WHERE email = ${email} LIMIT 1`
      agencyName = rows[0]?.agency_name ?? ''
      agencyId = rows[0]?.agency_id ?? null
    } catch { /* non-blocking */ }

    const { rows } = await sql`
      INSERT INTO tdg_suggestions (title, description, submitted_by, agency_name, agency_id, type, impact)
      VALUES (${title.trim()}, ${description.trim()}, ${name}, ${agencyName}, ${agencyId}, ${safeType}, ${safeImpact})
      RETURNING id, title, description, type, impact, status, votes, created_at
    `
    return NextResponse.json({ suggestion: { ...rows[0], voted: false } }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH /api/suggestions — vote toggle OR admin status change
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTables()
    const { id, action, status } = await req.json()
    const email = session.user?.email ?? ''

    if (action === 'vote') {
      const { rows: existing } = await sql`
        SELECT 1 FROM tdg_suggestion_votes WHERE suggestion_id = ${id} AND user_email = ${email}
      `
      if (existing.length > 0) {
        await sql`DELETE FROM tdg_suggestion_votes WHERE suggestion_id = ${id} AND user_email = ${email}`
        await sql`UPDATE tdg_suggestions SET votes = votes - 1 WHERE id = ${id}`
      } else {
        await sql`INSERT INTO tdg_suggestion_votes (suggestion_id, user_email) VALUES (${id}, ${email})`
        await sql`UPDATE tdg_suggestions SET votes = votes + 1 WHERE id = ${id}`
      }
      const { rows } = await sql`SELECT id, title, description, type, impact, status, votes, created_at FROM tdg_suggestions WHERE id = ${id}`
      return NextResponse.json({ suggestion: rows[0], voted: existing.length === 0 })
    }

    if (action === 'status') {
      const { rows: userRows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
      if (userRows[0]?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { rows } = await sql`
        UPDATE tdg_suggestions SET status = ${status} WHERE id = ${id}
        RETURNING id, title, description, type, impact, status, votes, created_at
      `
      return NextResponse.json({ suggestion: rows[0] })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
