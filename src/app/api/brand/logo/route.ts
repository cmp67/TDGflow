import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getCallerContext } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// POST /api/brand/logo — upload do logo da agência (mesmo padrão de
// api/users/avatar/route.ts). Só agency_admin/admin, escopado à própria
// agência do chamador.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, agencyId } = await getCallerContext(session.user.email)
  if (role !== 'admin' && role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!agencyId) return NextResponse.json({ error: 'Usuário sem agência vinculada' }, { status: 422 })

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 })

  const blob = await put(
    `brand-logos/${agencyId}-${Date.now()}.${image.name.split('.').pop() ?? 'png'}`,
    image,
    { access: 'public', addRandomSuffix: false }
  )

  const { rows } = await sql`
    INSERT INTO tdg_brand (agency_id, logo_url)
    VALUES (${agencyId}, ${blob.url})
    ON CONFLICT (agency_id) DO UPDATE
    SET logo_url = ${blob.url}, updated_at = now()
    RETURNING logo_url
  `
  return NextResponse.json({ logo_url: rows[0].logo_url })
}
