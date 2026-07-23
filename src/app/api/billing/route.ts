import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_usage_logs (
      id          SERIAL PRIMARY KEY,
      event_type  TEXT NOT NULL,
      user_email  TEXT NOT NULL,
      tokens_in   INTEGER,
      tokens_out  INTEGER,
      requests    INTEGER DEFAULT 1,
      meta        JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: userRows } = await sql`SELECT role FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1`
  if (userRows[0]?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await ensureTable()

    const { rows: monthly } = await sql`
      SELECT
        event_type,
        COUNT(*)::int                        AS total_requests,
        COALESCE(SUM(tokens_in),0)::int      AS total_tokens_in,
        COALESCE(SUM(tokens_out),0)::int     AS total_tokens_out,
        COALESCE(SUM(requests),0)::int       AS total_calls
      FROM tdg_usage_logs
      WHERE created_at >= date_trunc('month', NOW())
      GROUP BY event_type
      ORDER BY total_requests DESC
    `

    const { rows: daily } = await sql`
      SELECT
        DATE(created_at)        AS day,
        event_type,
        COUNT(*)::int           AS requests,
        COALESCE(SUM(tokens_in + COALESCE(tokens_out,0)),0)::int AS tokens
      FROM tdg_usage_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), event_type
      ORDER BY day DESC
    `

    const { rows: byUser } = await sql`
      SELECT
        user_email,
        COUNT(*)::int AS total_events,
        COALESCE(SUM(tokens_in + COALESCE(tokens_out,0)),0)::int AS total_tokens
      FROM tdg_usage_logs
      WHERE created_at >= date_trunc('month', NOW())
      GROUP BY user_email
      ORDER BY total_events DESC
      LIMIT 20
    `

    return NextResponse.json({ monthly, daily, byUser })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
