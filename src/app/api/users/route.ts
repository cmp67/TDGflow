import { sql } from '@vercel/postgres'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

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

// PATCH — toggle active (admin only)
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, active } = await req.json()
  if (!id || active === undefined) {
    return NextResponse.json({ error: 'id and active required' }, { status: 400 })
  }

  await sql`UPDATE tdg_users SET active = ${active} WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
