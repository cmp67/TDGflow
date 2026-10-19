import { NextRequest, NextResponse } from 'next/server'
import { networkEventsOnDays, todayBr, addDays } from '@/lib/events-db'
import { buildWeeklyDigest } from '@/lib/weekly-digest'
import { weeklyWrapupMessage, postToGroup, postImageToGroup } from '@/lib/max/broadcast'
import { wrapupCardModel, signCard } from '@/lib/max/wrapup-card'
import { maxHowToWhatsApp } from '@/lib/max/how-to'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* Wrap-up de domingo no grupo — 21h de Brasília (00:00 UTC de segunda,
   vercel.json; decisão da Carla 18/10/2026). todayBr() ainda é domingo:
   agenda de segunda a domingo + o que a rede registrou nos últimos 7 dias
   (mesmo buildWeeklyDigest do e-mail semanal). Só o que tem de bom; semana
   sem novidade = silêncio (Carla, 19/10/2026). */
const APP_URL = 'https://traveldesignersgroup.com.br'
const CAPTION = `*Wrap-up da semana — TDG Flow*\n\n${maxHowToWhatsApp()}\n\nTudo no Flow: traveldesignersgroup.com.br/flow`

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
  if (!text) return NextResponse.json({ sent: false, reason: 'semana sem novidade — silêncio' })
  // Arte com a cara do e-mail (Carla, 19/10/2026); se a imagem falhar, vai o texto.
  const secret = (process.env.WRAPUP_CARD_SECRET ?? process.env.CRON_SECRET ?? '').trim()
  let r: Awaited<ReturnType<typeof postToGroup>> = { ok: false, error: 'sem arte' }
  let format = 'texto'
  if (digest && wrapupCardModel(digest) && secret) {
    const cardUrl = `${APP_URL}/api/wrapup/card?d=${today}&t=${signCard(today, secret)}`
    r = await postImageToGroup(cardUrl, CAPTION)
    if (r.ok) format = 'arte'
    else console.warn('[max] arte do wrap-up falhou, indo em texto', { error: r.error })
  }
  if (!r.ok) r = await postToGroup(text)
  if (!r.ok) console.warn('[max] wrap-up não postado', { error: r.error })
  return NextResponse.json({ sent: r.ok, format, week: [weekStart, addDays(today, 7)], events: events.length, ...(r.ok ? {} : { reason: r.error }) })
}
