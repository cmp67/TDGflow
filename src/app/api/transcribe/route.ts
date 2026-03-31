import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  "booking_deadline": "data limite ou null",
  "stay_period": "período de estadia ou null",
  "highlights": ["pontos mais importantes da visita/reunião"],
  "notes": "observações gerais"
}`

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audioFile = formData.get('audio') as File
  const agentName = formData.get('agent_name') as string || 'Agente TDG'
  const agency = formData.get('agency') as string || ''

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

  // 2. Extrair estrutura com Claude
  const extraction = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `${EXTRACTION_PROMPT}\n\nTranscrição:\n${transcript}`
    }]
  })

  let summary: Record<string, unknown> = {}
  try {
    const textContent = extraction.content.find(b => b.type === 'text')
    if (textContent && textContent.type === 'text') {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) summary = JSON.parse(jsonMatch[0])
    }
  } catch { /* keep empty summary */ }

  // 3. Upload audio para Supabase Storage
  let audioUrl: string | null = null
  try {
    const fileName = `${Date.now()}-${audioFile.name}`
    const arrayBuffer = await audioFile.arrayBuffer()
    const { data: uploadData } = await supabase.storage
      .from('tdg-audio')
      .upload(fileName, arrayBuffer, { contentType: audioFile.type })
    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from('tdg-audio')
        .getPublicUrl(uploadData.path)
      audioUrl = urlData.publicUrl
    }
  } catch { /* storage optional */ }

  // 4. Guardar no Supabase (sem confirmar ainda — aguarda agente)
  const { data: savedInput } = await supabase
    .from('tdg_audio_inputs')
    .insert({
      agent_name: agentName,
      agency,
      visit_type: summary.visit_type || 'DEBRIEF',
      transcript,
      summary,
      audio_url: audioUrl,
      audio_shared: false
    })
    .select()
    .single()

  return NextResponse.json({
    id: savedInput?.id,
    transcript,
    summary
  })
}
