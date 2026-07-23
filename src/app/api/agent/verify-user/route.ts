import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/agent/verify-user?phone=5511999920122
// Called by MAX TDG agent to check if a WhatsApp sender is a registered TDG user.
// Returns user info if found and active; 404 if not registered.
// Protected by AGENT_SECRET env var — MAX TDG must send ?secret=... or Authorization header.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const secret = new URL(req.url).searchParams.get('secret') ?? ''
  const agentSecret = process.env.AGENT_SECRET ?? ''

  if (agentSecret && authHeader !== `Bearer ${agentSecret}` && secret !== agentSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const phone = new URL(req.url).searchParams.get('phone') ?? ''
  const phoneNorm = phone.replace(/\D/g, '')

  if (!phoneNorm || phoneNorm.length < 10) {
    return NextResponse.json({ error: 'phone param required (digits only, with country code)' }, { status: 400 })
  }

  const { rows } = await sql`
    SELECT id, name, agency_name, role, active, agent_interaction_id
    FROM tdg_users
    WHERE whatsapp = ${phoneNorm}
    LIMIT 1
  `

  if (!rows[0]) {
    return NextResponse.json({ registered: false }, { status: 404 })
  }

  if (!rows[0].active) {
    return NextResponse.json({ registered: true, active: false, name: rows[0].name }, { status: 403 })
  }

  return NextResponse.json({
    registered: true,
    active: true,
    id: rows[0].id,
    name: rows[0].name,
    agency: rows[0].agency_name,
    role: rows[0].role,
    agent_interaction_id: rows[0].agent_interaction_id,
  })
}
