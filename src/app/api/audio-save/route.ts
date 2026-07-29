// Guarda audio rapidamente sem transcrever — para uso em feiras
import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: userRows } = await sql`
    SELECT name, agency_name FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
  `
  const user = userRows[0]
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const fd = await req.formData()
  const audioFile = fd.get('audio') as File
  // agent_name/agency vêm sempre da sessão autenticada, nunca do form — evita
  // que qualquer chamador grave uma gravação em nome de outra agência.
  const agentName = (user.name as string) || 'Agente'
  const agency = (user.agency_name as string) || ''
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
      (agent_name, agency, interlocutor_name, interlocutor_company, visit_type, audio_url, status)
    VALUES
      (${agentName}, ${agency}, ${interlocutorName}, ${interlocutorCompany}, 'MEETING', ${audioUrl}, 'pending')
    RETURNING id, created_at`

  return NextResponse.json({ id: rows[0].id, created_at: rows[0].created_at })
}
