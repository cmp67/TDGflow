import { describe, it, expect, vi } from 'vitest'
import { tomorrowMessage, weeklyWrapupMessage, postToGroup } from './broadcast'

const ev = { title: 'Treinamento Six Senses', type: 'treinamento' as const, starts_at: '2026-10-28T18:00:00.000Z', all_day: false, modality: 'online' as const, location: null, link: 'https://meet.google.com/x', rsvp_vou: 2 }

describe('mensagens do Max no grupo', () => {
  it('agenda de amanhã: null sem evento (silêncio), senão título com a data', () => {
    expect(tomorrowMessage([], '2026-10-28')).toBeNull()
    const t = tomorrowMessage([ev], '2026-10-28')!
    expect(t).toContain('*Agenda de amanhã, 28/10/2026*')
    expect(t).toContain('qua 28/10 · 15:00 — *Treinamento Six Senses* (online) · 2 confirmadas')
  })
  it('wrap-up: agenda da semana + resumo do digest; sem digest e sem evento ainda posta', () => {
    const d = { reviewCount: 3, reviewsByAgency: [{ agency_name: 'Team Travel', count: 2 }], recentReviews: [{ hotel_name: 'Txai', agent_name: 'x', agency_name: 'y', country: null, source: null }], openDiscoveries: 1, importedCount: 0, activeOfferHotels: ['Six Senses Douro'], expiringOfferHotels: [], networkInsight: { type: 'consensus' as const, hotel_name: 'Vila Joya', agencyCount: 3, reviewCount: 4 } }
    const t = weeklyWrapupMessage({ weekStart: '2026-10-26T12:00:00-03:00', weekEnd: '2026-11-01T12:00:00-03:00', events: [ev], digest: d })!
    expect(t).toContain('*Wrap-up da semana — TDG Flow*')
    expect(t).not.toMatch(/nenhum|nada marcado/i)
    expect(t).toContain('Agenda de 26/10 a 01/11')
    expect(t).toContain('3 relatos novos: *Txai* (x)')
    expect(t).toContain('Consenso: *Vila Joya* tem relatos de 3 consultoras')
    expect(t).toContain('Ofertas ativas: Six Senses Douro')
    expect(t).not.toContain('**')
    expect(weeklyWrapupMessage({ weekStart: '2026-10-26T12:00:00-03:00', weekEnd: '2026-11-01T12:00:00-03:00', events: [], digest: null })).toBeNull()
    const quiet = weeklyWrapupMessage({ weekStart: '2026-10-26T12:00:00-03:00', weekEnd: '2026-11-01T12:00:00-03:00', events: [], digest: { ...d, reviewCount: 0, recentReviews: [], openDiscoveries: 0, networkInsight: null, activeOfferHotels: [], importedCount: 0 } })
    expect(quiet).toBeNull()
  })
  it('postToGroup falha sem uazapi ou sem JID do grupo, sem lançar', async () => {
    expect(await postToGroup('x', {})).toEqual({ ok: false, error: 'uazapi não configurada' })
    expect(await postToGroup('x', { UAZAPI_BASE_URL: 'https://a', UAZAPI_INSTANCE_TOKEN: 't' })).toEqual({ ok: false, error: 'MAX_GROUP_JID não configurado' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageid: 'M' }), { status: 200 })))
    expect(await postToGroup('x', { UAZAPI_BASE_URL: 'https://a', UAZAPI_INSTANCE_TOKEN: 't', MAX_GROUP_JID: '1203@g.us' })).toEqual({ ok: true, messageId: 'M' })
    vi.unstubAllGlobals()
  })
})
