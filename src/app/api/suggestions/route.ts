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
  // screenshot_url: só preenchido quando type = 'bug_report' e o usuário
  // anexou print do erro (upload em /api/suggestions/screenshot).
  await sql`ALTER TABLE tdg_suggestions ADD COLUMN IF NOT EXISTS screenshot_url TEXT`
  // viewed_at: "lido" é diferente de "resolvido" (achado da Carla, 21/08) —
  // o badge da Linha Direta contava só por status='pending', então reabrir
  // e ler o report nunca fazia o número sumir, só mudar o status fazia.
  // Agora o badge conta por viewed_at IS NULL (ver /api/context); status
  // continua controlando o board/roadmap normalmente.
  await sql`ALTER TABLE tdg_suggestions ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ`
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
        s.screenshot_url,
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
    const { title, description, type, impact, screenshot_url } = await req.json()
    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
    }

    const email = session.user?.email ?? ''
    const name  = session.user?.name ?? email
    const safeType     = ['improvement', 'new_feature', 'bug_report'].includes(type) ? type : 'improvement'
    const safeImpact    = Math.min(5, Math.max(1, Number(impact) || 3))
    const safeScreenshot = safeType === 'bug_report' && typeof screenshot_url === 'string' ? screenshot_url : null

    let agencyName = ''
    try {
      const { rows } = await sql`SELECT agency FROM tdg_users WHERE email = ${email} LIMIT 1`
      agencyName = rows[0]?.agency ?? ''
    } catch { /* non-blocking */ }

    const { rows } = await sql`
      INSERT INTO tdg_suggestions (title, description, submitted_by, agency_name, type, impact, screenshot_url)
      VALUES (${title.trim()}, ${description.trim()}, ${name}, ${agencyName}, ${safeType}, ${safeImpact}, ${safeScreenshot})
      RETURNING id, title, description, type, impact, status, votes, created_at, screenshot_url
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
      const { rows } = await sql`SELECT id, title, description, type, impact, status, votes, created_at, screenshot_url FROM tdg_suggestions WHERE id = ${id}`
      return NextResponse.json({ suggestion: rows[0], voted: existing.length === 0 })
    }

    if (action === 'status') {
      const { rows: userRows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
      if (userRows[0]?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { rows } = await sql`
        UPDATE tdg_suggestions SET status = ${status} WHERE id = ${id}
        RETURNING id, title, description, type, impact, status, votes, created_at, screenshot_url
      `
      return NextResponse.json({ suggestion: rows[0] })
    }

    // Marca os bug_reports pendentes como lidos — abrir a Linha Direta como
    // admin dispara isso (ver PartnershipHubView), some do badge da sidebar
    // sem precisar resolver o report ainda.
    if (action === 'mark_bug_reports_viewed') {
      const { rows: userRows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
      if (userRows[0]?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      await sql`
        UPDATE tdg_suggestions SET viewed_at = NOW()
        WHERE type = 'bug_report' AND status = 'pending' AND viewed_at IS NULL
      `
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
