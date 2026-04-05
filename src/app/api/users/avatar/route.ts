import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ensure column exists
  await sql`ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 })

  // Upload to Vercel Blob
  const blob = await put(
    `avatars/${session.user.email.replace('@', '_at_')}-${Date.now()}.${image.name.split('.').pop() ?? 'jpg'}`,
    image,
    { access: 'public', addRandomSuffix: false }
  )

  // Persist in DB
  await sql`
    UPDATE tdg_users SET avatar_url = ${blob.url}
    WHERE email = ${session.user.email}
  `

  return NextResponse.json({ avatar_url: blob.url })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sql`ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`

  const { rows } = await sql`
    SELECT avatar_url FROM tdg_users WHERE email = ${session.user.email} LIMIT 1
  `
  return NextResponse.json({ avatar_url: rows[0]?.avatar_url ?? null })
}
