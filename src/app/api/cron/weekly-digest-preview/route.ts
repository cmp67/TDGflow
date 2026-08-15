import { NextRequest, NextResponse } from 'next/server'
import { buildWeeklyDigest } from '@/lib/weekly-digest'
import { sendWeeklyDigestEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Pedido da Carla, 15/08: domingo 7h BRT, só pra ela — chance de revisar
// e pedir ajuste antes do envio real pra rede às 20h (cron separado,
// /api/cron/weekly-digest). Mesmo CRON_SECRET, mesma proteção.
const PREVIEW_RECIPIENT = 'carla@bemgsy.com'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const digest = await buildWeeklyDigest()
  await sendWeeklyDigestEmail(PREVIEW_RECIPIENT, 'Carla', digest)

  return NextResponse.json({ sent_to: PREVIEW_RECIPIENT, issue: digest.issueNumber })
}
