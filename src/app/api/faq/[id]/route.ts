import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/user-role'
import { logAudit } from '@/lib/audit'
import { parseFaqItem } from '@/lib/faq'
import { updateFaqItem } from '@/lib/faq-db'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* PATCH — edita pergunta, resposta, área, ordem, publicado. Só admin. O
   slug não muda (é a URL compartilhada). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminEmail(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseFaqItem(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const item = await updateFaqItem(id, parsed.fields, session.user.email)
  if (!item) return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 })
  await logAudit({
    entityType: 'faq_item', entityId: id, action: 'update',
    summary: `editou "${item.pergunta}"${item.publicado ? '' : ' (despublicada)'}`,
    changedBy: session.user.email, changedByName: session.user.name ?? undefined,
  })
  return NextResponse.json({ item })
}
