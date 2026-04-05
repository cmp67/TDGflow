import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentName = session.user?.name ?? ''
  const agencyName = session.user?.agency ?? ''

  const [
    networkTotals,
    byVisitType,
    byMonth,
    topHotels,
    topAgencies,
    myTotals,
    myByType,
    myByMonth,
    recentActivity,
    topCountries,
  ] = await Promise.all([

    // ── Network totals ───────────────────────────────────────────
    sql`
      SELECT
        COUNT(*)::int                                        AS total_reviews,
        COUNT(DISTINCT hotel_name)::int                      AS unique_hotels,
        COUNT(DISTINCT agency_name)::int                     AS active_agencies,
        ROUND(AVG(overall_rating)::numeric, 1)              AS avg_rating,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int  AS this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('quarter', NOW()))::int AS this_quarter,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('year', NOW()))::int    AS this_year
      FROM tdg_hotel_reviews
    `,

    // ── By visit type (all time) ──────────────────────────────────
    sql`
      SELECT
        visit_type,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int   AS this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('quarter', NOW()))::int  AS this_quarter,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('year', NOW()))::int     AS this_year
      FROM tdg_hotel_reviews
      WHERE visit_type IS NOT NULL
      GROUP BY visit_type
      ORDER BY count DESC
    `,

    // ── Monthly trend (last 12 months) ───────────────────────────
    sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int                                        AS reviews,
        COUNT(DISTINCT hotel_name)::int                      AS hotels,
        COUNT(DISTINCT agency_name)::int                     AS agencies
      FROM tdg_hotel_reviews
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `,

    // ── Top 10 hotels ─────────────────────────────────────────────
    sql`
      SELECT
        hotel_name,
        COUNT(*)::int                          AS visit_count,
        ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT agency_name)::int       AS agency_count,
        MAX(created_at)                        AS last_visit
      FROM tdg_hotel_reviews
      GROUP BY hotel_name
      ORDER BY visit_count DESC
      LIMIT 10
    `,

    // ── Top agencies ──────────────────────────────────────────────
    sql`
      SELECT
        agency_name,
        COUNT(*)::int                          AS review_count,
        COUNT(DISTINCT hotel_name)::int        AS unique_hotels,
        ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating
      FROM tdg_hotel_reviews
      GROUP BY agency_name
      ORDER BY review_count DESC
      LIMIT 10
    `,

    // ── My totals ─────────────────────────────────────────────────
    sql`
      SELECT
        COUNT(*)::int                                        AS total_reviews,
        COUNT(DISTINCT hotel_name)::int                      AS unique_hotels,
        ROUND(AVG(overall_rating)::numeric, 1)              AS avg_rating,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int  AS this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('quarter', NOW()))::int AS this_quarter,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('year', NOW()))::int    AS this_year
      FROM tdg_hotel_reviews
      WHERE agent_name = ${agentName}
    `,

    // ── My visit types ────────────────────────────────────────────
    sql`
      SELECT visit_type, COUNT(*)::int AS count
      FROM tdg_hotel_reviews
      WHERE agent_name = ${agentName} AND visit_type IS NOT NULL
      GROUP BY visit_type
      ORDER BY count DESC
    `,

    // ── My monthly trend (last 6 months) ─────────────────────────
    sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int AS reviews
      FROM tdg_hotel_reviews
      WHERE agent_name = ${agentName}
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `,

    // ── Recent activity feed (last 12 entries) ────────────────────
    sql`
      SELECT
        hotel_name, country, agent_name, agency_name,
        visit_type, overall_rating, created_at
      FROM tdg_hotel_reviews
      ORDER BY created_at DESC
      LIMIT 12
    `,

    // ── Top countries ─────────────────────────────────────────────
    sql`
      SELECT
        country,
        COUNT(*)::int                          AS visit_count,
        ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating
      FROM tdg_hotel_reviews
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY visit_count DESC
      LIMIT 8
    `,
  ])

  return NextResponse.json({
    network: {
      ...networkTotals.rows[0],
      by_visit_type: byVisitType.rows,
      monthly_trend: byMonth.rows,
      top_hotels: topHotels.rows,
      top_agencies: topAgencies.rows,
      recent_activity: recentActivity.rows,
      top_countries: topCountries.rows,
    },
    me: {
      agent_name: agentName,
      agency_name: agencyName,
      ...myTotals.rows[0],
      by_visit_type: myByType.rows,
      monthly_trend: myByMonth.rows,
    },
  })
}
