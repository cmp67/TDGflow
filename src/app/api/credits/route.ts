import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import {
  topUpCredits, getBalance, TIERS, type TierId,
  getLumiSettings, setDistributionMode, distributeEqually,
  getAgencyBreakdown, contributeToPool, type DistributionMode,
} from '@/lib/credits'

export const dynamic = 'force-dynamic'

// ── Product decision (Carla, 2026-07-23) ──────────────────────────────────────
// Top-up is self-service: when an agency's credit runs out, THAT agency (via
// its own logged-in access) buys top-up and the credits go exclusively to its
// own balance — the TDG admin does not decide top-up for other agencies.
//
// This endpoint now serves two different concerns behind one route:
//   1. Self-service (any authenticated user, scoped to their OWN agency):
//      GET balance/consumption/ledger/purchases, POST action=top_up.
//      Requires tdg_users.agency_id to be set — if the caller has no real
//      agency linked (e.g. the 4 internal/demo accounts predating the
//      tdg_agencies rollout), fail with a clear 422 instead of a raw SQL
//      "invalid input syntax for type uuid" error.
//   2. Admin-only, cross-agency actions: POST set_mode / distribute /
//      contribute (global distribution config / central pool), and the
//      per-agency usage breakdown + lumi settings on GET. These are NOT
//      self-service — they affect or reveal every agency, not just the
//      caller's own — so they stay gated on role === 'admin' and are
//      intentionally NOT behind the "must have an agency" check above,
//      since TDG admins currently have no agency_id of their own.

type CallerContext = { email: string; role: string | null; agencyId: string | null }

async function getCallerContext(email: string): Promise<CallerContext> {
  const { rows } = await sql`
    SELECT role, agency_id FROM tdg_users WHERE email = ${email} LIMIT 1
  `
  return {
    email,
    role:     (rows[0]?.role as string | undefined) ?? null,
    agencyId: (rows[0]?.agency_id as string | undefined) ?? null,
  }
}

const NO_AGENCY_ERROR = 'Usuário sem agência vinculada'

// ── GET — self-service balance/consumption for the caller's own agency,
//         plus admin-only network fields when the caller is an admin ────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, agencyId } = await getCallerContext(session.user.email)
  const isAdmin = role === 'admin'

  if (!agencyId && !isAdmin) {
    return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })
  }

  try {
    const response: Record<string, unknown> = { tiers: TIERS }

    if (agencyId) {
      const balance = await getBalance(agencyId)

      // Consumption this month/last 30 days — derived from the agency's own
      // ledger, not tdg_usage_logs (which has no agency_id column at all and
      // structurally cannot be scoped per agency; every billable action
      // already lands a row in tdg_credits_ledger with the right agency_id).
      const { rows: monthlyRows } = await sql`
        SELECT
          action_type AS event_type,
          COUNT(*)::int AS requests
        FROM tdg_credits_ledger
        WHERE agency_id  = ${agencyId}
          AND amount      < 0
          AND created_at >= date_trunc('month', NOW())
        GROUP BY action_type
      `

      const { rows: dailyRows } = await sql`
        SELECT
          DATE(created_at) AS day,
          COUNT(*)::int    AS requests
        FROM tdg_credits_ledger
        WHERE agency_id  = ${agencyId}
          AND amount      < 0
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day DESC
      `

      // Per-advisor this month, within the caller's own agency
      const { rows: byUserRows } = await sql`
        SELECT
          u.name          AS advisor_name,
          l.user_email,
          SUM(ABS(l.amount))::int AS credits_used
        FROM tdg_credits_ledger l
        LEFT JOIN tdg_users u ON u.email = l.user_email
        WHERE l.agency_id = ${agencyId}
          AND l.amount     < 0
          AND l.created_at >= date_trunc('month', NOW())
        GROUP BY l.user_email, u.name
        ORDER BY credits_used DESC
        LIMIT 20
      `

      // Recent purchases (top-ups) for the caller's own agency
      const { rows: purchaseRows } = await sql`
        SELECT amount, meta, created_at
        FROM tdg_credits_ledger
        WHERE agency_id   = ${agencyId}
          AND action_type = 'purchase'
        ORDER BY created_at DESC
        LIMIT 5
      `

      // Monthly credits consumed by the caller's own agency
      const { rows: monthlyCredits } = await sql`
        SELECT COALESCE(SUM(ABS(amount)), 0)::int AS total
        FROM tdg_credits_ledger
        WHERE agency_id   = ${agencyId}
          AND amount       < 0
          AND created_at  >= date_trunc('month', NOW())
      `

      Object.assign(response, {
        balance,
        monthlyUsage:     monthlyRows,
        dailyUsage:       dailyRows,
        byUser:           byUserRows,
        purchases:        purchaseRows,
        creditsThisMonth: monthlyCredits[0]?.total ?? 0,
      })
    }

    // Cross-agency / network-wide view — admin only, independent of whether
    // the admin has an agency_id of their own.
    if (isAdmin) {
      response.lumiSettings    = await getLumiSettings()
      response.agencyBreakdown = await getAgencyBreakdown()
    }

    return NextResponse.json(response)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST — self-service top-up (own agency) + admin-only network actions ─────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, agencyId, email: callerEmail } = await getCallerContext(session.user.email)
  const isAdmin = role === 'admin'

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

    // ── Top up (self-service, own agency only) ───────────────────────
    if (action === 'top_up') {
      if (!agencyId) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

      const tierDef = TIERS.find(t => t.id === body.tier)
      if (!tierDef || tierDef.credits === null)
        return NextResponse.json({ error: 'Tier inválido' }, { status: 400 })
      await topUpCredits({ agencyId, amount: tierDef.credits, tier: body.tier!, adminEmail: callerEmail, note: body.note })
      const updated = await getBalance(agencyId)
      return NextResponse.json({ ok: true, balance: updated })
    }

    // ── Everything below affects/reveals multiple agencies — admin only ──
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    // NOTE: contributeToPool still writes to a "central pool" identified by
    // a literal pool id, the same pre-existing gap flagged in the
    // agency_id migration report — it does not correspond to any row in
    // tdg_agencies and will fail with an "invalid input syntax for type
    // uuid" error, same as top_up did before this fix. Left unchanged: out
    // of scope for this self-service re-scoping, needs its own product
    // decision on what the "central pool" actually is post-migration.
    if (action === 'contribute') {
      if (!body.agencyName || !body.amount || body.amount <= 0)
        return NextResponse.json({ error: 'agencyName e amount obrigatórios' }, { status: 400 })
      const CENTRAL_POOL_ID = 'tdg'
      await contributeToPool({ agencyName: body.agencyName, amount: body.amount, poolId: CENTRAL_POOL_ID, adminEmail: callerEmail })
      const updated = await getBalance(CENTRAL_POOL_ID)
      return NextResponse.json({ ok: true, balance: updated })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
