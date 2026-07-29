import { sql } from '@vercel/postgres'

export async function logAudit(entry: {
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  summary: string
  changedBy: string
  changedByName?: string | null
}) {
  await sql`
    INSERT INTO tdg_audit_log (entity_type, entity_id, action, summary, changed_by, changed_by_name)
    VALUES (${entry.entityType}, ${entry.entityId}, ${entry.action}, ${entry.summary}, ${entry.changedBy}, ${entry.changedByName ?? null})
  `
}
