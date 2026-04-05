import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface CardData {
  name: string | null
  surname: string | null
  title: string | null
  email: string | null
  whatsapp: string | null
  company: string | null
  notes: string | null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null

  if (!imageFile) {
    return NextResponse.json({ error: 'Image required' }, { status: 400 })
  }

  // Convert to base64
  const buffer = Buffer.from(await imageFile.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = (imageFile.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `Analise este cartão de visita e extraia as informações de contato.
Retorne APENAS um JSON válido com esta estrutura (use null se não encontrar):
{
  "name": "primeiro nome",
  "surname": "sobrenome",
  "title": "cargo / título",
  "email": "email",
  "whatsapp": "telefone/whatsapp com código do país se disponível",
  "company": "empresa / hotel",
  "notes": "qualquer informação extra relevante"
}`,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'Could not read card' }, { status: 422 })
  }

  try {
    const match = textBlock.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    const card: CardData = JSON.parse(match[0])
    return NextResponse.json({ card })
  } catch {
    return NextResponse.json({ error: 'Could not parse card data' }, { status: 422 })
  }
}
