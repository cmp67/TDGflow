import { NextRequest, NextResponse } from 'next/server'
import { networkEventsOnDays, todayBr, addDays } from '@/lib/events-db'
import { tomorrowMessage, postToGroup } from '@/lib/max/broadcast'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/* Agenda de amanhã no grupo — todo dia 18h de Brasília (21:00 UTC,
   vercel.json). Dia sem evento = silêncio. Mesma proteção dos outros crons. */
export async function GET(req: NextRequest) {
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tomorrow = addDays(todayBr(), 1)
  const events = await networkEventsOnDays(tomorrow, addDays(tomorrow, 1))
  const text = tomorrowMessage(events, tomorrow)
  if (!text) return NextResponse.json({ sent: false, reason: 'sem evento amanhã', day: tomorrow })
  const r = await postToGroup(text)
  if (!r.ok) console.warn('[max] agenda de amanhã não postada', { error: r.error })
  return NextResponse.json({ sent: r.ok, day: tomorrow, events: events.length, ...(r.ok ? {} : { reason: r.error }) })
}
