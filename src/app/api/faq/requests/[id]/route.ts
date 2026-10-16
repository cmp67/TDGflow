import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/user-role'
import { resolveFaqRequest } from '@/lib/faq-db'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* PATCH { status: 'descartada' } — a Carla descarta uma pergunta que não
   vira item (duplicada, fora de escopo). Responder é pelo POST /api/faq
   com request_id. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminEmail(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as { status?: unknown } | null
  if (body?.status !== 'descartada') return NextResponse.json({ error: 'status deve ser descartada' }, { status: 400 })
  const ok = await resolveFaqRequest(id, 'descartada', session.user.email, null)
  if (!ok) return NextResponse.json({ error: 'Pergunta não encontrada ou já tratada' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
