// Thin client-side wrapper around the self-service top-up endpoint
// (`/api/credits`, see src/app/api/credits/route.ts). Kept as pure
// functions — independent of any React component — so the request/response
// mapping (status codes → UI states) can be unit tested without needing a
// component-testing setup (jsdom / React Testing Library are not part of
// this project yet).

import type { TierId } from '@/lib/credits'

export interface AgencyBalance {
  balance: number
  tier:    TierId
}

export type OwnBalanceResult =
  | { status: 'ready'; balance: AgencyBalance }
  | { status: 'no_agency' }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string }

export type TopUpResult =
  | { status: 'ok'; balance: AgencyBalance }
  | { status: 'no_agency' }
  | { status: 'unauthenticated' }
  | { status: 'invalid_tier'; message: string }
  | { status: 'error'; message: string }

const GENERIC_LOAD_ERROR = 'Não foi possível carregar o saldo.'
const GENERIC_BUY_ERROR  = 'Não foi possível processar a compra.'
const NETWORK_ERROR      = 'Não foi possível conectar ao servidor.'

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function errorMessage(body: Record<string, unknown>, fallback: string): string {
  return typeof body.error === 'string' && body.error.length > 0 ? body.error : fallback
}

// ── GET /api/credits — own agency balance ──────────────────────────────────

export async function fetchOwnBalance(): Promise<OwnBalanceResult> {
  try {
    const res  = await fetch('/api/credits')
    const body = await parseJson(res)

    if (res.status === 401) return { status: 'unauthenticated' }
    if (res.status === 422) return { status: 'no_agency' }
    if (!res.ok) return { status: 'error', message: errorMessage(body, GENERIC_LOAD_ERROR) }

    // A 200 with no `balance` field means the caller has no agency_id of
    // their own (e.g. a TDG admin account) — the route only includes
    // `balance` when `agencyId` is set (see GET /api/credits). Treat this
    // the same as the explicit 422 case: no personal top-up available, not
    // a server error.
    const balance = body.balance as AgencyBalance | undefined
    if (!balance) return { status: 'no_agency' }

    return { status: 'ready', balance }
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}

// ── POST /api/credits { action: 'top_up', tier } ───────────────────────────

export async function buyTopUp(tier: TierId): Promise<TopUpResult> {
  try {
    const res = await fetch('/api/credits', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'top_up', tier }),
    })
    const body = await parseJson(res)

    if (res.status === 401) return { status: 'unauthenticated' }
    if (res.status === 422) return { status: 'no_agency' }
    if (res.status === 400) return { status: 'invalid_tier', message: errorMessage(body, 'Pacote inválido.') }
    if (!res.ok) return { status: 'error', message: errorMessage(body, GENERIC_BUY_ERROR) }

    const balance = body.balance as AgencyBalance | undefined
    if (!balance) return { status: 'error', message: 'Resposta inesperada do servidor.' }

    return { status: 'ok', balance }
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}
