import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const hotel_id = req.nextUrl.searchParams.get('hotel_id')
  if (!hotel_id) {
    const { rows } = await sql`SELECT id, name FROM tdg_hotels ORDER BY name`
    return NextResponse.json({ hotels: rows })
  }
  const { rows } = await sql`
    SELECT * FROM tdg_knowledge WHERE hotel_id = ${hotel_id} ORDER BY created_at DESC`
  return NextResponse.json({ items: rows })
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    const hotel_id = fd.get('hotel_id') as string
    const title = fd.get('title') as string
    const file = fd.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const blob = await put(`knowledge/${hotel_id}/${Date.now()}-${file.name}`, file, {
      access: 'public', addRandomSuffix: true
    })

    const type = file.type.includes('video') ? 'video' : 'pdf'
    const { rows } = await sql`
      INSERT INTO tdg_knowledge (hotel_id, type, title, url)
      VALUES (${hotel_id}, ${type}, ${title}, ${blob.url})
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
  const { id } = await req.json()
  await sql`DELETE FROM tdg_knowledge WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
