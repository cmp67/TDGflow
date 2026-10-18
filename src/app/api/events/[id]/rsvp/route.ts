import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { RSVP_STATUSES, type RsvpStatus } from '@/lib/events'
import { setRsvp } from '@/lib/events-db'
import { viewerFromSession } from '@/lib/events-db'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* POST { status: 'vou' | 'talvez' | 'nao' } — presença da própria pessoa. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as { status?: unknown } | null
  if (!body || !(RSVP_STATUSES as readonly unknown[]).includes(body.status)) return NextResponse.json({ error: 'status deve ser vou, talvez ou nao' }, { status: 400 })
  const viewer = await viewerFromSession(session.user.email)
  if (!viewer) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const ok = await setRsvp(id, viewer.id, body.status as RsvpStatus)
  if (!ok) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
