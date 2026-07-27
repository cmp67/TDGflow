// Pure client-side wrapper around GET/POST /api/guest-access — same shape as
// subscription-status-client.ts / subscribe-client.ts (status-code → UI-state
// mapping, no framework dependency), so it can be unit tested without
// jsdom/RTL.

export type GuestAccessStatus = 'no_agency' | 'none' | 'pending' | 'approved' | 'rejected'

export type GuestAccessResult =
  | { status: GuestAccessStatus; requestedAt: string | null; requestedByName: string | null }
  | { status: 'error'; message: string }

export interface PendingGuestRequest {
  id:               number
  agencyName:       string
  requestedByName:  string
  requestedByEmail: string
  requestedAt:      string
}

export type ReviewGuestRequestResult =
  | { ok: true }
  | { ok: false; message: string }

const GENERIC_ERROR = 'Não foi possível consultar o status do GUEST.'
const REQUEST_ERROR = 'Não foi possível enviar o pedido de ativação do GUEST.'
const REVIEW_ERROR  = 'Não foi possível processar o pedido.'
const NETWORK_ERROR = 'Não foi possível conectar ao servidor.'

const KNOWN_STATUSES: readonly GuestAccessStatus[] = ['no_agency', 'none', 'pending', 'approved', 'rejected']

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function toResult(body: Record<string, unknown>, genericError: string): GuestAccessResult {
  const status = body.status as string
  if (KNOWN_STATUSES.includes(status as GuestAccessStatus)) {
    return {
      status:          status as GuestAccessStatus,
      requestedAt:     (body.requestedAt as string | null) ?? null,
      requestedByName: (body.requestedByName as string | null) ?? null,
    }
  }
  return { status: 'error', message: genericError }
}

export async function fetchGuestAccessStatus(): Promise<GuestAccessResult> {
  try {
    const res  = await fetch('/api/guest-access')
    const body = await parseJson(res)

    if (!res.ok) return { status: 'error', message: typeof body.error === 'string' ? body.error : GENERIC_ERROR }
    return toResult(body, GENERIC_ERROR)
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}

export async function requestGuestAccess(): Promise<GuestAccessResult> {
  try {
    const res  = await fetch('/api/guest-access', { method: 'POST' })
    const body = await parseJson(res)

    if (!res.ok) return { status: 'error', message: typeof body.error === 'string' ? body.error : REQUEST_ERROR }
    return toResult(body, REQUEST_ERROR)
  } catch {
    return { status: 'error', message: NETWORK_ERROR }
  }
}

// Admin-only: cross-agency list, riding on the same GET as the caller's own
// status (see route.ts) — empty array for any non-admin caller.
export async function fetchPendingGuestRequests(): Promise<PendingGuestRequest[]> {
  try {
    const res  = await fetch('/api/guest-access')
    const body = await parseJson(res)
    if (!res.ok || !Array.isArray(body.pendingRequests)) return []
    return body.pendingRequests as PendingGuestRequest[]
  } catch {
    return []
  }
}

export async function reviewGuestRequest(id: number, status: 'approved' | 'rejected'): Promise<ReviewGuestRequestResult> {
  try {
    const res  = await fetch('/api/guest-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) {
      const body = await parseJson(res)
      return { ok: false, message: typeof body.error === 'string' ? body.error : REVIEW_ERROR }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: NETWORK_ERROR }
  }
}
