import { sql } from '@vercel/postgres'
import { getOffers } from '@/lib/offers'

export interface WeeklyDigest {
  periodStart: string
  periodEnd: string
  reviewCount: number
  reviewsByAgency: { agency_name: string; count: number }[]
  recentReviews: { hotel_name: string; agent_name: string; agency_name: string; country: string | null }[]
  openDiscoveries: number
  featuredReview: { hotel_name: string; country: string | null; agent_name: string; photo_url: string | null; heads_up: string | null; overall_rating: number | null } | null
  newOffers: { hotel_name: string; commission: number; offer_type: string | null }[]
  expiringOffers: { hotel_name: string; valid_until: string | null; commission: number }[]
  activeOffers: { hotel_name: string; commission: number; valid_until: string | null }[]
  newGuides: { title: string }[]
  changelog: { title: string; description: string | null }[]
}

/* Ensure tdg_changelog exists — idempotente, mesmo padrão do resto do
   projeto (migration inline no primeiro uso, não script separado). */
async function ensureChangelogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_changelog (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      released_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

/* Monta o resumo semanal — janela rolante de 7 dias, não "desde segunda".
   Usado tanto pelo cron de envio quanto (futuramente) por uma prévia
   manual, então fica isolado da lógica de e-mail/envio. */
export async function buildWeeklyDigest(): Promise<WeeklyDigest> {
  await ensureChangelogTable()

  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Exclui fixtures de teste (agency_name/agent_name 'TDD' ou prefixo
  // __TDD_ — mesmo padrão de contaminação já visto no billing) — achado
  // ao revisar o preview, 14/08: rodar vitest local grava linha real na
  // mesma tabela de produção, e uma vazou pro digest sem esse filtro.
  const { rows: reviews } = await sql`
    SELECT hotel_name, agent_name, agency_name, country, status, overall_rating, photo_url, heads_up, created_at
    FROM tdg_hotel_reviews
    WHERE created_at >= ${periodStart.toISOString()}
      AND agency_name IS DISTINCT FROM 'TDD' AND agent_name IS DISTINCT FROM 'TDD'
      AND agency_name NOT ILIKE '\_\_TDD\_%' ESCAPE '\'
    ORDER BY created_at DESC
  `

  const published = reviews.filter(r => r.status === 'published')
  const discoveries = reviews.filter(r => r.status === 'a_testar')

  const agencyCounts = new Map<string, number>()
  for (const r of reviews) {
    if (!r.agency_name) continue
    agencyCounts.set(r.agency_name, (agencyCounts.get(r.agency_name) ?? 0) + 1)
  }
  const reviewsByAgency = [...agencyCounts.entries()]
    .map(([agency_name, count]) => ({ agency_name, count }))
    .sort((a, b) => b.count - a.count)

  const featuredCandidate = published
    .filter(r => r.photo_url)
    .sort((a, b) => (b.overall_rating ?? 0) - (a.overall_rating ?? 0))[0]

  const { rows: guides } = await sql`
    SELECT title FROM tdg_wiki_pages
    WHERE category = 'guia' AND updated_at >= ${periodStart.toISOString()}
    ORDER BY updated_at DESC
  `

  const { rows: changelog } = await sql`
    SELECT title, description FROM tdg_changelog
    WHERE released_at >= ${periodStart.toISOString()}
    ORDER BY released_at DESC
  `

  // Achado da Carla, 15/08: com só um punhado de ofertas ativas na rede
  // (curadoria manual, não muda toda semana) e horizontes de validade de
  // meses, uma janela de "vencendo em 7 dias" fica vazia quase sempre —
  // a seção sumia mesmo com ofertas de verdade disponíveis. Amplia
  // "vencendo em breve" pra 60 dias e adiciona um fallback: se não há
  // nada novo nem vencendo, mostra as ofertas ativas mesmo assim — a
  // seção nunca desaparece silenciosamente enquanto existir oferta.
  const offers = await getOffers()
  const newOffers = offers.filter(o => o.curated_at && new Date(o.curated_at) >= periodStart)
  const soon = new Date(periodEnd.getTime() + 60 * 24 * 60 * 60 * 1000)
  const expiringOffers = offers.filter(o => o.valid_until && new Date(o.valid_until) <= soon && new Date(o.valid_until) >= periodEnd)
  const activeOffers = (newOffers.length === 0 && expiringOffers.length === 0)
    ? [...offers]
        .sort((a, b) => (a.valid_until ? new Date(a.valid_until).getTime() : Infinity) - (b.valid_until ? new Date(b.valid_until).getTime() : Infinity))
        .slice(0, 5)
    : []

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    reviewCount: reviews.length,
    reviewsByAgency,
    recentReviews: published.slice(0, 8).map(r => ({
      hotel_name: r.hotel_name as string, agent_name: r.agent_name as string,
      agency_name: r.agency_name as string, country: r.country as string | null,
    })),
    openDiscoveries: discoveries.length,
    featuredReview: featuredCandidate ? {
      hotel_name: featuredCandidate.hotel_name as string, country: featuredCandidate.country as string | null,
      agent_name: featuredCandidate.agent_name as string, photo_url: featuredCandidate.photo_url as string | null,
      heads_up: featuredCandidate.heads_up as string | null, overall_rating: featuredCandidate.overall_rating as number | null,
    } : null,
    newOffers: newOffers.map(o => ({ hotel_name: o.hotel_name, commission: o.commission, offer_type: o.offer_type })),
    expiringOffers: expiringOffers.map(o => ({ hotel_name: o.hotel_name, valid_until: o.valid_until, commission: o.commission })),
    activeOffers: activeOffers.map(o => ({ hotel_name: o.hotel_name, commission: o.commission, valid_until: o.valid_until })),
    newGuides: guides.map(g => ({ title: g.title as string })),
    changelog: changelog.map(c => ({ title: c.title as string, description: c.description as string | null })),
  }
}
