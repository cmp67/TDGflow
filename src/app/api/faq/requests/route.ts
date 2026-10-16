import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { parseFaqRequest } from '@/lib/faq'
import { createFaqRequest } from '@/lib/faq-db'

export const dynamic = 'force-dynamic'

/* POST — "não achei o que procurava". Qualquer pessoa logada. É o motor de
   vida do Como faço: vira rascunho pra Carla responder. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseFaqRequest(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const request = await createFaqRequest(parsed.pergunta, parsed.contexto, session.user.email)
  return NextResponse.json({ request }, { status: 201 })
}
