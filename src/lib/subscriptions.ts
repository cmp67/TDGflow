import { sql } from '@vercel/postgres'

export interface AgreementWindow {
  startDate: Date
  endDate:   Date
}

// Shared billing window for the whole 24-month contract (see migration 006)
// — lazily created by whichever agency subscribes first, every agency after
// that reads the same end_date instead of getting its own 24 months. Insert
// races (two agencies subscribing at nearly the same instant) resolve via
// ON CONFLICT DO NOTHING + re-select, so both callers end up returning the
// one row that actually won, never two different windows.
export async function getOrCreateAgreementWindow(
  computeDefault: () => AgreementWindow,
  key = 'default',
): Promise<AgreementWindow> {
  const { rows } = await sql`
    SELECT start_date, end_date FROM tdg_agreement_window WHERE key = ${key}
  `
  if (rows[0]) {
    return { startDate: new Date(rows[0].start_date as string), endDate: new Date(rows[0].end_date as string) }
  }

  const { startDate, endDate } = computeDefault()
  await sql`
    INSERT INTO tdg_agreement_window (key, start_date, end_date)
    VALUES (${key}, ${startDate.toISOString()}, ${endDate.toISOString()})
    ON CONFLICT (key) DO NOTHING
  `

  const { rows: settled } = await sql`
    SELECT start_date, end_date FROM tdg_agreement_window WHERE key = ${key}
  `
  return { startDate: new Date(settled[0].start_date as string), endDate: new Date(settled[0].end_date as string) }
}

export type SubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected'

export interface AgencySubscription {
  id:                     string
  agencyId:               string
  providerSubscriptionId: string | null
  providerCustomerId:     string | null
  planTier:               string
  status:                 SubscriptionStatus
  transactionAmount:      number | null
  nextPaymentDate:        string | null
}

function mapRow(row: Record<string, unknown>): AgencySubscription {
  return {
    id:                     row.id as string,
    agencyId:               row.agency_id as string,
    providerSubscriptionId: (row.provider_subscription_id as string | null) ?? null,
    providerCustomerId:     (row.provider_customer_id as string | null) ?? null,
    planTier:               row.plan_tier as string,
    status:                 row.status as SubscriptionStatus,
    transactionAmount:      row.transaction_amount === null ? null : Number(row.transaction_amount),
    nextPaymentDate:        (row.next_payment_date as string | null) ?? null,
  }
}

