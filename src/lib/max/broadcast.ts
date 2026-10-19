/* Postagens do Max no grupo sem ser marcado (decisão da Carla 18/10/2026):
   agenda de amanhã (diária, só quando há evento) e wrap-up de domingo
   (agenda da semana + o que a rede registrou). Grupo = MAX_GROUP_JID. */
import { readUazapiConfig, sendWhatsAppText, sendWhatsAppImage } from '@/lib/max/transport'
import { agendaMessage, brDate, type EventRow } from '@/lib/events'
import type { WeeklyDigest } from '@/lib/weekly-digest'

type Ev = Parameters<typeof agendaMessage>[1][number]

export function tomorrowMessage(events: Ev[], tomorrowDay: string): string | null {
  const [y, m, d] = tomorrowDay.split('-')
  return agendaMessage(`Agenda de amanhã, ${d}/${m}/${y}`, events, null)
}

/* Wrap-up: só o que aconteceu de bom (Carla, 19/10/2026). Seção sem
   conteúdo não aparece — nunca "nenhuma dica", "nada marcado". */
export function weeklyWrapupMessage(input: { weekStart: string; weekEnd: string; events: Ev[]; digest: Pick<WeeklyDigest, 'reviewCount' | 'reviewsByAgency' | 'recentReviews' | 'openDiscoveries' | 'importedCount' | 'activeOfferHotels' | 'expiringOfferHotels' | 'networkInsight'> & { changelog?: WeeklyDigest['changelog'] } | null }): string | null {
  const blocks: string[] = []
  const agenda = agendaMessage(`Agenda de ${brDate(input.weekStart)} a ${brDate(input.weekEnd)}`, input.events, null)
  if (agenda) blocks.push(agenda)
  const d = input.digest
  if (d) {
    const parts: string[] = []
    if (d.reviewCount > 0) {
      const hotels = Array.from(new Set(d.recentReviews.map(r => `*${r.hotel_name}* (${r.agent_name})`))).slice(0, 5)
      parts.push(`${d.reviewCount} ${d.reviewCount === 1 ? 'relato novo' : 'relatos novos'}${hotels.length ? `: ${hotels.join(', ')}` : ''}`)
    }
    if ((d.importedCount ?? 0) > 0) parts.push(`${d.importedCount} relatos do grupo entraram no Flow, com o nome de quem falou — confirme os seus em Na prática`)
    if (d.openDiscoveries > 0) parts.push(`${d.openDiscoveries} ${d.openDiscoveries > 1 ? 'fornecedores novos' : 'fornecedor novo'} para testar`)
    if (d.networkInsight?.type === 'consensus') parts.push(`Consenso: *${d.networkInsight.hotel_name}* tem relatos de ${d.networkInsight.agencyCount} consultoras`)
    if (d.expiringOfferHotels.length) parts.push(`Ofertas vencendo: ${d.expiringOfferHotels.slice(0, 4).join(', ')}`)
    else if (d.activeOfferHotels.length) parts.push(`Ofertas ativas: ${d.activeOfferHotels.slice(0, 4).join(', ')}`)
    if (parts.length) blocks.push(`*Na prática, esta semana*\n${parts.map(p => `- ${p}`).join('\n')}`)
    const news = (d.changelog ?? []).slice(0, 6)
    if (news.length) blocks.push(`*Novidades no Flow e no Max*\n${news.map(c => `- ${c.title}`).join('\n')}`)
  }
  if (!blocks.length) return null
  return [`*Wrap-up da semana — TDG Flow*`, ...blocks, 'Agenda e dicas no Flow: /flow/agenda · /flow/dicas'].join('\n\n')
}

export async function postToGroup(text: string, env: Record<string, string | undefined> = process.env): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const config = readUazapiConfig(env)
  const groupJid = (env.MAX_GROUP_JID ?? '').trim()
  if (!config) return { ok: false, error: 'uazapi não configurada' }
  if (!groupJid) return { ok: false, error: 'MAX_GROUP_JID não configurado' }
  return sendWhatsAppText(config, { chatId: groupJid, text, dedupeKey: `max-broadcast:${Date.now()}` })
}

/* Arte do wrap-up no grupo; quem chama decide o fallback em texto. */
export async function postImageToGroup(imageUrl: string, caption: string, env: Record<string, string | undefined> = process.env): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const config = readUazapiConfig(env)
  const groupJid = (env.MAX_GROUP_JID ?? '').trim()
  if (!config) return { ok: false, error: 'uazapi não configurada' }
  if (!groupJid) return { ok: false, error: 'MAX_GROUP_JID não configurado' }
  return sendWhatsAppImage(config, { chatId: groupJid, imageUrl, caption, dedupeKey: `max-wrapup-card:${Date.now()}` })
}

export type { EventRow }
