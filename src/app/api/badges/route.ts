import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/* "Minhas conquistas" (decisão #21). Pioneira é fato permanente — sempre
   aparece. Voz do destino / referência em categoria são títulos atuais —
   só aparecem enquanto is_current = true (perdeu, some daqui, mas o
   histórico continua na tabela). */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows: userRows } = await sql`SELECT id FROM tdg_users WHERE email = ${session.user.email} LIMIT 1`
  const userId = userRows[0]?.id
  if (!userId) return NextResponse.json({ badges: [] })

  const { rows } = await sql`
    SELECT b.badge_type, b.context, b.hotel_id, b.earned_at::text AS earned_at, h.name AS hotel_name
    FROM tdg_badges b
    LEFT JOIN tdg_hotels h ON h.id = b.hotel_id
    WHERE b.user_id = ${userId} AND (b.is_current = true OR b.badge_type = 'pioneira')
    ORDER BY b.earned_at DESC
  `

  return NextResponse.json({ badges: rows })
}
