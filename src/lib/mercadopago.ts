import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'
import { GROWTH_PLAN } from '@/lib/plans'
import { getOrCreateAgreementWindow } from '@/lib/subscriptions'

// No preapproval_plan template is created — the subscription is created
// directly with a fixed transaction_amount, which the Mercado Pago
// Subscriptions API supports without an associated plan. That planless
// endpoint has no billing_day/repetitions fields (those only exist on the
// Plan resource, which in turn requires a pre-tokenized card at creation
// time — incompatible with redirecting the buyer to MP's own checkout).
//
// start_date/end_date achieve the same result. Per Cláusula 7.1 do contrato
// (Jul/2026), the 24-month term belongs to the ONE contract instrument all
// 19 agencies sign — not to each agency individually — so end_date is a
// single value shared by every agency (whoever subscribes first "locks" it
// in tdg_agreement_window; everyone after just reads it). start_date stays
// per-agency: whoever joins after day 5 simply waits for the next day 5
// (no immediate/prorated charge for the partial month, per Carla, 2026-07-26)
// — a late joiner ends up with fewer than GROWTH_PLAN.repetitions charges
// since they share the same end_date as everyone else.

function getClient(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')
  return new MercadoPagoConfig({ accessToken })
}

function nextBillingDate(billingDay: number): Date {
  const now         = new Date()
  const monthOffset = now.getUTCDate() > billingDay ? 1 : 0
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, billingDay))
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))
}

export interface CreateSubscriptionParams {
  agencyId:  string
  payerEmail: string
  backUrl:   string
}

export interface CreateSubscriptionResult {
  preapprovalId: string
  initPoint:     string
}

// Creates the subscription already tagged with the agency it belongs to
// (external_reference) — this is what lets the webhook and the status
// endpoint attribute a payment to the right tenant without depending on the
// payer typing the "correct" email at Mercado Pago's own checkout.
export async function createAgencySubscription(params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
  const preApproval = new PreApproval(getClient())

  const startDate      = nextBillingDate(GROWTH_PLAN.billingDay)
  const { endDate }    = await getOrCreateAgreementWindow(() => ({
    startDate,
    endDate: addMonths(startDate, GROWTH_PLAN.repetitions),
  }))

  const result = await preApproval.create({
    body: {
      reason:              GROWTH_PLAN.reason,
      external_reference:  params.agencyId,
      payer_email:         params.payerEmail,
      back_url:            params.backUrl,
      auto_recurring: {
        frequency:          1,
        frequency_type:     'months',
        transaction_amount: GROWTH_PLAN.transactionAmount,
        currency_id:        GROWTH_PLAN.currencyId,
        start_date:         startDate.toISOString(),
        end_date:           endDate.toISOString(),
      },
    },
  })

  if (!result.id || !result.init_point) {
    throw new Error('Resposta inesperada do Mercado Pago ao criar assinatura')
  }

  return { preapprovalId: result.id, initPoint: result.init_point }
}

export interface RemoteSubscription {
  status:             string
  externalReference:  string | null
  nextPaymentDate:    string | null
}

// Always re-fetch the subscription from Mercado Pago rather than trusting
// the webhook payload's own fields — the notification only carries an id;
// the authoritative status/external_reference live on the resource itself.
export async function getSubscription(preapprovalId: string): Promise<RemoteSubscription> {
  const preApproval = new PreApproval(getClient())
  const result = await preApproval.get({ id: preapprovalId })
  return {
    status:            result.status ?? 'pending',
    externalReference: result.external_reference ?? null,
    nextPaymentDate:   result.next_payment_date ?? null,
  }
}

export interface RemotePayment {
  status:            string
  externalReference: string | null
  dateApproved:      string | null
}

export async function getPayment(paymentId: string): Promise<RemotePayment> {
  const payment = new Payment(getClient())
  const result = await payment.get({ id: paymentId })
  return {
    status:            result.status ?? 'pending',
    externalReference: result.external_reference ?? null,
    dateApproved:      result.date_approved ?? null,
  }
}
