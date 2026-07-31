import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — print de tela, não precisa mais que isso

// POST /api/suggestions/screenshot — upload do print de erro anexado a um
// "Reportar problema" em Linha Direta Bemgsy. Devolve a URL pra incluir no
// POST /api/suggestions (screenshot_url) — upload e criação da sugestão são
// dois passos porque o arquivo precisa existir antes de ter o id da sugestão.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 })
  if (!image.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Arquivo precisa ser uma imagem' }, { status: 400 })
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Imagem excede 8MB — comprima e tente novamente' }, { status: 400 })
  }

  const blob = await put(
    `bug-reports/${session.user.email.replace('@', '_at_')}-${Date.now()}.${image.name.split('.').pop() ?? 'png'}`,
    image,
    { access: 'public', addRandomSuffix: false }
  )

  return NextResponse.json({ screenshot_url: blob.url })
}
