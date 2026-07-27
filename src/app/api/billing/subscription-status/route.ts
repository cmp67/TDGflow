import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { getLatestSubscriptionForAgency } from '@/lib/subscriptions'

export const dynamic = 'force-dynamic'

const NO_AGENCY_ERROR = 'Usuário sem agência vinculada'

async function getCallerAgencyId(email: string): Promise<string | null> {
  const { rows } = await sql`SELECT agency_id FROM tdg_users WHERE email = ${email} LIMIT 1`
  return (rows[0]?.agency_id as string | undefined) ?? null
}

// GET /api/billing/subscription-status
//
// Usado pela tela de confirmação (polling logo após o checkout do Asaas) e
// como base pra um widget de status de billing. Sempre resolve pela sessão
// do chamador — nunca por um id vindo da URL — então não há id de provedor
// pra adivinhar/vazar entre agências.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getCallerAgencyId(session.user.email)
  if (!agencyId) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

  try {
    const subscription = await getLatestSubscriptionForAgency(agencyId)
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
