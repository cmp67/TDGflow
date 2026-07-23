import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = session.user?.email ?? ''

  try {
    // Credits consumed this month by action
    const { rows: byAction } = await sql`
      SELECT
        action_type,
        SUM(ABS(amount))::int AS credits_used
      FROM tdg_credits_ledger
      WHERE user_email  = ${email}
        AND amount       < 0
        AND created_at  >= date_trunc('month', NOW())
      GROUP BY action_type
      ORDER BY credits_used DESC
    `

    // Daily consumption last 30 days
    const { rows: daily } = await sql`
      SELECT
        DATE(created_at)          AS day,
        SUM(ABS(amount))::int     AS credits
      FROM tdg_credits_ledger
      WHERE user_email  = ${email}
        AND amount       < 0
        AND created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `

    // Previous month for comparison
    const { rows: prevMonth } = await sql`
      SELECT COALESCE(SUM(ABS(amount)), 0)::int AS total
      FROM tdg_credits_ledger
      WHERE user_email  = ${email}
        AND amount       < 0
        AND created_at  >= date_trunc('month', NOW() - INTERVAL '1 month')
        AND created_at   < date_trunc('month', NOW())
    `

    const totalThisMonth = byAction.reduce((s, r) => s + r.credits_used, 0)

    return NextResponse.json({
      totalThisMonth,
      prevMonthTotal: prevMonth[0]?.total ?? 0,
      byAction,
      daily,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
