import { sql } from '@vercel/postgres'
import { randomBytes } from 'node:crypto'
import { getOffers } from '@/lib/offers'

// Primeira edição sai domingo 16/08/2026 — epoch fixo em vez de contador
// em banco, pra não depender de estado (idempotente mesmo se o cron
// rodar de novo por engano numa mesma semana).
const NEWSLETTER_EPOCH = new Date('2026-08-16T00:00:00Z')

function computeIssueNumber(now: Date): number {
  const weeksSinceEpoch = Math.floor((now.getTime() - NEWSLETTER_EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, weeksSinceEpoch + 1)
}

// Usado pelo cron de relatório (roda 1h depois do envio real) pra saber
// qual edição acabou de sair, sem precisar rebuildar o digest inteiro.
export function getCurrentIssueNumber(): number {
  return computeIssueNumber(new Date())
}

export interface WeeklyDigest {
  issueNumber: number
  periodStart: string
  periodEnd: string
  reviewCount: number
  reviewsByAgency: { agency_name: string; count: number }[]
  recentReviews: { hotel_name: string; agent_name: string; agency_name: string; country: string | null; source: string | null }[]
  openDiscoveries: number
  featuredReview: { hotel_name: string; country: string | null; agent_name: string; photo_url: string | null; heads_up: string | null; overall_rating: number | null } | null
  activeOfferHotels: string[]
  expiringOfferHotels: string[]
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
  await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS source TEXT`

  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Exclui fixtures de teste (agency_name/agent_name 'TDD' ou prefixo
  // __TDD_ — mesmo padrão de contaminação já visto no billing) — achado
  // ao revisar o preview, 14/08: rodar vitest local grava linha real na
  // mesma tabela de produção, e uma vazou pro digest sem esse filtro.
  const { rows: reviews } = await sql`
    SELECT hotel_name, agent_name, agency_name, country, status, overall_rating, photo_url, heads_up, created_at, source
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

  // Simplificado a pedido da Carla, 15/08: só dois campos — nomes dos
  // fornecedores com oferta ativa, e quais delas vencem em breve (60
  // dias — achado antes: 7 dias ficava vazio quase sempre, ofertas têm
  // curadoria manual esparsa e validade de meses). Dedup por fornecedor
  // — Bemgsy Central tem registro duplicado pra algumas ofertas (ex:
  // Velaa Private Island aparecia 4x idêntica).
  const rawOffers = await getOffers()
  const seenOfferHotels = new Set<string>()
  const offers = rawOffers.filter(o => {
    if (seenOfferHotels.has(o.hotel_name)) return false
    seenOfferHotels.add(o.hotel_name)
    return true
  })
  const soon = new Date(periodEnd.getTime() + 60 * 24 * 60 * 60 * 1000)
  const activeOfferHotels = offers.map(o => o.hotel_name)
  const expiringOfferHotels = offers
    .filter(o => o.valid_until && new Date(o.valid_until) <= soon && new Date(o.valid_until) >= periodEnd)
    .map(o => o.hotel_name)

  return {
    issueNumber: computeIssueNumber(periodEnd),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    reviewCount: reviews.length,
    reviewsByAgency,
    recentReviews: published.slice(0, 8).map(r => ({
      hotel_name: r.hotel_name as string, agent_name: r.agent_name as string,
      agency_name: r.agency_name as string, country: r.country as string | null,
      source: r.source as string | null,
    })),
    openDiscoveries: discoveries.length,
    featuredReview: featuredCandidate ? {
      hotel_name: featuredCandidate.hotel_name as string, country: featuredCandidate.country as string | null,
      agent_name: featuredCandidate.agent_name as string, photo_url: featuredCandidate.photo_url as string | null,
      heads_up: featuredCandidate.heads_up as string | null, overall_rating: featuredCandidate.overall_rating as number | null,
    } : null,
    activeOfferHotels,
    expiringOfferHotels,
    newGuides: guides.map(g => ({ title: g.title as string })),
    changelog: changelog.map(c => ({ title: c.title as string, description: c.description as string | null })),
  }
}

// ── Aprovação obrigatória (16/08) ────────────────────────────────────────
// Pedido da Carla: o disparo real pra rede (19h57 BRT) só sai depois que
// ela aprovar a edição, a partir da prévia que recebe às 7h. Uma linha por
// edição — token gerado na prévia, marcado quando ela clica no link do
// e-mail. FAIL-CLOSED: sem linha ou sem approved_at, o cron do disparo
// real pula o envio (ver /api/cron/weekly-digest).
async function ensureApprovalsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_digest_approvals (
      issue_number INTEGER PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

// Chamado pela prévia — cria o token na primeira vez que a prévia dessa
// edição é enviada, ou devolve o já existente (idempotente: se o cron de
// prévia rodar de novo, o link continua o mesmo, não invalida aprovação já
// dada).
export async function getOrCreateApprovalToken(issueNumber: number): Promise<string> {
  await ensureApprovalsTable()
  const token = randomBytes(32).toString('hex')
  const { rows } = await sql`
    INSERT INTO tdg_digest_approvals (issue_number, token)
    VALUES (${issueNumber}, ${token})
    ON CONFLICT (issue_number) DO UPDATE SET issue_number = EXCLUDED.issue_number
    RETURNING token
  `
  return rows[0].token as string
}

// Chamado pelo cron do disparo real antes de mandar qualquer coisa.
export async function isIssueApproved(issueNumber: number): Promise<boolean> {
  await ensureApprovalsTable()
  const { rows } = await sql`
    SELECT approved_at FROM tdg_digest_approvals WHERE issue_number = ${issueNumber}
  `
  return Boolean(rows[0]?.approved_at)
}

// Chamado pela rota pública /api/digest/approve — marca aprovado, idempotente
// (clicar 2x não faz diferença). Retorna o número da edição aprovada, ou
// null se o token não existir.
export async function approveIssueByToken(token: string): Promise<number | null> {
  await ensureApprovalsTable()
  const { rows } = await sql`
    UPDATE tdg_digest_approvals
    SET approved_at = COALESCE(approved_at, NOW())
    WHERE token = ${token}
    RETURNING issue_number
  `
  return rows[0] ? (rows[0].issue_number as number) : null
}

// ── Rastreio de envio (16/08) ────────────────────────────────────────────
// Uma linha por destinatário do disparo real, guardando o id do Resend —
// usado pelo cron de relatório (roda 1h depois) pra consultar o status de
// entrega de cada e-mail via GET /emails/:id.
async function ensureSendsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_newsletter_sends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      issue_number INTEGER NOT NULL,
      email TEXT NOT NULL,
      resend_email_id TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function recordNewsletterSend(issueNumber: number, email: string, resendEmailId: string | null): Promise<void> {
  await ensureSendsTable()
  await sql`
    INSERT INTO tdg_newsletter_sends (issue_number, email, resend_email_id)
    VALUES (${issueNumber}, ${email}, ${resendEmailId})
  `
}

export async function getNewsletterSends(issueNumber: number): Promise<{ email: string; resend_email_id: string | null }[]> {
  await ensureSendsTable()
  const { rows } = await sql`
    SELECT email, resend_email_id FROM tdg_newsletter_sends WHERE issue_number = ${issueNumber}
  `
  return rows.map(r => ({ email: r.email as string, resend_email_id: r.resend_email_id as string | null }))
}
