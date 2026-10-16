import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { arquivarKnowledge } from '@/lib/knowledge-db'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* POST — nada se apaga: quem escreveu ou o admin arquiva. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const { rows } = await sql`SELECT name, role FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
  const name = (rows[0]?.name as string | undefined) ?? session.user.email
  const r = await arquivarKnowledge(id, { email: session.user.email, name }, rows[0]?.role === 'admin')
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ ok: true })
}
