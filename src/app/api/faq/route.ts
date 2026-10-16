import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/user-role'
import { logAudit } from '@/lib/audit'
import { parseFaqItem } from '@/lib/faq'
import { createFaqItem, listFaqItems, listOpenFaqRequests, resolveFaqRequest } from '@/lib/faq-db'

export const dynamic = 'force-dynamic'

/* GET — perguntas publicadas (admin vê também as não publicadas e as
   perguntas abertas da rede). */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await isAdminEmail(session.user.email)
  const items = await listFaqItems(admin)
  const requests = admin ? await listOpenFaqRequests() : []
  return NextResponse.json({ items, requests, is_admin: admin })
}

/* POST — cria pergunta+resposta. SÓ admin, checado aqui no servidor —
   "eu escrevo, a rede lê". Se veio de uma pergunta da rede (request_id),
   marca como respondida e liga ao item. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminEmail(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseFaqItem(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const item = await createFaqItem(parsed.fields, session.user.email)
  if (typeof body.request_id === 'string') {
    await resolveFaqRequest(body.request_id, 'respondida', session.user.email, item.id)
  }
  await logAudit({
    entityType: 'faq_item', entityId: item.id, action: 'create',
    summary: `criou "${item.pergunta}"`, changedBy: session.user.email, changedByName: session.user.name ?? undefined,
  })
  return NextResponse.json({ item }, { status: 201 })
}
