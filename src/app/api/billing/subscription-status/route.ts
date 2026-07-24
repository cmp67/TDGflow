import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { getLatestSubscriptionForAgency, getSubscriptionByPreapprovalId } from '@/lib/subscriptions'

export const dynamic = 'force-dynamic'

const NO_AGENCY_ERROR = 'Usuário sem agência vinculada'

async function getCallerAgencyId(email: string): Promise<string | null> {
  const { rows } = await sql`SELECT agency_id FROM tdg_users WHERE email = ${email} LIMIT 1`
  return (rows[0]?.agency_id as string | undefined) ?? null
}

// GET /api/billing/subscription-status[?preapproval_id=...]
//
// Used by the post-checkout confirmation page (polling right after the
// Mercado Pago redirect) and can later back a "billing status" widget.
// Ownership check: a preapproval_id belonging to a DIFFERENT agency returns
// 404, not 403 — same convention as the GUEST IDOR fix earlier this session
// (don't confirm existence of another tenant's record to a caller who
// merely guessed/observed an id).
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getCallerAgencyId(session.user.email)
  if (!agencyId) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

  try {
    const preapprovalId = req.nextUrl.searchParams.get('preapproval_id')

    const subscription = preapprovalId
      ? await getSubscriptionByPreapprovalId(preapprovalId)
      : await getLatestSubscriptionForAgency(agencyId)

    if (preapprovalId && (!subscription || subscription.agencyId !== agencyId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!subscription) return NextResponse.json({ status: 'none' })

    return NextResponse.json({
      status:            subscription.status,
      planTier:          subscription.planTier,
      transactionAmount: subscription.transactionAmount,
      nextPaymentDate:   subscription.nextPaymentDate,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
