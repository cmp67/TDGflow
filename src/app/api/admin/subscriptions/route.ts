import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// Global-admin only: billing status across every one of the 19 contracted
// agencies in one screen, instead of checking each agency's own Billing tab
// or the payment gateway's dashboard by hand.

type SubscriptionStatus = 'none' | 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected'

interface AgencySubscriptionRow {
  id:                     string
  name:                   string
  status:                 SubscriptionStatus
  providerSubscriptionId: string | null
  transactionAmount:      number | null
  nextPaymentDate:        string | null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await getCallerContext(session.user.email)
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows } = await sql`
    SELECT
      a.id,
      a.name,
      COALESCE(s.status, 'none')  AS status,
      s.provider_subscription_id,
      s.transaction_amount,
      s.next_payment_date
    FROM tdg_agencies a
    LEFT JOIN LATERAL (
      SELECT status, provider_subscription_id, transaction_amount, next_payment_date
      FROM tdg_agency_subscriptions
      WHERE agency_id = a.id
      ORDER BY created_at DESC
      LIMIT 1
    ) s ON true
    WHERE a.active = true
    ORDER BY a.name
  `

  const agencies: AgencySubscriptionRow[] = rows.map(r => ({
    id:                     r.id as string,
    name:                   r.name as string,
    status:                 r.status as SubscriptionStatus,
    providerSubscriptionId: (r.provider_subscription_id as string | null) ?? null,
    transactionAmount:      r.transaction_amount === null ? null : Number(r.transaction_amount),
    nextPaymentDate:        (r.next_payment_date as string | null) ?? null,
  }))

  return NextResponse.json({ agencies })
}
