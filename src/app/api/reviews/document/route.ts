import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 15 * 1024 * 1024 // roteiro em PDF com fotos pode passar dos 8MB usados pra foto solta

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]

/* ── POST — upload do documento de um roteiro (PDF/Word/fotos das páginas),
   antes do submit do review. Mesmo padrão de /api/reviews/photo — devolve a
   URL, o INSERT em tdg_hotel_reviews acontece depois em POST /api/reviews.
   Só 1 arquivo por roteiro, ao contrário das fotos (que aceitam lote). ─── */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('document')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Documento é obrigatório' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande — o limite é 15MB' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato não aceito — envie PDF, Word ou imagem' }, { status: 400 })
  }

  const upload = await put(
    `reviews-docs/${session.user.email.replace('@', '_at_')}-${Date.now()}.${file.name.split('.').pop() ?? 'pdf'}`,
    file,
    { access: 'public', addRandomSuffix: false }
  )

  return NextResponse.json({ document_url: upload.url, document_name: file.name })
}
