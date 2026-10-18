import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getEvent, inviteUsers, listInvitees, viewerFromSession } from '@/lib/events-db'
import { notifyInvitees } from '@/lib/event-notify'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* GET — convidados e presença. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  return NextResponse.json({ invitees: await listInvitees(id) })
}

/* POST { user_ids } — convida e avisa (e-mail + WhatsApp) só quem é novo. Qualquer pessoa logada convida. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as { user_ids?: unknown } | null
  const ids = Array.isArray(body?.user_ids) ? (body!.user_ids as unknown[]).filter((x): x is string => typeof x === 'string' && UUID_RE.test(x)) : []
  if (!ids.length) return NextResponse.json({ error: 'Escolha quem convidar' }, { status: 400 })
  const viewer = await viewerFromSession(session.user.email)
  if (!viewer) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const event = await getEvent(id, viewer)
  if (!event || event.cancelled_at) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  const fresh = await inviteUsers(id, ids, viewer.email)
  const sent = await notifyInvitees(event, fresh, viewer.name)
  return NextResponse.json({ invited: fresh.length, notified: sent })
}
