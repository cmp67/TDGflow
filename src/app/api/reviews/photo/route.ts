import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — foto de celular, sem processamento pesado

/* ── POST — upload da foto de uma visita confirmada, antes do submit do
   review. Retorna só a URL; o INSERT em tdg_hotel_reviews acontece depois,
   em POST /api/reviews, junto com o resto das respostas. ─────────────── */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const photo = formData.get('photo') as File | null
  if (!photo) return NextResponse.json({ error: 'Foto é obrigatória' }, { status: 400 })
  if (photo.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Foto muito grande — o limite é 8MB' }, { status: 400 })
  }

  const blob = await put(
    `reviews/${session.user.email.replace('@', '_at_')}-${Date.now()}.${photo.name.split('.').pop() ?? 'jpg'}`,
    photo,
    { access: 'public', addRandomSuffix: false }
  )

  return NextResponse.json({ photo_url: blob.url })
}
