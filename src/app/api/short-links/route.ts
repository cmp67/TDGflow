import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function generateCode(): string {
  return randomBytes(5).toString('base64url') // ~7 chars, URL-safe
}

// POST — cria ou reaproveita um link curto pro mesmo target_path (idempotente:
// mesmo item sempre copia o mesmo link, não acumula um código novo por clique).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { path, label } = await req.json()
  if (!path || typeof path !== 'string' || !path.startsWith('/')) {
    return NextResponse.json({ error: 'path inválido' }, { status: 400 })
  }

  const { rows: existing } = await sql`
    SELECT code FROM tdg_short_links WHERE target_path = ${path} LIMIT 1
  `
  if (existing[0]) {
    return NextResponse.json({ code: existing[0].code })
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode()
    try {
      await sql`
        INSERT INTO tdg_short_links (code, target_path, label, created_by)
        VALUES (${code}, ${path}, ${label ?? null}, ${session.user.email})
      `
      return NextResponse.json({ code })
    } catch {
      // colisão de código improvável (62^7 combinações) — tenta de novo
      continue
    }
  }

  return NextResponse.json({ error: 'Não foi possível gerar o link curto' }, { status: 500 })
}
