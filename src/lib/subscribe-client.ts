// Pure client wrapper around POST /api/billing/subscribe — same shape as
// topup-client.ts / subscription-status-client.ts.

export type SubscribeResult =
  | { status: 'ok'; initPoint: string }
  | { status: 'unauthenticated' }
  | { status: 'no_agency' }
  | { status: 'already_subscribed' }
  | { status: 'error'; message: string }

const GENERIC_ERROR = 'Não foi possível iniciar a assinatura.'
const NETWORK_ERROR = 'Não foi possível conectar ao servidor.'

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function subscribeToGrowth(): Promise<SubscribeResult> {
  try {
    const res  = await fetch('/api/billing/subscribe', { method: 'POST' })
    const body = await parseJson(res)

    if (res.status === 401) return { status: 'unauthenticated' }
    if (res.status === 422) return { status: 'no_agency' }
    if (res.status === 409) return { status: 'already_subscribed' }
    if (!res.ok) return { status: 'error', message: typeof body.error === 'string' ? body.error : GENERIC_ERROR }

    const initPoint = body.initPoint
    if (typeof initPoint !== 'string' || !initPoint) return { status: 'error', message: 'Resposta inesperada do servidor.' }

    return { status: 'ok', initPoint }
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}
