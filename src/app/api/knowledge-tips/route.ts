import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { parseKnowledgeItem } from '@/lib/knowledge'
import { createKnowledge, listKnowledge } from '@/lib/knowledge-db'

export const dynamic = 'force-dynamic'

/* TDG Knowledge Base (tdg_destination_knowledge) — conhecimento de destino
   importado do WhatsApp (país + tags) e registrado ao vivo pela rede.
   Fase 8 (02/08): a busca com termo vive em /api/search; esta rota é a
   listagem padrão. Evolução 16/10/2026: só publicados, com tipo, testado,
   prazo de revisão e versão (edição em /api/knowledge-tips/[id]). */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tips = await listKnowledge()
  return NextResponse.json({ tips, total: tips.length })
}

// POST — "Registrar nota" (20/08, pedido da Carla): qualquer pessoa logada
// registra direto o que não é review de fornecedor. Nasce publicado e SEM
// import_approval — quem digita é o próprio autor nesse instante.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseKnowledgeItem(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { rows: userRows } = await sql`SELECT name FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
  const authorName = (userRows[0]?.name as string | undefined) ?? session.user.email
  const tip = await createKnowledge(parsed.fields, { email: session.user.email, name: authorName })
  return NextResponse.json({ tip }, { status: 201 })
}
