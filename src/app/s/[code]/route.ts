import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rota pública deliberada — redireciona, não expõe dado nenhum. O destino
// (sempre /flow/...) passa pelo middleware normalmente e exige login de
// qualquer forma; um desconhecido com o link curto só chega até a tela de
// login, igual chegaria com o link longo.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { rows } = await sql`SELECT target_path FROM tdg_short_links WHERE code = ${code}`
  const target = rows[0]?.target_path ?? '/flow'
  return NextResponse.redirect(new URL(target, req.url))
}
