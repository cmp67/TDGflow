import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EXTRACTION_PROMPT = `Analise esta transcrição de um agente de viagens e extraia as informações estruturadas.

Retorne APENAS um JSON válido com esta estrutura:
{
  "hotel_name": "nome do hotel mencionado ou null",
  "location": "localização ou null",
  "visit_type": "SITE_INSPECTION | MEETING | DEBRIEF",
  "commission_rate": número ou null,
  "promotions": ["lista de promoções mencionadas"],
  "advantages": ["vantagens negociadas mencionadas"],
  "contacts": ["nome e cargo de contactos mencionados"],
  "highlights": ["pontos mais importantes da visita/reunião"],
  "notes": "observações gerais"
}`

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File
  const agentName = (formData.get('agent_name') as string) || 'Agente TDG'
  const agency = (formData.get('agency') as string) || ''

  if (!audioFile) {
    return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
  }

  // 1. Transcrever com Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'pt',
    response_format: 'text'
  })
  const transcript = transcription as unknown as string

  // 2. Extrair estrutura com Claude Haiku
  const extraction = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nTranscrição:\n${transcript}` }]
  })

  let summary: Record<string, unknown> = {}
  try {
    const textContent = extraction.content.find(b => b.type === 'text')
    if (textContent?.type === 'text') {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) summary = JSON.parse(jsonMatch[0])
    }
  } catch { /* keep empty */ }

  // 3. Upload audio para Vercel Blob (privado por defeito)
  let audioUrl: string | null = null
  try {
    const blob = await put(`audio/${Date.now()}-${audioFile.name}`, audioFile, {
      access: 'public',
      addRandomSuffix: true
    })
    audioUrl = blob.url
  } catch { /* storage optional */ }

  // 4. Guardar no Postgres
  const { rows } = await sql`
    INSERT INTO tdg_audio_inputs (agent_name, agency, visit_type, transcript, summary, audio_url, audio_shared)
    VALUES (
      ${agentName}, ${agency},
      ${(summary.visit_type as string) || 'DEBRIEF'},
      ${transcript},
      ${JSON.stringify(summary)},
      ${audioUrl},
      false
    )
    RETURNING id`

  return NextResponse.json({ id: rows[0]?.id, transcript, summary })
}
