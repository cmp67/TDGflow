import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { createAgencySubscription } from '@/lib/mercadopago'
import { getLatestSubscriptionForAgency, createPendingSubscriptionRow } from '@/lib/subscriptions'
import { GROWTH_PLAN } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const NO_AGENCY_ERROR = 'Usuário sem agência vinculada'
const ACTIVE_STATUSES = new Set(['authorized', 'paused'])

async function getCallerAgencyId(email: string): Promise<string | null> {
  const { rows } = await sql`SELECT agency_id FROM tdg_users WHERE email = ${email} LIMIT 1`
  return (rows[0]?.agency_id as string | undefined) ?? null
}

// POST /api/billing/subscribe — self-service, own agency only.
//
// Creates the Mercado Pago subscription (preapproval) already tagged with
// external_reference = agencyId, so the webhook can attribute the payment
// unambiguously (see mercadopago.ts). Only the Growth plan exists for now
// (Carla, 2026-07-23). Returns the init_point the caller's browser should
// redirect to for the buyer to authorize the charge.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getCallerAgencyId(session.user.email)
  if (!agencyId) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

  const existing = await getLatestSubscriptionForAgency(agencyId)
  if (existing && ACTIVE_STATUSES.has(existing.status)) {
    return NextResponse.json({ error: 'Sua agência já tem uma assinatura ativa' }, { status: 409 })
  }

  try {
    const backUrl = `${req.nextUrl.origin}/flow/billing/confirmacao`
    const { preapprovalId, initPoint } = await createAgencySubscription({
      agencyId,
      payerEmail: session.user.email,
      backUrl,
    })

    await createPendingSubscriptionRow({
      agencyId,
      mpPreapprovalId:   preapprovalId,
      planTier:          'growth',
      payerEmail:        session.user.email,
      transactionAmount: GROWTH_PLAN.transactionAmount,
    })

    return NextResponse.json({ initPoint })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
