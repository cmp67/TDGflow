import { describe, it, expect } from 'vitest'
import { wrapupCardModel, cardHeight, signCard, verifyCard } from './wrapup-card'

const base = {
  issueNumber: 10, reviewCount: 3, reviewsByAgency: [{ agency_name: 'A', count: 1 }, { agency_name: 'B', count: 2 }],
  recentReviews: [
    { hotel_name: 'Telegraph', agent_name: 'Carol Cordeiro', agency_name: 'CC Viagens', country: 'Georgia', source: null },
    { hotel_name: 'Octant', agent_name: 'Guilherme', agency_name: 'Team', country: 'Portugal', source: 'max_whatsapp' },
  ],
  openDiscoveries: 0, importedCount: 247, upcomingEvents: [{ id: 'e1', line: '*Festa 5 anos TDG* — qui 22/10 · 19h' }],
  featuredReview: { hotel_name: 'Telegraph', country: 'Georgia', agent_name: 'Carol Cordeiro', photo_url: 'https://x/y.jpg', heads_up: 'Quartos de entrada apertados', overall_rating: 3 },
  networkInsight: null, changelog: [{ title: 'Agenda da rede', description: 'x' }, { title: 'Max no Flow', description: null }],
}

describe('cartão do wrap-up (imagem pro grupo, 19/10/2026)', () => {
  it('só traz seções com conteúdo bom, na ordem do e-mail', () => {
    const m = wrapupCardModel(base)
    expect(m.sections.map(s => s.kind)).toEqual(['stats', 'people', 'featured', 'agenda', 'news', 'max'])
    expect(m.issue).toBe(10)
  })
  it('semana sem nada bom vira null (silêncio)', () => {
    expect(wrapupCardModel({ ...base, reviewCount: 0, recentReviews: [], importedCount: 0, upcomingEvents: [], featuredReview: null, changelog: [] })).toBeNull()
  })
  it('agenda sai sem os asteriscos do WhatsApp', () => {
    const agenda = wrapupCardModel(base)!.sections.find(s => s.kind === 'agenda')!
    expect(agenda.kind === 'agenda' && agenda.lines[0]).toBe('Festa 5 anos TDG — qui 22/10 · 19h')
  })
  it('altura cresce com o conteúdo e tem piso', () => {
    const full = cardHeight(wrapupCardModel(base)!)
    const small = cardHeight(wrapupCardModel({ ...base, recentReviews: [], featuredReview: null, changelog: [], upcomingEvents: [] })!)
    expect(full).toBeGreaterThan(small)
    expect(small).toBeGreaterThanOrEqual(1080)
  })
  it('assinatura do link: só abre com a chave certa', () => {
    const t = signCard('2026-10-26', 'segredo')
    expect(verifyCard('2026-10-26', t, 'segredo')).toBe(true)
    expect(verifyCard('2026-10-27', t, 'segredo')).toBe(false)
    expect(verifyCard('2026-10-26', t, 'outro')).toBe(false)
    expect(verifyCard('2026-10-26', '', 'segredo')).toBe(false)
  })
})
