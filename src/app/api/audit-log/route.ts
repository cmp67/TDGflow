import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: 'create' | 'update' | 'delete'
  summary: string
  changed_by: string
  changed_by_name: string | null
  created_at: string
}

/* Trilha de auditoria genérica — visível pra qualquer usuário autenticado
   da rede (não só admin): benefício negociado e promoção de papel são
   decisões que afetam todo mundo, então todo mundo pode ver o histórico,
   mesmo que só admin possa criar/alterar. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entityType = req.nextUrl.searchParams.get('entityType')
  const entityId = req.nextUrl.searchParams.get('entityId')
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 })
  }

  const { rows } = await sql<AuditLogEntry>`
    SELECT id, entity_type, entity_id, action, summary, changed_by, changed_by_name, created_at::text AS created_at
    FROM tdg_audit_log
    WHERE entity_type = ${entityType} AND entity_id = ${entityId}
    ORDER BY created_at DESC
  `
  return NextResponse.json({ entries: rows })
}
