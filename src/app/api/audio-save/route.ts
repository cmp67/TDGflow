// Guarda audio rapidamente sem transcrever — para uso em feiras
import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Identidade sempre do lado do servidor — achado da Carla, 15/08: o
  // agent_name vinha de um campo de texto livre no formulário (editável
  // pelo próprio usuário, sem verificação nenhuma), então a fila de
  // áudio não tinha como saber de quem era cada gravação de verdade.
  const { rows: userRows } = await sql`
    SELECT id, name, agency_name, agency_id FROM tdg_users WHERE email = ${session.user.email} LIMIT 1
  `
  const user = userRows[0]
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  await sql`ALTER TABLE tdg_audio_inputs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES tdg_users(id)`

  const fd = await req.formData()
  const audioFile = fd.get('audio') as File
  const interlocutorName = (fd.get('interlocutor_name') as string) || ''
  const interlocutorCompany = (fd.get('interlocutor_company') as string) || ''

  if (!audioFile) return NextResponse.json({ error: 'Audio required' }, { status: 400 })

  let audioUrl: string | null = null
  try {
    const blob = await put(`audio/${Date.now()}-${audioFile.name}`, audioFile, {
      access: 'public', addRandomSuffix: true
    })
    audioUrl = blob.url
  } catch { /* blob optional */ }

  const { rows } = await sql`
    INSERT INTO tdg_audio_inputs
      (agent_id, agent_name, agency, agency_id, interlocutor_name, interlocutor_company, visit_type, audio_url, status)
    VALUES
      (${user.id}, ${user.name}, ${user.agency_name}, ${user.agency_id}, ${interlocutorName}, ${interlocutorCompany}, 'MEETING', ${audioUrl}, 'pending')
    RETURNING id, created_at`

  return NextResponse.json({ id: rows[0].id, created_at: rows[0].created_at })
}
