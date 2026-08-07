import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — foto de celular, sem processamento pesado

const MAX_PHOTOS = 6 // acervo de uma visita, não álbum inteiro

/* ── POST — upload de 1+ fotos de uma visita confirmada, antes do submit do
   review. Retorna as URLs; o INSERT em tdg_hotel_reviews acontece depois,
   em POST /api/reviews, junto com o resto das respostas. Aceita múltiplos
   campos "photo" no mesmo FormData (upload em lote — arrastar várias de
   uma vez, ou selecionar várias no picker). ─────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const photos = formData.getAll('photo').filter((f): f is File => f instanceof File)
  if (photos.length === 0) return NextResponse.json({ error: 'Foto é obrigatória' }, { status: 400 })
  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Máximo de ${MAX_PHOTOS} fotos por vez` }, { status: 400 })
  }
  const tooBig = photos.find(p => p.size > MAX_BYTES)
  if (tooBig) {
    return NextResponse.json({ error: 'Foto muito grande — o limite é 8MB' }, { status: 400 })
  }

  const uploads = await Promise.all(
    photos.map((photo, i) =>
      put(
        `reviews/${session.user!.email!.replace('@', '_at_')}-${Date.now()}-${i}.${photo.name.split('.').pop() ?? 'jpg'}`,
        photo,
        { access: 'public', addRandomSuffix: false }
      )
    )
  )

  return NextResponse.json({ photo_urls: uploads.map(u => u.url) })
}
