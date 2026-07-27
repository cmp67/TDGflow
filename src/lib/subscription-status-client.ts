// Pure client-side wrapper around GET /api/billing/subscription-status — same
// shape as topup-client.ts (status-code → UI-state mapping, no framework
// dependency), so it can be unit tested without jsdom/RTL.

export type SubscriptionStatusResult =
  | { status: 'authorized'; planTier: string; transactionAmount: number | null; nextPaymentDate: string | null }
  | { status: 'pending' }
  | { status: 'paused' }
  | { status: 'cancelled' }
  | { status: 'rejected' }
  | { status: 'none' }
  | { status: 'unauthenticated' }
  | { status: 'no_agency' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

const GENERIC_ERROR = 'Não foi possível consultar o status da assinatura.'
const NETWORK_ERROR = 'Não foi possível conectar ao servidor.'

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResult> {
  try {
    const res  = await fetch('/api/billing/subscription-status')
    const body = await parseJson(res)

    if (res.status === 401) return { status: 'unauthenticated' }
    if (res.status === 422) return { status: 'no_agency' }
    if (!res.ok) return { status: 'error', message: typeof body.error === 'string' ? body.error : GENERIC_ERROR }

    const status = body.status as string
    if (status === 'authorized') {
      return {
        status:            'authorized',
        planTier:          body.planTier as string,
        transactionAmount: (body.transactionAmount as number | null) ?? null,
        nextPaymentDate:   (body.nextPaymentDate as string | null) ?? null,
      }
    }
    if (status === 'pending' || status === 'paused' || status === 'cancelled' || status === 'rejected' || status === 'none') {
      return { status }
    }
    return { status: 'error', message: GENERIC_ERROR }
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}
