import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAgencyId } from '@/lib/agency'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getAgencyId(session.user?.email ?? '')
  if (!agencyId) return NextResponse.json({ error: 'Usuário sem agência' }, { status: 404 })

  const { id, audio_shared, summary } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { rows: ownerRows } = await sql`SELECT agency_id FROM tdg_audio_inputs WHERE id = ${id}`
  if (!ownerRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ownerRows[0].agency_id !== agencyId) {
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
