import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { listKnowledgeVersoes } from '@/lib/knowledge-db'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* GET — versões anteriores de um item (a mais recente primeiro). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  return NextResponse.json({ versoes: await listKnowledgeVersoes(id) })
}
