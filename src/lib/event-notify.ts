/* Aviso de convite da Agenda: e-mail (Resend) e WhatsApp (uazapi, do número do
   Max) pra cada convidado novo. Falha num canal não impede o outro nem o
   convite; cada envio bem-sucedido fica marcado em tdg_event_invites. */
import { APP_URL, sendEventInviteEmail } from '@/lib/email'
import { brDate, brTime, brWeekday, googleCalendarUrl, inviteText, type EventRow } from '@/lib/events'
import { markNotified, type Person } from '@/lib/events-db'
import { readUazapiConfig, sendWhatsAppText } from '@/lib/max/transport'

export function whenLabel(e: Pick<EventRow, 'starts_at' | 'ends_at' | 'all_day'>): string {
  const day = `${brWeekday(e.starts_at)} ${brDate(e.starts_at)}`
  return e.all_day ? day : `${day} · ${brTime(e.starts_at)}${e.ends_at ? ` às ${brTime(e.ends_at)}` : ''} (Brasília)`
}

export async function notifyInvitees(event: EventRow, people: Person[], inviterName: string): Promise<{ email: number; whatsapp: number }> {
  const uaz = readUazapiConfig(process.env)
  const eventUrl = `${APP_URL}/flow/agenda?event=${event.id}`
  const where = event.modality === 'online' ? 'Online' : event.location
  let email = 0, whatsapp = 0
  await Promise.all(people.map(async p => {
    try {
      const id = await sendEventInviteEmail(p.email, {
        inviterName, title: event.title, when: whenLabel(event), where, link: event.link, description: event.description,
        eventUrl, googleUrl: googleCalendarUrl(event, APP_URL), icsUrl: `${APP_URL}/api/events/${event.id}/ics`,
      })
      if (id) { await markNotified(event.id, p.id, 'email'); email++ }
    } catch (err) { console.warn('[agenda] e-mail de convite falhou', { event: event.id.slice(0, 8), error: err instanceof Error ? err.message : String(err) }) }
    const digits = (p.whatsapp ?? '').replace(/\D/g, '')
    if (uaz && digits.length >= 10) {
      const r = await sendWhatsAppText(uaz, { chatId: `${digits}@s.whatsapp.net`, text: inviteText(event, inviterName, APP_URL), dedupeKey: `invite:${event.id}:${p.id}` })
      if (r.ok) { await markNotified(event.id, p.id, 'whatsapp'); whatsapp++ }
      else console.warn('[agenda] WhatsApp de convite falhou', { event: event.id.slice(0, 8), error: r.error })
    }
  }))
  return { email, whatsapp }
}
