import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { put, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 20 * 1024 * 1024 // 20MB — contratos/formulários em PDF, sem vídeo (vídeo é sempre link)

const CATEGORIES = ['contrato_acordo', 'formulario', 'treinamento', 'outro'] as const
type Category = (typeof CATEGORIES)[number]

export interface MaterialRow {
  id: string
  category: Category
  title: string
  description: string | null
  kind: 'file' | 'link'
  file_url: string | null
  link_url: string | null
  source_note: string | null
  created_by: string
  created_at: string
}

async function isAdmin(email: string): Promise<boolean> {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return rows[0]?.role === 'admin'
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await sql<MaterialRow>`
    SELECT id, category, title, description, kind, file_url, link_url, source_note, created_by, created_at
    FROM tdg_materials
    ORDER BY category, created_at DESC
  `
  return NextResponse.json({ materials: rows })
}

// POST — só admin da rede. Aceita multipart/form-data pra cobrir os dois
// casos (arquivo OU link) com um único endpoint: manda "file" pra upload,
// ou "link_url" pra material tipo link (vídeo de treinamento, pasta de
// terceiro com atribuição etc.)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const category = formData.get('category') as string | null
  const title = (formData.get('title') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null
  const sourceNote = (formData.get('source_note') as string | null)?.trim() || null
  const linkUrl = (formData.get('link_url') as string | null)?.trim() || null
  const file = formData.get('file') as File | null

  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  if (!category || !CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
  }
  if (!file && !linkUrl) return NextResponse.json({ error: 'Envie um arquivo ou um link' }, { status: 400 })
  if (file && linkUrl) return NextResponse.json({ error: 'Escolha arquivo OU link, não os dois' }, { status: 400 })
  if (file && file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande — o limite é 20MB' }, { status: 400 })
  }

  let fileUrl: string | null = null
  if (file) {
    const blob = await put(
      `materials/${category}-${Date.now()}.${file.name.split('.').pop() ?? 'pdf'}`,
      file,
      { access: 'public', addRandomSuffix: false }
    )
    fileUrl = blob.url
  }

  const { rows } = await sql<MaterialRow>`
    INSERT INTO tdg_materials (category, title, description, kind, file_url, link_url, source_note, created_by)
    VALUES (${category}, ${title}, ${description}, ${file ? 'file' : 'link'}, ${fileUrl}, ${linkUrl}, ${sourceNote}, ${session.user.email})
    RETURNING id, category, title, description, kind, file_url, link_url, source_note, created_by, created_at
  `
  return NextResponse.json({ material: rows[0] }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const { rows } = await sql<{ file_url: string | null }>`
    DELETE FROM tdg_materials WHERE id = ${id} RETURNING file_url
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })

  if (rows[0].file_url) {
    await del(rows[0].file_url).catch(() => {}) // blob órfão não deve travar a exclusão do registro
  }

  return NextResponse.json({ ok: true })
}
