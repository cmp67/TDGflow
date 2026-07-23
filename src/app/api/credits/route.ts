import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import {
  topUpCredits, getBalance, TIERS, type TierId,
  getLumiSettings, setDistributionMode, distributeEqually,
  getAgencyBreakdown, contributeToPool, type DistributionMode,
} from '@/lib/credits'

export const dynamic = 'force-dynamic'

// ⚠️ Phase 1 leftover: this whole GET/POST pair still manages ONE hardcoded
// pseudo-agency ("tdg") for balance/top-up/purchase history — it does not
// correspond to any row in tdg_agencies (the 19 real contracted agencies).
// Since tdg_credits_balance.agency_id / tdg_credits_ledger.agency_id are now
// `uuid REFERENCES tdg_agencies(id)`, every query below that reads/writes
// using this literal string will fail at runtime ("invalid input syntax for
// type uuid: tdg") until this endpoint is redesigned to operate on a real
// agency_id (e.g. admin picks which of the 19 agencies to top up).
// Deliberately NOT changed as part of the agency_id migration — needs a
// product decision, not a mechanical fix. See migration report.
const AGENCY_ID = 'tdg'

// ── GET — balance + consumption stats + recent ledger ────────────────────────

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: userRows } = await sql`
    SELECT role FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
  `
  if (userRows[0]?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const balance = await getBalance(AGENCY_ID)

    // Consumption this month (from usage logs)
    const { rows: monthlyRows } = await sql`
      SELECT
        event_type,
        COUNT(*)::int AS requests
      FROM tdg_usage_logs
      WHERE created_at >= date_trunc('month', NOW())
      GROUP BY event_type
    `

    // Daily consumption last 30 days (for rate calculation)
    const { rows: dailyRows } = await sql`
      SELECT
        DATE(created_at) AS day,
        COUNT(*)::int    AS requests
      FROM tdg_usage_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `

    // Per-advisor this month
    const { rows: byUserRows } = await sql`
      SELECT
        u.name          AS advisor_name,
        l.user_email,
        SUM(ABS(l.amount))::int AS credits_used
      FROM tdg_credits_ledger l
      LEFT JOIN tdg_users u ON u.email = l.user_email
      WHERE l.agency_id = ${AGENCY_ID}
        AND l.amount     < 0
        AND l.created_at >= date_trunc('month', NOW())
      GROUP BY l.user_email, u.name
      ORDER BY credits_used DESC
      LIMIT 20
    `

    // Recent purchases
    const { rows: purchaseRows } = await sql`
      SELECT amount, meta, created_at
      FROM tdg_credits_ledger
      WHERE agency_id   = ${AGENCY_ID}
        AND action_type = 'purchase'
      ORDER BY created_at DESC
      LIMIT 5
    `

    // Monthly credits consumed
    const { rows: monthlyCredits } = await sql`
      SELECT COALESCE(SUM(ABS(amount)), 0)::int AS total
      FROM tdg_credits_ledger
      WHERE agency_id   = ${AGENCY_ID}
        AND amount       < 0
        AND created_at  >= date_trunc('month', NOW())
    `

    const lumiSettings     = await getLumiSettings()
    const agencyBreakdown  = await getAgencyBreakdown()

    return NextResponse.json({
      balance,
      tiers: TIERS,
      monthlyUsage:     monthlyRows,
      dailyUsage:       dailyRows,
      byUser:           byUserRows,
      purchases:        purchaseRows,
      creditsThisMonth: monthlyCredits[0]?.total ?? 0,
      lumiSettings,
      agencyBreakdown,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST — admin top-up ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: userRows } = await sql`
    SELECT role FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
  `
  if (userRows[0]?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json() as {
      action?:      string
      tier?:        TierId
      note?:        string
      mode?:        DistributionMode
      total?:       number
      agencyName?:  string
      amount?:      number
    }
    const { action = 'top_up' } = body
    const adminEmail = session.user?.email ?? 'admin'

    // ── Top up (default) ─────────────────────────────────────────────
    if (action === 'top_up') {
      const tierDef = TIERS.find(t => t.id === body.tier)
      if (!tierDef || tierDef.credits === null)
        return NextResponse.json({ error: 'Tier inválido' }, { status: 400 })
      await topUpCredits({ agencyId: AGENCY_ID, amount: tierDef.credits, tier: body.tier!, adminEmail, note: body.note })
      const updated = await getBalance(AGENCY_ID)
      return NextResponse.json({ ok: true, balance: updated })
    }

    // ── Set distribution mode ────────────────────────────────────────
    if (action === 'set_mode') {
      if (!body.mode) return NextResponse.json({ error: 'mode obrigatório' }, { status: 400 })
      await setDistributionMode(body.mode)
      return NextResponse.json({ ok: true })
    }

    // ── Distribute equally ───────────────────────────────────────────
    if (action === 'distribute') {
      if (!body.total || body.total <= 0)
        return NextResponse.json({ error: 'total inválido' }, { status: 400 })
      const result = await distributeEqually(body.total)
      return NextResponse.json({ ok: true, ...result })
    }

    // ── Pool contribution ────────────────────────────────────────────
    if (action === 'contribute') {
      if (!body.agencyName || !body.amount || body.amount <= 0)
        return NextResponse.json({ error: 'agencyName e amount obrigatórios' }, { status: 400 })
      await contributeToPool({ agencyName: body.agencyName, amount: body.amount, poolId: AGENCY_ID, adminEmail })
      const updated = await getBalance(AGENCY_ID)
      return NextResponse.json({ ok: true, balance: updated })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
