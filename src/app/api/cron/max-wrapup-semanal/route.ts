import { NextRequest, NextResponse } from 'next/server'
import { networkEventsOnDays, todayBr, addDays } from '@/lib/events-db'
import { buildWeeklyDigest } from '@/lib/weekly-digest'
import { weeklyWrapupMessage, postToGroup } from '@/lib/max/broadcast'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* Wrap-up de domingo no grupo — 9h de Brasília (12:00 UTC, vercel.json):
   agenda de segunda a domingo + o que a rede registrou nos últimos 7 dias
   (mesmo buildWeeklyDigest do e-mail semanal). Sempre posta, mesmo sem
   evento — é o ritual da semana. */
export async function GET(req: NextRequest) {
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const today = todayBr()
  const weekStart = addDays(today, 1), weekEndExclusive = addDays(today, 8)
  const [events, digest] = await Promise.all([
    networkEventsOnDays(weekStart, weekEndExclusive),
    buildWeeklyDigest().catch(err => { console.warn('[max] digest indisponível no wrap-up', { error: err instanceof Error ? err.message : String(err) }); return null }),
  ])
  const text = weeklyWrapupMessage({ weekStart: `${weekStart}T12:00:00-03:00`, weekEnd: `${addDays(today, 7)}T12:00:00-03:00`, events, digest })
  const r = await postToGroup(text)
  if (!r.ok) console.warn('[max] wrap-up não postado', { error: r.error })
  return NextResponse.json({ sent: r.ok, week: [weekStart, addDays(today, 7)], events: events.length, ...(r.ok ? {} : { reason: r.error }) })
}
