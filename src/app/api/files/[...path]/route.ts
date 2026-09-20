import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { get } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { hrefForPath } from '@/lib/blob-files'

export const dynamic = 'force-dynamic'

/* GET /api/files/<caminho do arquivo> — única porta de saída dos arquivos
   privados do Flow (13/09/2026). Exige sessão; o arquivo em si é privado no
   armazenamento e não tem URL pública.

   Estar logado não basta pra tudo. O caminho não diz de quem é o arquivo,
   então a dona da verdade é a linha do banco que o referencia:
   - audio/      → voz de um TD: quem gravou, ou admin.
   - materials/  → pode ser acervo privado de agência: só quem a consulta de
                   materiais já deixaria ver (rede toda, ou a mesma agência).
   - partnership-content/, knowledge/, reviews-docs/ → conteúdo da própria
                   rede: qualquer pessoa logada.
   Foto de hotel, logo e avatar continuam públicos e não passam por aqui. */
const NETWORK_PREFIXES = ['partnership-content/', 'knowledge/', 'reviews-docs/']
const OWNER_PREFIX = 'audio/'
const AGENCY_PREFIX = 'materials/'

async function isAdmin(email: string): Promise<boolean> {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return rows[0]?.role === 'admin'
}

async function mayRead(pathname: string, email: string): Promise<boolean> {
  if (NETWORK_PREFIXES.some(p => pathname.startsWith(p))) return true

  const href = hrefForPath(pathname)
  if (pathname.startsWith(OWNER_PREFIX)) {
    if (await isAdmin(email)) return true
    const { rows } = await sql`
      SELECT a.audio_url FROM tdg_audio_inputs a
      JOIN tdg_users u ON u.id = a.agent_id
      WHERE a.audio_url = ${href} AND u.email = ${email}
      LIMIT 1
    `
    return rows.length > 0
  }
  if (pathname.startsWith(AGENCY_PREFIX)) {
    if (await isAdmin(email)) return true
    const { rows } = await sql`
      SELECT m.file_url FROM tdg_materials m
      WHERE m.file_url = ${href}
        AND (m.agency_id IS NULL OR m.agency_id = (SELECT agency_id FROM tdg_users WHERE email = ${email} LIMIT 1))
      LIMIT 1
    `
    return rows.length > 0
  }
  return false
}

function isServedHere(pathname: string): boolean {
  return [...NETWORK_PREFIXES, OWNER_PREFIX, AGENCY_PREFIX].some(p => pathname.startsWith(p))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // O Next já entrega os pedaços do caminho decodificados — decodificar de
  // novo quebraria nome com % (ex.: "relatório 50%.pdf").
  const { path } = await params
  const pathname = (path ?? []).join('/')
  // Caminho vazio ou com ".." não chega no armazenamento.
  if (!pathname || pathname.split('/').some(part => part === '..' || part === '')) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
  }
  if (!isServedHere(pathname)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

  if (!(await mayRead(pathname, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }
    return new NextResponse(result.stream, {
      headers: {
        'content-type': result.blob.contentType || 'application/octet-stream',
        'content-disposition': result.blob.contentDisposition || 'inline',
        // Arquivo privado nunca em cache compartilhado.
        'cache-control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[files] falha ao ler arquivo:', err)
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }
}
