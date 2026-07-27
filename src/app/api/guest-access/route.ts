import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

const NO_AGENCY_ERROR = 'Sua conta nao esta vinculada a uma agencia.'
const FORBIDDEN_ERROR  = 'Apenas o administrador da agencia pode solicitar a ativacao do GUEST.'

interface CallerContext {
  agencyId: string | null
  agencyName: string
  role: string | null
}

interface ActivationRequestRow {
  status: string
  created_at: string
  requested_by_name: string
}

interface PendingRequestRow {
  id: number
  agency_name: string
  requested_by_name: string
  requested_by_email: string
  created_at: string
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_guest_activation_requests (
      id                  SERIAL PRIMARY KEY,
      agency_id           UUID NOT NULL,
      agency_name         TEXT NOT NULL,
      requested_by_email  TEXT NOT NULL,
      requested_by_name   TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  // Uma agência só pode ter um pedido pending/approved por vez — reforçado no
  // banco (não só checado na aplicação) pra fechar a corrida de dois POSTs
  // concorrentes (duplo clique, retry) inserindo dois pedidos ativos.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS tdg_guest_activation_requests_active_uidx
    ON tdg_guest_activation_requests (agency_id)
    WHERE status IN ('pending', 'approved')
  `
}

async function getCallerContext(email: string): Promise<CallerContext> {
  const { rows } = await sql`
    SELECT agency_id, agency_name, role FROM tdg_users WHERE email = ${email} AND active = true LIMIT 1
  `
  return {
    agencyId:   (rows[0]?.agency_id as string | undefined) ?? null,
    agencyName: (rows[0]?.agency_name as string | undefined) ?? '',
    role:       (rows[0]?.role as string | undefined) ?? null,
  }
}

function toResponse(row: ActivationRequestRow) {
  return {
    status:           row.status,
    requestedAt:      row.created_at,
    requestedByName:  row.requested_by_name,
  }
}

// GET /api/guest-access — status of the caller's agency's GUEST activation
// request. GUEST and TDG Flow are separate systems with separate auth (no
// SSO bridge yet), so this only reports the state of a manually-fulfilled
// request row, never a live provisioning status.
//
// Global admins additionally get `pendingRequests` — every agency's pending
// request, cross-agency — same "extra admin-only field on the same endpoint"
// shape already used by GET /api/credits, rather than a separate route.
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTables()
    const { agencyId, role } = await getCallerContext(session.user.email)

    let pendingRequests: { id: number; agencyName: string; requestedByName: string; requestedByEmail: string; requestedAt: string }[] | undefined
    if (role === 'admin') {
      const { rows } = await sql`
        SELECT id, agency_name, requested_by_name, requested_by_email, created_at
        FROM tdg_guest_activation_requests
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `
      pendingRequests = (rows as unknown as PendingRequestRow[]).map(r => ({
        id:               r.id,
        agencyName:       r.agency_name,
        requestedByName:  r.requested_by_name,
        requestedByEmail: r.requested_by_email,
        requestedAt:      r.created_at,
      }))
    }

    if (!agencyId) {
      return NextResponse.json({ status: 'no_agency', requestedAt: null, requestedByName: null, pendingRequests })
    }

    const { rows } = await sql`
      SELECT status, created_at, requested_by_name
      FROM tdg_guest_activation_requests
      WHERE agency_id = ${agencyId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ status: 'none', requestedAt: null, requestedByName: null, pendingRequests })
    }

    return NextResponse.json({ ...toResponse(rows[0] as unknown as ActivationRequestRow), pendingRequests })
  } catch (e) {
    console.error('[guest-access GET]', e)
    return NextResponse.json({ error: 'Erro ao consultar o status do GUEST.' }, { status: 500 })
  }
}

// PATCH /api/guest-access — global admin approves or rejects a pending
// request. Mirrors the admin-only status-change pattern in
// /api/suggestions (PATCH action:'status').
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTables()
    const { role } = await getCallerContext(session.user.email)
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem aprovar ou rejeitar pedidos.' }, { status: 403 })
    }

    const { id, status } = await req.json().catch(() => ({})) as { id?: number; status?: string }
    if (!id || (status !== 'approved' && status !== 'rejected')) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
    }

    const { rows } = await sql`
      UPDATE tdg_guest_activation_requests
      SET status = ${status}
      WHERE id = ${id} AND status = 'pending'
      RETURNING id
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado ou já processado.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id, status })
  } catch (e) {
    console.error('[guest-access PATCH]', e)
    return NextResponse.json({ error: 'Erro ao processar o pedido.' }, { status: 500 })
  }
}

// POST /api/guest-access — agency_admin (or global admin) requests GUEST
// activation for their own agency. This records the request for Bemgsy's ops
// team to fulfill manually — it does not provision anything itself.
// Idempotent: an existing pending/approved request is returned as-is, never
// duplicated.
export async function POST() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTables()
    const { agencyId, agencyName, role } = await getCallerContext(session.user.email)

    if (role !== 'agency_admin' && role !== 'admin') {
      return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 })
    }
    if (!agencyId) {
      return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })
    }

    const { rows: existing } = await sql`
      SELECT status, created_at, requested_by_name
      FROM tdg_guest_activation_requests
      WHERE agency_id = ${agencyId} AND status IN ('pending', 'approved')
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json(toResponse(existing[0] as unknown as ActivationRequestRow))
    }

    const name = session.user.name ?? session.user.email

    try {
      const { rows } = await sql`
        INSERT INTO tdg_guest_activation_requests (agency_id, agency_name, requested_by_email, requested_by_name)
        VALUES (${agencyId}, ${agencyName}, ${session.user.email}, ${name})
        RETURNING status, created_at, requested_by_name
      `
      return NextResponse.json(toResponse(rows[0] as unknown as ActivationRequestRow), { status: 201 })
    } catch (insertError: unknown) {
      // Duas requisições concorrentes (duplo clique, retry) podem passar pelo
      // SELECT acima antes de qualquer uma inserir — a unique index parcial
      // barra a segunda no banco. Em vez de 500, devolve o pedido que venceu
      // a corrida, mantendo o contrato idempotente também sob concorrência.
      const isUniqueViolation =
        typeof insertError === 'object' && insertError !== null && 'code' in insertError && insertError.code === '23505'
      if (!isUniqueViolation) throw insertError

      const { rows: winner } = await sql`
        SELECT status, created_at, requested_by_name
        FROM tdg_guest_activation_requests
        WHERE agency_id = ${agencyId} AND status IN ('pending', 'approved')
        ORDER BY created_at DESC
        LIMIT 1
      `
      return NextResponse.json(toResponse(winner[0] as unknown as ActivationRequestRow))
    }
  } catch (e) {
    console.error('[guest-access POST]', e)
    return NextResponse.json({ error: 'Erro ao registrar o pedido de ativação do GUEST.' }, { status: 500 })
  }
}
