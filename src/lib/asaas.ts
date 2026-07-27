import { GROWTH_PLAN } from '@/lib/plans'
import { getOrCreateAgreementWindow } from '@/lib/subscriptions'

// Same shared-window reasoning as before (see subscriptions.ts /
// tdg_agreement_window): one 24-month contract instrument, one end_date
// shared by every agency, whoever subscribes first locks it in.
function nextBillingDate(billingDay: number): Date {
  const now         = new Date()
  const monthOffset = now.getUTCDate() > billingDay ? 1 : 0
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, billingDay))
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10) // Asaas quer YYYY-MM-DD, não datetime completo
}

function baseUrl(): string {
  return process.env.ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3'
}

function headers(): HeadersInit {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('ASAAS_API_KEY não configurado')
  return {
    'access_token': apiKey,
    'Content-Type': 'application/json',
    'User-Agent':   'TDGFlow/1.0 (Bemgsy)',
  }
}

async function asaasFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers: headers() })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Asaas ${init.method ?? 'GET'} ${path} falhou (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export interface CreateCheckoutParams {
  agencyId:    string
  agencyName:  string
  agencyCnpj:  string
  payerEmail:  string
  successUrl:  string
  cancelUrl:   string
}

export interface CreateCheckoutResult {
  checkoutId:  string
  checkoutUrl: string
}

// Cria o checkout hospedado do Asaas já com a assinatura recorrente
// embutida — equivalente ao antigo PreApproval do Mercado Pago: uma
// chamada, o Asaas cria cliente + assinatura, e devolve a URL pra onde
// redirecionar o navegador do responsável pela agência.
//
// externalReference = agencyId, mesma lógica de antes: é o que permite ao
// webhook atribuir a assinatura à agência certa sem depender do e-mail
// digitado no checkout.
export async function createAgencyCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
  const startDate   = nextBillingDate(GROWTH_PLAN.billingDay)
  const { endDate } = await getOrCreateAgreementWindow(() => ({
    startDate,
    endDate: addMonths(startDate, GROWTH_PLAN.repetitions),
  }))

  const result = await asaasFetch<{ id: string; checkoutUrl: string }>('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      billingTypes:      ['CREDIT_CARD', 'BOLETO', 'PIX'],
      chargeTypes:        ['RECURRENT'],
      minutesToExpire:    60,
      externalReference:  params.agencyId,
      callback: {
        successUrl: params.successUrl,
        cancelUrl:  params.cancelUrl,
        expiredUrl: params.cancelUrl,
      },
      items: [{ name: GROWTH_PLAN.reason, quantity: 1, price: GROWTH_PLAN.transactionAmount }],
      customerData: {
        name:    params.agencyName,
        email:   params.payerEmail,
        cpfCnpj: params.agencyCnpj,
      },
      subscription: {
        cycle:       'MONTHLY',
        nextDueDate: isoDate(startDate),
        endDate:     isoDate(endDate),
      },
    }),
  })

  if (!result.id || !result.checkoutUrl) {
    throw new Error('Resposta inesperada do Asaas ao criar checkout')
  }

  return { checkoutId: result.id, checkoutUrl: result.checkoutUrl }
}

export type AsaasSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'INACTIVE'

export interface RemoteSubscription {
  id:                 string
  status:             AsaasSubscriptionStatus
  customerId:         string
  externalReference:  string | null
  nextDueDate:        string | null
}

// Sempre busca de novo direto no Asaas em vez de confiar no payload do
// webhook — mesma cautela de antes com o Mercado Pago: a notificação só
// carrega um id, o status autoritativo vem do recurso em si.
export async function getSubscription(subscriptionId: string): Promise<RemoteSubscription> {
  const result = await asaasFetch<{
    id: string; status: AsaasSubscriptionStatus; customer: string
    externalReference: string | null; nextDueDate: string | null
  }>(`/subscriptions/${subscriptionId}`, { method: 'GET' })

  return {
    id:                result.id,
    status:            result.status,
    customerId:        result.customer,
    externalReference: result.externalReference ?? null,
    nextDueDate:       result.nextDueDate ?? null,
  }
}

export interface RemotePayment {
  status:            string
  subscriptionId:    string | null
  confirmedDate:     string | null
}

export async function getPayment(paymentId: string): Promise<RemotePayment> {
  const result = await asaasFetch<{
    status: string; subscription: string | null
    confirmedDate: string | null; paymentDate: string | null
  }>(`/payments/${paymentId}`, { method: 'GET' })

  return {
    status:         result.status,
    subscriptionId: result.subscription ?? null,
    confirmedDate:  result.confirmedDate ?? result.paymentDate ?? null,
  }
}
