import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: userRows } = await sql`SELECT agency_name FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1`
  const agencyName = userRows[0]?.agency_name as string | undefined
  if (!agencyName) return NextResponse.json({ error: 'Usuário sem agência' }, { status: 404 })

  const { id, audio_shared, summary } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { rows: ownerRows } = await sql`SELECT agency FROM tdg_audio_inputs WHERE id = ${id}`
  if (!ownerRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ownerRows[0].agency !== agencyName) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows } = await sql`
    UPDATE tdg_audio_inputs
    SET audio_shared = ${audio_shared},
        summary = ${JSON.stringify(summary)},
        confirmed_at = NOW()
    WHERE id = ${id}
    RETURNING *`

  return NextResponse.json({ success: true, input: rows[0] })
}
