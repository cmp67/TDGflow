import { NextRequest, NextResponse } from 'next/server'
import { getSubscription, getPayment, type AsaasSubscriptionStatus } from '@/lib/asaas'
import {
  linkOrUpdateSubscriptionFromWebhook,
  updateSubscriptionStatus,
  updateNextPaymentDateForAgency,
  getSubscriptionByProviderSubscriptionId,
  type SubscriptionStatus,
} from '@/lib/subscriptions'

export const dynamic = 'force-dynamic'

function addOneMonth(iso: string): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString()
}

function mapAsaasStatus(status: AsaasSubscriptionStatus): SubscriptionStatus {
  if (status === 'ACTIVE') return 'authorized'
  if (status === 'INACTIVE') return 'paused'
  return 'cancelled' // EXPIRED
}

const SUCCESS_PAYMENT_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])

// Public endpoint — Asaas calls this with no session, so the ONLY
// authentication is the shared token in the `asaas-access-token` header
// (configurado no painel do Asaas ao criar o webhook, mesmo valor salvo em
// ASAAS_WEBHOOK_TOKEN). Never trust the notification body's own fields for
// anything beyond "which id do I go re-fetch" — a exceção são os eventos
// SUBSCRIPTION_DELETED/INACTIVATED, onde re-buscar o recurso pode 404 (ele
// já foi removido) e o próprio tipo do evento já é autoritativo o
// suficiente pra decidir o novo status.
export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token')
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: {
    event?: string
    subscription?: { id?: string; externalReference?: string }
    payment?: { id?: string; subscription?: string }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const event = body.event

  try {
    if (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_UPDATED') {
      const id = body.subscription?.id
      if (id) {
        const remote = await getSubscription(id)
        if (remote.externalReference) {
          await linkOrUpdateSubscriptionFromWebhook({
            agencyId:               remote.externalReference,
            providerSubscriptionId: remote.id,
            providerCustomerId:     remote.customerId,
            status:                 mapAsaasStatus(remote.status),
            nextPaymentDate:        remote.nextDueDate,
          })
        }
      }
    } else if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_INACTIVATED') {
      const id = body.subscription?.id
      if (id) {
        const status: SubscriptionStatus = event === 'SUBSCRIPTION_DELETED' ? 'cancelled' : 'paused'
        await updateSubscriptionStatus(id, status, null)
      }
    } else if (event && SUCCESS_PAYMENT_EVENTS.has(event)) {
      const id = body.payment?.id
      if (id) {
        const payment = await getPayment(id)
        if (payment.subscriptionId && payment.confirmedDate) {
          const sub = await getSubscriptionByProviderSubscriptionId(payment.subscriptionId)
          // Sem linha correspondente ainda (corrida rara entre o evento de
          // pagamento e o de criação da assinatura) — não-fatal, o próximo
          // SUBSCRIPTION_UPDATED reconcilia o resto.
          if (sub) {
            await updateNextPaymentDateForAgency(sub.agencyId, addOneMonth(payment.confirmedDate))
          }
        }
      }
    }
    // Qualquer outro tópico (fraude, disputas, split, etc.) é reconhecido e
    // ignorado — não assinamos esses eventos de forma significativa ainda.
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
