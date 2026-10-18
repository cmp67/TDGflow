/* Postagens do Max no grupo sem ser marcado (decisão da Carla 18/10/2026):
   agenda de amanhã (diária, só quando há evento) e wrap-up de domingo
   (agenda da semana + o que a rede registrou). Grupo = MAX_GROUP_JID. */
import { readUazapiConfig, sendWhatsAppText } from '@/lib/max/transport'
import { agendaMessage, brDate, type EventRow } from '@/lib/events'
import type { WeeklyDigest } from '@/lib/weekly-digest'

type Ev = Parameters<typeof agendaMessage>[1][number]

export function tomorrowMessage(events: Ev[], tomorrowDay: string): string | null {
  const [y, m, d] = tomorrowDay.split('-')
  return agendaMessage(`Agenda de amanhã, ${d}/${m}/${y}`, events, null)
}

export function weeklyWrapupMessage(input: { weekStart: string; weekEnd: string; events: Ev[]; digest: Pick<WeeklyDigest, 'reviewCount' | 'reviewsByAgency' | 'recentReviews' | 'openDiscoveries' | 'importedCount' | 'activeOfferHotels' | 'expiringOfferHotels' | 'networkInsight'> | null }): string {
  const lines: string[] = [`*Wrap-up da semana — TDG Flow*`]
  const agenda = agendaMessage(`Agenda de ${brDate(input.weekStart)} a ${brDate(input.weekEnd)}`, input.events, null)
  lines.push(agenda ?? '*Agenda da semana*\nNada marcado ainda. Anote no Flow ou me marque com a data.')
  const d = input.digest
  if (d) {
    const parts: string[] = []
    if (d.reviewCount > 0) {
      const top = d.reviewsByAgency.slice(0, 3).map(a => `${a.agency_name} (${a.count})`).join(', ')
      parts.push(`${d.reviewCount} ${d.reviewCount === 1 ? 'dica registrada' : 'dicas registradas'}${top ? ` — ${top}` : ''}`)
      const hotels = Array.from(new Set(d.recentReviews.map(r => r.hotel_name))).slice(0, 5)
      if (hotels.length) parts.push(`Fornecedores: ${hotels.join(', ')}`)
    } else {
      parts.push('Nenhuma dica nova esta semana — quem viajou, me marca que eu registro.')
    }
    if ((d.importedCount ?? 0) > 0) parts.push(`${d.importedCount} relatos antigos do grupo entraram no Flow com o nome de quem falou — confirme os seus em Na prática`)
    if (d.openDiscoveries > 0) parts.push(`${d.openDiscoveries} fornecedor${d.openDiscoveries > 1 ? 'es' : ''} aguardando teste`)
    if (d.networkInsight?.type === 'consensus') parts.push(`Consenso: *${d.networkInsight.hotel_name}* tem relatos de ${d.networkInsight.agencyCount} consultoras`)
    if (d.expiringOfferHotels.length) parts.push(`Ofertas vencendo: ${d.expiringOfferHotels.slice(0, 4).join(', ')}`)
    else if (d.activeOfferHotels.length) parts.push(`Ofertas ativas: ${d.activeOfferHotels.slice(0, 4).join(', ')}`)
    lines.push(`*Na prática, esta semana*\n${parts.map(p => `- ${p}`).join('\n')}`)
  }
  lines.push('Agenda completa e dicas: /flow/agenda · /flow/dicas')
  return lines.join('\n\n')
}

export async function postToGroup(text: string, env: Record<string, string | undefined> = process.env): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const config = readUazapiConfig(env)
  const groupJid = (env.MAX_GROUP_JID ?? '').trim()
  if (!config) return { ok: false, error: 'uazapi não configurada' }
  if (!groupJid) return { ok: false, error: 'MAX_GROUP_JID não configurado' }
  return sendWhatsAppText(config, { chatId: groupJid, text, dedupeKey: `max-broadcast:${Date.now()}` })
}

export type { EventRow }
