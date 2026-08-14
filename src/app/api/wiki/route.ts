import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS tdg_wiki_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    meeting_date DATE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`
}

/* ── GET — lista todas as páginas do wiki, agrupáveis por categoria no
   client. Dataset pequeno (guias + atas) — traz tudo de uma vez, sem round
   trip extra ao trocar de página (Clickless Navigation). ────────────── */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  const { rows } = await sql`
    SELECT id, category, title, content, meeting_date, order_index, updated_at
    FROM tdg_wiki_pages
    ORDER BY category ASC, order_index ASC, meeting_date DESC NULLS LAST
  `

  return NextResponse.json({ pages: rows })
}