// Most recent subscription attempt for an agency (there may be several across
// history — cancel + re-subscribe — so "latest" is always what matters for
// determining current access).
export async function getLatestSubscriptionForAgency(agencyId: string): Promise<AgencySubscription | null> {
  const { rows } = await sql`
    SELECT id, agency_id, provider_subscription_id, provider_customer_id, plan_tier, status, transaction_amount, next_payment_date
    FROM tdg_agency_subscriptions
    WHERE agency_id = ${agencyId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows[0] ? mapRow(rows[0]) : null
}

export async function createPendingSubscriptionRow(params: {
  agencyId:               string
  providerSubscriptionId: string
  providerCustomerId:     string | null
  planTier:               string
  payerEmail:             string
  transactionAmount:      number
}): Promise<void> {
  await sql`
    INSERT INTO tdg_agency_subscriptions
      (agency_id, provider_subscription_id, provider_customer_id, plan_tier, status, payer_email, transaction_amount)
    VALUES
      (${params.agencyId}, ${params.providerSubscriptionId}, ${params.providerCustomerId}, ${params.planTier}, 'pending', ${params.payerEmail}, ${params.transactionAmount})
  `
}

// Applies the authoritative status pulled fresh from the payment gateway
// (never trusted from the webhook payload itself) to the row matching that
// provider subscription id. Returns null (a safe no-op, not an error) when
// no matching row exists — e.g. a stale/duplicate webhook retry for a
// subscription this app never recorded.
export async function updateSubscriptionStatus(
  providerSubscriptionId: string,
  status: SubscriptionStatus,
  nextPaymentDate: string | null,
): Promise<AgencySubscription | null> {
  const { rows } = await sql`
    UPDATE tdg_agency_subscriptions
    SET status = ${status}, next_payment_date = ${nextPaymentDate}, updated_at = now()
    WHERE provider_subscription_id = ${providerSubscriptionId}
    RETURNING id, agency_id, provider_subscription_id, provider_customer_id, plan_tier, status, transaction_amount, next_payment_date
  `
  return rows[0] ? mapRow(rows[0]) : null
}

// For successful recurring payment events: bumps the next charge date on the
// agency's current subscription row. Matched by agency_id (not the provider
// subscription id) because the payment resource itself doesn't always expose
// which subscription it belongs to on every gateway — only the
// external_reference we set at subscription creation (the agency id).
export async function updateNextPaymentDateForAgency(agencyId: string, nextPaymentDate: string): Promise<void> {
  await sql`
    UPDATE tdg_agency_subscriptions
    SET next_payment_date = ${nextPaymentDate}, updated_at = now()
    WHERE id = (
      SELECT id FROM tdg_agency_subscriptions
      WHERE agency_id = ${agencyId}
      ORDER BY created_at DESC
      LIMIT 1
    )
  `
}

// Looked up by the payment gateway's own subscription id — used by the
// webhook handler. Ownership (does this subscription belong to the caller's
// agency?) is the caller's responsibility to check.
export async function getSubscriptionByProviderSubscriptionId(providerSubscriptionId: string): Promise<AgencySubscription | null> {
  const { rows } = await sql`
    SELECT id, agency_id, provider_subscription_id, provider_customer_id, plan_tier, status, transaction_amount, next_payment_date
    FROM tdg_agency_subscriptions
    WHERE provider_subscription_id = ${providerSubscriptionId}
    LIMIT 1
  `
  return rows[0] ? mapRow(rows[0]) : null
}

// Webhook de assinatura: o checkout do Asaas cria a linha `pending` com o
// checkoutId provisório (é o único id que existe antes do comprador
// terminar o checkout). O primeiro evento SUBSCRIPTION_CREATED chega com o
// id real da assinatura (sub_xxx) — essa função tenta casar pelo id real
// primeiro (updates seguintes) e, se não achar, casa pela agência (via
// externalReference) e substitui o id provisório pelo real. Idempotente:
// re-entregas do mesmo evento (modelo "at least once" do Asaas) só
// re-aplicam o mesmo estado.
export async function linkOrUpdateSubscriptionFromWebhook(params: {
  agencyId:                string
  providerSubscriptionId:  string
  providerCustomerId:      string | null
  status:                  SubscriptionStatus
  nextPaymentDate:         string | null
}): Promise<AgencySubscription | null> {
  const { rows: matched } = await sql`
    UPDATE tdg_agency_subscriptions
    SET status = ${params.status}, next_payment_date = ${params.nextPaymentDate},
        provider_customer_id = COALESCE(${params.providerCustomerId}, provider_customer_id),
        updated_at = now()
    WHERE provider_subscription_id = ${params.providerSubscriptionId}
    RETURNING id, agency_id, provider_subscription_id, provider_customer_id, plan_tier, status, transaction_amount, next_payment_date
  `
  if (matched[0]) return mapRow(matched[0])

  const { rows: linked } = await sql`
    UPDATE tdg_agency_subscriptions
    SET provider_subscription_id = ${params.providerSubscriptionId},
        provider_customer_id     = ${params.providerCustomerId},
        status = ${params.status}, next_payment_date = ${params.nextPaymentDate}, updated_at = now()
    WHERE id = (
      SELECT id FROM tdg_agency_subscriptions
      WHERE agency_id = ${params.agencyId}
      ORDER BY created_at DESC
      LIMIT 1
    )
    RETURNING id, agency_id, provider_subscription_id, provider_customer_id, plan_tier, status, transaction_amount, next_payment_date
  `
  return linked[0] ? mapRow(linked[0]) : null
}
