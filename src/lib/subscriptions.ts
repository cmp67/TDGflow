import { sql } from '@vercel/postgres'

export type SubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected'

export interface AgencySubscription {
  id:                 string
  agencyId:           string
  mpPreapprovalId:    string | null
  planTier:           string
  status:             SubscriptionStatus
  transactionAmount:  number | null
  nextPaymentDate:    string | null
}

function mapRow(row: Record<string, unknown>): AgencySubscription {
  return {
    id:                row.id as string,
    agencyId:          row.agency_id as string,
    mpPreapprovalId:   (row.mp_preapproval_id as string | null) ?? null,
    planTier:          row.plan_tier as string,
    status:            row.status as SubscriptionStatus,
    transactionAmount: row.transaction_amount === null ? null : Number(row.transaction_amount),
    nextPaymentDate:   (row.next_payment_date as string | null) ?? null,
  }
}

// Most recent subscription attempt for an agency (there may be several across
// history — cancel + re-subscribe — so "latest" is always what matters for
// determining current access).
export async function getLatestSubscriptionForAgency(agencyId: string): Promise<AgencySubscription | null> {
  const { rows } = await sql`
    SELECT id, agency_id, mp_preapproval_id, plan_tier, status, transaction_amount, next_payment_date
    FROM tdg_agency_subscriptions
    WHERE agency_id = ${agencyId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows[0] ? mapRow(rows[0]) : null
}

// Looked up by Mercado Pago's own id — used right after the buyer is
// redirected back from checkout (back_url carries ?preapproval_id=...) and
// by the webhook handler. Ownership (does this preapproval belong to the
// caller's agency?) is the caller's responsibility to check.
export async function getSubscriptionByPreapprovalId(preapprovalId: string): Promise<AgencySubscription | null> {
  const { rows } = await sql`
    SELECT id, agency_id, mp_preapproval_id, plan_tier, status, transaction_amount, next_payment_date
    FROM tdg_agency_subscriptions
    WHERE mp_preapproval_id = ${preapprovalId}
    LIMIT 1
  `
  return rows[0] ? mapRow(rows[0]) : null
}
