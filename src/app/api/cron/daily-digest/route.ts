import { NextRequest, NextResponse } from 'next/server'
import { buildDailyDigest, generateDailyInsights } from '@/lib/daily-digest'
import { sendDailyDigestEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Relatório diário — pedido da Carla, 16/08: todo dia às 19h BRT, só pra
// ela (nunca vai pra rede — é operacional, não editorial). Mesma proteção
// dos outros crons (Bearer CRON_SECRET).
const RECIPIENT = 'carla@bemgsy.com'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const digest = await buildDailyDigest()
  const insights = await generateDailyInsights(digest)
  await sendDailyDigestEmail(RECIPIENT, digest, insights)

  return NextResponse.json({ sent_to: RECIPIENT, period: { start: digest.periodStart, end: digest.periodEnd } })
}
