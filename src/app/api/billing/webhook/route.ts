import { NextRequest, NextResponse } from 'next/server'
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago'
import { getSubscription, getPayment } from '@/lib/mercadopago'
import { updateSubscriptionStatus, updateNextPaymentDateForAgency, type SubscriptionStatus } from '@/lib/subscriptions'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set<SubscriptionStatus>(['pending', 'authorized', 'paused', 'cancelled', 'rejected'])

function addOneMonth(iso: string): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString()
}

// Public endpoint — Mercado Pago calls this with no session, so the ONLY
// authentication is the x-signature HMAC (see lib/mercadopago.ts research
// notes / SDK's WebhookSignatureValidator). Never trust the notification
// body's own fields for anything beyond "which id do I go re-fetch" — the
// authoritative status always comes from a fresh GET against Mercado Pago's
// API, done in getSubscription/getPayment.
export async function POST(req: NextRequest) {
  const dataId     = req.nextUrl.searchParams.get('data.id')
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '',
    })
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    throw e
  }

  let body: { type?: string; data?: { id?: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const type = body.type
  const id   = body.data?.id ?? dataId ?? undefined

  try {
    if (type === 'subscription_preapproval' && id) {
      const remote = await getSubscription(id)
      if (VALID_STATUSES.has(remote.status as SubscriptionStatus)) {
        await updateSubscriptionStatus(id, remote.status as SubscriptionStatus, remote.nextPaymentDate)
      }
    } else if (type === 'subscription_authorized_payment' && id) {
      const payment = await getPayment(id)
      // Rejected/pending payments are intentionally not acted on here —
      // day-20 suspension logic is separate, not-yet-built work.
      if (payment.status === 'approved' && payment.externalReference && payment.dateApproved) {
        await updateNextPaymentDateForAgency(payment.externalReference, addOneMonth(payment.dateApproved))
      }
    }
    // Any other topic (fraud alerts, disputes, etc.) is acknowledged and
    // ignored — we didn't subscribe to those events meaningfully.
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
