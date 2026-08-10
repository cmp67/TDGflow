import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// ── Global-admin only: quem logou, quando, e o quanto cada um está usando
//    o produto — achado da Carla, 08/08: não existia nenhum painel disso.
//    "Tempo de sessão" exato não dá pra medir com JWT stateless, então o
//    indicador aqui é "dias ativos" (dias distintos com alguma ação —
//    login, chat ou review) em vez de duração. ─────────────────────────

export interface ActivityRow {
  id: string
  name: string
  email: string
  agency_name: string
  role: string
  active: boolean
  last_login: string | null
  login_count_30d: number
  last_activity: string | null
  active_days_30d: number
  reviews_total: number
  chat_total: number
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { role } = await getCallerContext(session.user.email)
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows } = await sql<ActivityRow>`
    WITH activity AS (
      SELECT user_id AS uid, created_at FROM tdg_login_events
      UNION ALL
      SELECT u.id AS uid, l.created_at FROM tdg_usage_logs l JOIN tdg_users u ON u.email = l.user_email
      UNION ALL
      SELECT r.agent_id AS uid, r.created_at FROM tdg_hotel_reviews r WHERE r.agent_id IS NOT NULL
    ),
    agg AS (
      SELECT uid,
        MAX(created_at) AS last_activity,
        COUNT(DISTINCT DATE(created_at)) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS active_days_30d
      FROM activity
      GROUP BY uid
    ),
    logins AS (
      SELECT user_id AS uid,
        MAX(created_at) AS last_login,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS login_count_30d
      FROM tdg_login_events
      GROUP BY user_id
    ),
    reviews AS (
      SELECT agent_id AS uid, COUNT(*)::int AS reviews_total
      FROM tdg_hotel_reviews WHERE agent_id IS NOT NULL GROUP BY agent_id
    ),
    chats AS (
      SELECT u.id AS uid, COUNT(*)::int AS chat_total
      FROM tdg_usage_logs l JOIN tdg_users u ON u.email = l.user_email
      WHERE l.event_type = 'chat'
      GROUP BY u.id
    )
    SELECT
      u.id, u.name, u.email, u.agency_name, u.role, u.active,
      logins.last_login::text AS last_login,
      COALESCE(logins.login_count_30d, 0)::int AS login_count_30d,
      agg.last_activity::text AS last_activity,
      COALESCE(agg.active_days_30d, 0)::int AS active_days_30d,
      COALESCE(reviews.reviews_total, 0) AS reviews_total,
      COALESCE(chats.chat_total, 0) AS chat_total
    FROM tdg_users u
    LEFT JOIN logins  ON logins.uid = u.id
    LEFT JOIN agg     ON agg.uid = u.id
    LEFT JOIN reviews ON reviews.uid = u.id
    LEFT JOIN chats   ON chats.uid = u.id
    WHERE lower(u.agency_name) <> 'bemgsy'
      AND u.email NOT ILIKE '%@example.com'
      AND u.email NOT ILIKE '%@internal.test'
      AND u.agency_name NOT ILIKE '%TDD%'
    ORDER BY u.agency_name, u.name
  `

  return NextResponse.json({ users: rows })
}
