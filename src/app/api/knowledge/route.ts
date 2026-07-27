import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { validateVideoUpload, MAX_VIDEO_FILE_BYTES } from '@/lib/video-upload'

export const dynamic = 'force-dynamic'

// Antes desta mudança este endpoint não tinha nenhuma checagem de sessão —
// só ficava "protegido" por ninguém linkar pra UI admin de fora do /admin.
// Abrir a galeria de vídeo pro membro comum significa que agora existe um
// caminho real de escrita alcançável por qualquer usuário logado, então a
// exigência de sessão deixa de ser opcional.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hotel_id = req.nextUrl.searchParams.get('hotel_id')
  const type = req.nextUrl.searchParams.get('type') // opcional — sem filtro, comportamento igual a antes

  if (!hotel_id) {
    const { rows } = await sql`SELECT id, name FROM tdg_hotels ORDER BY name`
    return NextResponse.json({ hotels: rows })
  }
  const { rows } = type
    ? await sql`SELECT * FROM tdg_knowledge WHERE hotel_id = ${hotel_id} AND type = ${type} ORDER BY created_at DESC`
    : await sql`SELECT * FROM tdg_knowledge WHERE hotel_id = ${hotel_id} ORDER BY created_at DESC`
  return NextResponse.json({ items: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (req.headers.get('content-type')?.includes('multipart/form-data')) {
    const fd = await req.formData()
    const hotel_id = fd.get('hotel_id') as string
    const title = fd.get('title') as string
    const file = fd.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const type = file.type.includes('video') ? 'video' : 'pdf'

    // Vídeo carrega regras que PDF não tem: limite de 30s, confirmação do
    // hotel, e a data em que foi filmado — validadas ANTES de gastar upload
    // no Blob. O client já manda a duração lida no navegador (video-upload.ts);
    // aqui é a blindagem server-side, nunca confiando só na checagem do client.
    let durationSeconds: number | null = null
    let agreedWithHotel = false
    let filmedAt: string | null = null
    if (type === 'video') {
      const durationRaw = fd.get('duration_seconds')
      durationSeconds = durationRaw ? Number(durationRaw) : null
      agreedWithHotel = fd.get('agreed_with_hotel') === 'true'
      filmedAt = (fd.get('filmed_at') as string) || null

      const validation = validateVideoUpload({
        durationSeconds, fileSize: file.size, agreedWithHotel, filmedAt,
      })
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
    } else if (file.size > MAX_VIDEO_FILE_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande — o limite é 25MB.' }, { status: 400 })
    }

    const blob = await put(`knowledge/${hotel_id}/${Date.now()}-${file.name}`, file, {
      access: 'public', addRandomSuffix: true,
    })

    const { rows: userRows } = await sql`SELECT name FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
    const authorName = (userRows[0]?.name as string | undefined) ?? session.user.email

    const { rows } = await sql`
      INSERT INTO tdg_knowledge
        (hotel_id, type, title, url, duration_seconds, agreed_with_hotel, source_date, source_author)
      VALUES
        (${hotel_id}, ${type}, ${title}, ${blob.url},
         ${durationSeconds}, ${agreedWithHotel}, ${filmedAt}, ${type === 'video' ? authorName : null})
      RETURNING *`
    return NextResponse.json({ item: rows[0] })
  }

  const { hotel_id, type, title, content, url } = await req.json()
  const { rows } = await sql`
    INSERT INTO tdg_knowledge (hotel_id, type, title, content, url)
    VALUES (${hotel_id}, ${type}, ${title}, ${content ?? null}, ${url ?? null})
    RETURNING *`
  return NextResponse.json({ item: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await sql`DELETE FROM tdg_knowledge WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
