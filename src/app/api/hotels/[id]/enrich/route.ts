import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { proposeEnrichment, reviewEnrichment, ENRICH_FIELDS, type EnrichField } from '@/lib/enrichment'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 30
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function caller(email: string) {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return { email, isAdmin: rows[0]?.role === 'admin' }
}

/* POST — busca (ou rebusca) dados públicos e guarda como proposta pendente.
   Qualquer pessoa logada pode pedir; só criadora/admin aprova. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const r = await proposeEnrichment(id)
  if (!r) return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
  return NextResponse.json({ status: r.status, proposal: r.proposal })
}

/* PATCH { action: 'approve' | 'reject', fields?: [...] } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as { action?: unknown; fields?: unknown } | null
  if (!body || (body.action !== 'approve' && body.action !== 'reject')) return NextResponse.json({ error: 'action deve ser approve ou reject' }, { status: 400 })
  const fields = Array.isArray(body.fields) ? (body.fields as unknown[]).filter((f): f is EnrichField => (ENRICH_FIELDS as readonly unknown[]).includes(f)) : [...ENRICH_FIELDS]
  const r = await reviewEnrichment(id, await caller(session.user.email), body.action, fields)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  await logAudit({ entityType: 'hotel', entityId: id, action: 'update', summary: body.action === 'approve' ? `aprovou dados públicos (${fields.join(', ')})` : 'descartou dados públicos encontrados', changedBy: session.user.email, changedByName: session.user.name ?? undefined })
  return NextResponse.json({ ok: true })
}
