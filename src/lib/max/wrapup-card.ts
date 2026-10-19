import { createHmac, timingSafeEqual } from 'node:crypto'
import type { WeeklyDigest } from '@/lib/weekly-digest'

/* Wrap-up em imagem pro grupo (Carla, 19/10/2026): "folhetim digital com a
   cara do e-mail". Este módulo decide O QUE entra (só o que é bom, seção
   vazia some) e a altura da arte; o desenho fica em /api/wrapup/card. */

export type CardSection =
  | { kind: 'stats'; reviews: number; agencies: number; imported: number }
  | { kind: 'people'; rows: { who: string; where: string }[] }
  | { kind: 'featured'; hotel: string; place: string; by: string; quote: string | null; photo: string | null; rating: number | null }
  | { kind: 'agenda'; lines: string[] }
  | { kind: 'news'; titles: string[] }

export type CardModel = { issue: number; sections: CardSection[] }

type DigestSlice = Pick<WeeklyDigest, 'issueNumber' | 'reviewCount' | 'reviewsByAgency' | 'recentReviews' | 'importedCount' | 'upcomingEvents' | 'featuredReview' | 'changelog'>

const MAX_PEOPLE = 4, MAX_AGENDA = 4, MAX_NEWS = 5

export function wrapupCardModel(d: DigestSlice): CardModel | null {
  const sections: CardSection[] = []
  if (d.reviewCount > 0 || d.importedCount > 0) {
    sections.push({ kind: 'stats', reviews: d.reviewCount, agencies: d.reviewsByAgency.length, imported: d.importedCount })
  }
  if (d.recentReviews.length) {
    sections.push({ kind: 'people', rows: d.recentReviews.slice(0, MAX_PEOPLE).map(r => ({ who: r.agent_name, where: [r.hotel_name, r.country].filter(Boolean).join(', ') })) })
  }
  const f = d.featuredReview
  if (f) sections.push({ kind: 'featured', hotel: f.hotel_name, place: f.country ?? '', by: f.agent_name, quote: f.heads_up, photo: f.photo_url, rating: f.overall_rating })
  if (d.upcomingEvents.length) sections.push({ kind: 'agenda', lines: d.upcomingEvents.slice(0, MAX_AGENDA).map(e => e.line.replace(/\*/g, '')) })
  if (d.changelog.length) sections.push({ kind: 'news', titles: d.changelog.slice(0, MAX_NEWS).map(c => c.title) })
  return sections.length ? { issue: d.issueNumber, sections } : null
}

/* Satori precisa de altura fixa: soma o que cada seção ocupa no desenho. */
const HEADER = 380, FOOTER = 210, SECTION_GAP = 110, TITLE = 62, LINE = 60
export function cardHeight(m: CardModel): number {
  const body = m.sections.reduce((h, s) => {
    const inner = s.kind === 'stats' ? 110 + (s.imported > 0 && s.reviews > 0 ? 50 : 0)
      : s.kind === 'people' ? s.rows.length * 100
      : s.kind === 'featured' ? (s.photo ? 430 : 0) + 110 + (s.quote ? 160 : 0)
      : s.kind === 'agenda' ? s.lines.length * 70
      : s.titles.length * LINE
    return h + SECTION_GAP + TITLE + inner
  }, 0)
  return Math.max(1080, Math.min(3200, HEADER + body + FOOTER))
}

/* Link assinado: a uazapi baixa a imagem por URL pública, então o endereço
   carrega um HMAC do dia — sem ele a arte (com nomes da rede) não abre. */
export function signCard(day: string, secret: string): string {
  return createHmac('sha256', secret).update(`wrapup-card:${day}`).digest('hex').slice(0, 32)
}

export function verifyCard(day: string, token: string, secret: string): boolean {
  if (!secret || !token) return false
  const a = Buffer.from(signCard(day, secret)), b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}
