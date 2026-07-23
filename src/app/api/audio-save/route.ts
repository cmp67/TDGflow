// Guarda audio rapidamente sem transcrever — para uso em feiras
import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const audioFile = fd.get('audio') as File
  const agentName = (fd.get('agent_name') as string) || 'Stella'
  const agency = (fd.get('agency') as string) || ''
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
