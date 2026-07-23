import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/* Lightweight transcription — returns only text, no DB save, no blob upload */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File

  if (!audioFile) {
    return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'pt',
      response_format: 'text',
    })
    return NextResponse.json({ text: transcription as unknown as string })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
