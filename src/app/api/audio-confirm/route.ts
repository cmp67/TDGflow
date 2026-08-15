import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, audio_shared, summary } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { rows: userRows } = await sql`SELECT id FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
  const userId = userRows[0]?.id
  if (!userId) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { rows: ownerRows } = await sql`SELECT agent_id FROM tdg_audio_inputs WHERE id = ${id}`
  if (!ownerRows.length) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })
  if (ownerRows[0].agent_id !== userId) return NextResponse.json({ error: 'Só o autor pode confirmar este áudio' }, { status: 403 })

  // status='confirmed' marca que esse áudio já virou um registro de
  // verdade — achado da Carla, 15/08: antes esse endpoint só marcava
  // audio_shared/confirmed_at, nunca mudava o status, então o item
  // continuava sugerindo "criar registro" pra sempre mesmo depois de
  // convertido.
  const { rows } = await sql`
    UPDATE tdg_audio_inputs
    SET audio_shared = COALESCE(${audio_shared ?? null}, audio_shared),
        summary = COALESCE(${summary ? JSON.stringify(summary) : null}, summary),
        status = 'confirmed',
        confirmed_at = NOW()
    WHERE id = ${id}
    RETURNING *`

  return NextResponse.json({ success: true, input: rows[0] })
}
