import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { parseEvent } from '@/lib/events'
import { createEvent, listEvents, viewerFromSession, inviteUsers } from '@/lib/events-db'
import { notifyInvitees } from '@/lib/event-notify'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* GET ?from=AAAA-MM-DD&to=AAAA-MM-DD — eventos da rede + da própria agência. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const viewer = await viewerFromSession(session.user.email)
  if (!viewer) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const sp = req.nextUrl.searchParams
  const from = sp.get('from') ?? new Date().toISOString().slice(0, 10)
  const to = sp.get('to') ?? new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return NextResponse.json({ error: 'from/to em AAAA-MM-DD' }, { status: 400 })
  return NextResponse.json({ events: await listEvents(viewer, { from, to }) })
}

/* POST — qualquer pessoa logada cria (decisão da Carla 18/10/2026), com nome e data. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseEvent(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const viewer = await viewerFromSession(session.user.email)
  if (!viewer) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const event = await createEvent(parsed.fields, { email: viewer.email, name: viewer.name, agencyId: viewer.agencyId })
  await logAudit({ entityType: 'event', entityId: event.id, action: 'create', summary: `criou evento "${event.title}"`, changedBy: viewer.email, changedByName: session.user.name ?? undefined })
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const invitees = Array.isArray(body.invitees) ? (body.invitees as unknown[]).filter((x): x is string => typeof x === 'string' && UUID_RE.test(x)) : []
  const fresh = invitees.length ? await inviteUsers(event.id, invitees, viewer.email) : []
  const notified = fresh.length ? await notifyInvitees(event, fresh, viewer.name) : { email: 0, whatsapp: 0 }
  return NextResponse.json({ event, invited: fresh.length, notified }, { status: 201 })
}
