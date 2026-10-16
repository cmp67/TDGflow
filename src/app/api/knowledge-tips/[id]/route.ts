import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { parseKnowledgeItem } from '@/lib/knowledge'
import { updateKnowledge } from '@/lib/knowledge-db'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* PATCH — qualquer pessoa logada edita, com nome e data; a versão anterior
   fica guardada e o prazo de revisão renova. `versao` = a que a pessoa
   abriu; mudou no meio -> 409. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  const parsed = parseKnowledgeItem(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const versao = Number(body.versao)
  if (!Number.isInteger(versao) || versao < 1) return NextResponse.json({ error: 'versao obrigatória' }, { status: 400 })

  const { rows: userRows } = await sql`SELECT name FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
  const name = (userRows[0]?.name as string | undefined) ?? session.user.email
  const r = await updateKnowledge(id, parsed.fields, versao, { email: session.user.email, name })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ tip: r.item })
}
