import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EXTRACTION_PROMPT = `Analise esta transcrição de uma reunião de um agente de viagens e extraia as informações estruturadas.

Retorne APENAS um JSON válido com esta estrutura:
{
  "hotel_name": "nome do hotel mencionado ou null",
  "location": "localização ou null",
  "visit_type": "SITE_INSPECTION | MEETING | DEBRIEF",
  "commission_rate": número ou null,
  "promotions": ["lista de promoções mencionadas"],
  "advantages": ["vantagens negociadas mencionadas"],
  "contacts": ["nome e cargo de contactos mencionados"],
  "highlights": ["pontos mais importantes da reunião"],
  "notes": "observações gerais"
}`

async function currentUserId(email: string): Promise<string | null> {
  const { rows } = await sql`SELECT id FROM tdg_users WHERE email = ${email} LIMIT 1`
  return (rows[0]?.id as string | undefined) ?? null
}

// GET — lista só os áudios do próprio usuário (mais recentes primeiro).
// Achado da Carla, 15/08: antes retornava os 50 mais recentes de TODO
// MUNDO, sem sequer checar autenticação — qualquer um via a fila
// inteira da rede, incluindo transcrições de reuniões comerciais de
// outras agências.
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sql`ALTER TABLE tdg_audio_inputs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES tdg_users(id)`
  const userId = await currentUserId(session.user.email)
  if (!userId) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { rows } = await sql`
    SELECT id, agent_name, agency, interlocutor_name, interlocutor_company,
           visit_type, status, audio_url, transcript, summary,
           audio_shared, confirmed_at, created_at
    FROM tdg_audio_inputs
    WHERE agent_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50`
  return NextResponse.json({ items: rows })
}

// POST — transcreve um audio pendente pelo id (só o dono pode disparar)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const userId = await currentUserId(session.user.email)
  const { rows: ownerRows } = await sql`SELECT agent_id, audio_url FROM tdg_audio_inputs WHERE id = ${id}`
  if (!ownerRows.length) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })
  if (ownerRows[0].agent_id !== userId) return NextResponse.json({ error: 'Só o autor pode transcrever este áudio' }, { status: 403 })

  // Marca como processing
  await sql`UPDATE tdg_audio_inputs SET status = 'processing' WHERE id = ${id}`

  const audioUrl = ownerRows[0].audio_url
  if (!audioUrl) {
    await sql`UPDATE tdg_audio_inputs SET status = 'pending' WHERE id = ${id}`
    return NextResponse.json({ error: 'Audio URL not found' }, { status: 404 })
  }

  try {
    // Fetch audio from Blob
    const audioResp = await fetch(audioUrl)
    const arrayBuffer = await arrayBuffer_(audioResp)
    const audioBlob = new Blob([arrayBuffer])
    const fileName = audioUrl.split('/').pop() || 'audio.webm'
    const audioFile = new File([audioBlob], fileName)

    // Transcrever com Groq Whisper (whisper-large-v3-turbo)
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile, model: 'whisper-large-v3-turbo', language: 'pt', response_format: 'text'
    })
    const transcript = transcription as unknown as string

    // Extrair estrutura com Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const extraction = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nTranscrição:\n${transcript}` }]
    })

    let summary: Record<string, unknown> = {}
    try {
      const textBlock = extraction.content.find(b => b.type === 'text')
      if (textBlock?.type === 'text') {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) summary = JSON.parse(jsonMatch[0])
      }
    } catch { /* keep empty */ }

    await sql`
      UPDATE tdg_audio_inputs
      SET status = 'transcribed', transcript = ${transcript}, summary = ${JSON.stringify(summary)}
      WHERE id = ${id}`

    return NextResponse.json({ id, transcript, summary })
  } catch (e) {
    await sql`UPDATE tdg_audio_inputs SET status = 'pending' WHERE id = ${id}`
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH — edita interlocutor_name e interlocutor_company (só o dono)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, interlocutor_name, interlocutor_company } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const userId = await currentUserId(session.user.email)
  const { rows: ownerRows } = await sql`SELECT agent_id FROM tdg_audio_inputs WHERE id = ${id}`
  if (!ownerRows.length) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })
  if (ownerRows[0].agent_id !== userId) return NextResponse.json({ error: 'Só o autor pode editar este áudio' }, { status: 403 })

  await sql`
    UPDATE tdg_audio_inputs
    SET interlocutor_name = ${interlocutor_name ?? ''},
        interlocutor_company = ${interlocutor_company ?? ''}
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

async function arrayBuffer_(resp: Response): Promise<ArrayBuffer> {
  return resp.arrayBuffer()
}
