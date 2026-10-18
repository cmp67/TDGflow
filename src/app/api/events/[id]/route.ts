import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { parseEvent } from '@/lib/events'
import { cancelEvent, getEvent, listRsvps, updateEvent } from '@/lib/events-db'
import { viewerFromSession } from '@/lib/events-db'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const viewer = await viewerFromSession(session.user.email)
  const event = await getEvent(id, viewer)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ event, rsvps: await listRsvps(id) })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseEvent(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const viewer = await viewerFromSession(session.user.email)
  if (!viewer) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const r = await updateEvent(id, parsed.fields, viewer)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  await logAudit({ entityType: 'event', entityId: id, action: 'update', summary: `editou evento "${r.event.title}"`, changedBy: viewer.email, changedByName: session.user.name ?? undefined })
  return NextResponse.json({ event: r.event })
}

/* DELETE = cancelar (nada se apaga). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const viewer = await viewerFromSession(session.user.email)
  if (!viewer) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const r = await cancelEvent(id, viewer)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  await logAudit({ entityType: 'event', entityId: id, action: 'delete', summary: 'cancelou evento', changedBy: viewer.email, changedByName: session.user.name ?? undefined })
  return NextResponse.json({ ok: true })
}
