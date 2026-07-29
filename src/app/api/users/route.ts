import { sql } from '@vercel/postgres'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const ROLES = ['agent', 'agency_admin', 'admin'] as const
const ROLE_LABELS: Record<string, string> = {
  agent: 'Agente', agency_admin: 'Admin de Agência', admin: 'Admin da Rede',
}

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

// POST — create new user (admin only)
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, agency_name, password, role, whatsapp } = await req.json()
  if (!name || !email || !agency_name || !password || !whatsapp) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando (incluindo WhatsApp).' }, { status: 400 })
  }

  // Normalize whatsapp: digits only with country code (e.g. 5511999920122)
  const whatsappNorm = String(whatsapp).replace(/\D/g, '')
  if (whatsappNorm.length < 10) {
    return NextResponse.json({ error: 'WhatsApp inválido — informe com código do país (ex: 5511999920122).' }, { status: 400 })
  }

  const passwordHash = await hash(password, 12)
  const safeRole = role === 'admin' ? 'admin' : 'agent'

  try {
    const { rows } = await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp,
                             agent_interaction_id)
      VALUES (${name}, ${email}, ${agency_name}, ${passwordHash}, ${safeRole}, ${whatsappNorm},
              UPPER(LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 8)))
      RETURNING id, name, email, agency_name, role, active, whatsapp, agent_interaction_id, created_at
    `
    return NextResponse.json({ user: rows[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH — toggle active e/ou mudar papel (admin only). Promoção/rebaixamento
// de papel é registrada no mesmo log de auditoria genérico usado pra
// benefício de fornecedor — visível pra qualquer usuário da rede.
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, active, role } = await req.json()
  if (!id || (active === undefined && role === undefined)) {
    return NextResponse.json({ error: 'id and (active or role) required' }, { status: 400 })
  }

  if (role !== undefined) {
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: 'role inválida' }, { status: 400 })
    }
    const { rows: before } = await sql`SELECT role, name, email FROM tdg_users WHERE id = ${id}`
    if (before.length === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    if (before[0].role !== role) {
      await sql`UPDATE tdg_users SET role = ${role} WHERE id = ${id}`
      await logAudit({
        entityType: 'user_role',
        entityId: id,
        action: 'update',
        summary: `alterou papel de ${before[0].name} (${before[0].email}) de ${ROLE_LABELS[before[0].role] ?? before[0].role} para ${ROLE_LABELS[role]}`,
        changedBy: session.user?.email ?? 'desconhecido',
        changedByName: session.user?.name,
      })
    }
  }

  if (active !== undefined) {
    await sql`UPDATE tdg_users SET active = ${active} WHERE id = ${id}`
  }

  return NextResponse.json({ ok: true })
}
