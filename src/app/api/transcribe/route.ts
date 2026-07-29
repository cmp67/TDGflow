import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logUsage } from '@/lib/usage-log'
import { checkAndDeductCredits, INSUFFICIENT_BALANCE, NO_AGENCY } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'

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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userEmail = session.user?.email ?? ''

  const { rows: userRows } = await sql`SELECT name, agency_name FROM tdg_users WHERE email = ${userEmail} LIMIT 1`
  const user = userRows[0]
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const agencyId = await getAgencyId(userEmail)
  const credit = await checkAndDeductCredits({ agencyId, action: 'transcription', userEmail })
  if (!credit.ok) {
    if (credit.reason === NO_AGENCY) return NextResponse.json({ error: NO_AGENCY }, { status: 403 })
    return NextResponse.json({ error: INSUFFICIENT_BALANCE }, { status: 402 })
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File
  // agent_name/agency vêm sempre da sessão autenticada, nunca do form — mesma
  // regra de audio-save/route.ts, evita gravar reunião em nome de outra agência
  // e mantém consistência com o escopo de agência aplicado em audio-confirm.
  const agentName = (user.name as string) || 'Agente'
  const agency = (user.agency_name as string) || ''

  if (!audioFile) {
    return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
  }

  // 1. Transcrever com Groq Whisper (whisper-large-v3-turbo — rápido e gratuito)
  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3-turbo',
    language: 'pt',
    response_format: 'text',
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
  await sql`ALTER TABLE tdg_audio_inputs ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id)`
  const { rows } = await sql`
    INSERT INTO tdg_audio_inputs (agent_name, agency, agency_id, visit_type, transcript, summary, audio_url, audio_shared)
    VALUES (
      ${agentName}, ${agency}, ${agencyId},
      ${(summary.visit_type as string) || 'DEBRIEF'},
      ${transcript},
      ${JSON.stringify(summary)},
      ${audioUrl},
      false
    )
    RETURNING id`

  logUsage({
    event_type: 'transcription',
    user_email: userEmail,
    meta: { file_size: audioFile.size, agent: agentName },
  })
  // Credit already deducted at start of request

  return NextResponse.json({ id: rows[0]?.id, transcript, summary })
}
