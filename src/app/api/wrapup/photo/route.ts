import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { allowedPhotoUrl } from '@/lib/photo-proxy'

export const dynamic = 'force-dynamic'

/* Foto de destaque endireitada (EXIF) e recortada 16:9 pro e-mail semanal. */
export async function GET(req: NextRequest) {
  const src = allowedPhotoUrl(new URL(req.url).searchParams.get('u'))
  if (!src) return NextResponse.json({ error: 'foto inválida' }, { status: 400 })
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return NextResponse.json({ error: 'foto indisponível' }, { status: 404 })
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(1072, 603, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
    return new NextResponse(new Uint8Array(jpg), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=604800, immutable' } })
  } catch (err) {
    console.warn('[wrapup-photo] falhou', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'foto indisponível' }, { status: 502 })
  }
}
