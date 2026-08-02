import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { put, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getAgencyId } from '@/lib/agency'

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
  agency_id: string | null
  is_private: boolean
}

async function isAdmin(email: string): Promise<boolean> {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return rows[0]?.role === 'admin'
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getAgencyId(session.user.email)

  // agency_id — acervo privado por agência (migration 021): NULL continua
  // sendo material compartilhado com a rede toda (comportamento de sempre);
  // preenchido só aparece pra quem é da mesma agência.
  await sql`ALTER TABLE tdg_materials ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id)`

  const { rows } = await sql<MaterialRow>`
    SELECT id, category, title, description, kind, file_url, link_url, source_note, created_by, created_at,
           agency_id, (agency_id IS NOT NULL) AS is_private
    FROM tdg_materials
    WHERE agency_id IS NULL OR agency_id = ${agencyId}::uuid
    ORDER BY category, created_at DESC
  `
  return NextResponse.json({ materials: rows })
}

// POST — qualquer agente autenticado da rede pode contribuir (mesmo espírito
// de "Na prática": qualquer um adiciona, não é conteúdo fechado do admin).
// Aceita multipart/form-data pra cobrir os dois casos (arquivo OU link) com
// um único endpoint: manda "file" pra upload, ou "link_url" pra material
// tipo link (vídeo de treinamento, pasta de terceiro com atribuição etc.)
//
// visibility — acervo privado por agência (migration 021): "rede" (default,
// preserva o comportamento de sempre) publica pra rede toda; "privado" grava
// agency_id do usuário logado, só a própria agência enxerga.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const category = formData.get('category') as string | null
  const title = (formData.get('title') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null
  const sourceNote = (formData.get('source_note') as string | null)?.trim() || null
  const linkUrl = (formData.get('link_url') as string | null)?.trim() || null
  const file = formData.get('file') as File | null
  const visibility = (formData.get('visibility') as string | null) || 'rede'

  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  if (!category || !CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
  }
  if (!file && !linkUrl) return NextResponse.json({ error: 'Envie um arquivo ou um link' }, { status: 400 })
  if (file && linkUrl) return NextResponse.json({ error: 'Escolha arquivo OU link, não os dois' }, { status: 400 })
  if (file && file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande — o limite é 20MB' }, { status: 400 })
  }
  if (visibility !== 'rede' && visibility !== 'privado') {
    return NextResponse.json({ error: 'Visibilidade inválida' }, { status: 400 })
  }

  let agencyId: string | null = null
  if (visibility === 'privado') {
    agencyId = await getAgencyId(session.user.email)
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Sua conta não tem agência atribuída — não é possível criar um material privado.' },
        { status: 400 }
      )
    }
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

  await sql`ALTER TABLE tdg_materials ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id)`

  const { rows } = await sql<MaterialRow>`
    INSERT INTO tdg_materials (category, title, description, kind, file_url, link_url, source_note, created_by, agency_id)
    VALUES (${category}, ${title}, ${description}, ${file ? 'file' : 'link'}, ${fileUrl}, ${linkUrl}, ${sourceNote}, ${session.user.email}, ${agencyId})
    RETURNING id, category, title, description, kind, file_url, link_url, source_note, created_by, created_at, agency_id, (agency_id IS NOT NULL) AS is_private
  `
  return NextResponse.json({ material: rows[0] }, { status: 201 })
}

// DELETE — quem criou o material pode remover o próprio; admin remove
// qualquer um. Todos podem contribuir, mas não todos podem apagar o que
// outro colega adicionou.
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const { rows: existing } = await sql<{ created_by: string }>`SELECT created_by FROM tdg_materials WHERE id = ${id}`
  if (existing.length === 0) return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })

  const isOwner = existing[0].created_by === session.user.email
  if (!isOwner && !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows } = await sql<{ file_url: string | null }>`
    DELETE FROM tdg_materials WHERE id = ${id} RETURNING file_url
  `

  if (rows[0].file_url) {
    await del(rows[0].file_url).catch(() => {}) // blob órfão não deve travar a exclusão do registro
  }

  return NextResponse.json({ ok: true })
}
