import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isAuthorMatch } from '@/lib/author-match'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentName = session.user?.name ?? 'Agente'

  // Ensure avatar column exists and fetch it
  await sql`ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`
  const profileRes = await sql`SELECT id, avatar_url, role, agency_name, name FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1`
  const avatarUrl: string | null = profileRes.rows[0]?.avatar_url ?? null
  const isAdmin = profileRes.rows[0]?.role === 'admin'
  // Escopo por agência (achado da Carla, 29/07): gravações e atividade de
  // dicas viviam sem filtro nenhum — toda agência via o contador da rede
  // inteira. Nenhuma tabela tem agency_id populado de forma confiável ainda
  // (tdg_audio_inputs não tem FK; tdg_hotel_reviews tem agency_name direto
  // no registro, sempre preenchido) — usa esse texto livre, é o vínculo mais
  // confiável disponível hoje sem esperar a migração de multi-tenancy real.
  const agencyName = (profileRes.rows[0]?.agency_name as string | undefined) ?? ''

  // Pedidos de ativação GUEST pendentes — só existe pro admin global (a mesma
  // pessoa que os aprova na aba "Rede TDG" do Billing). A tabela pode ainda
  // não existir se ninguém pediu ativação ainda — tratado como 0, não erro.
  let pendingGuestRequests = 0
  if (isAdmin) {
    try {
      const { rows } = await sql`SELECT COUNT(*)::int AS count FROM tdg_guest_activation_requests WHERE status = 'pending'`
      pendingGuestRequests = rows[0]?.count ?? 0
    } catch { /* tabela ainda não existe — sem pedidos */ }
  }

  // Reports de erro NÃO LIDOS — só pro admin global (fila de trabalho dele).
  // Achado da Carla, 21/08: contava por status='pending', então reler o
  // report na Linha Direta nunca fazia o badge sumir — só mudar o status
  // fazia, e "lido" e "resolvido" são coisas diferentes. Agora conta por
  // viewed_at IS NULL; abrir a Linha Direta como admin marca como visto
  // (ver PATCH mark_bug_reports_viewed em /api/suggestions), sem precisar
  // resolver o report ainda pra ele sumir do sino.
  let pendingBugReports = 0
  if (isAdmin) {
    try {
      await sql`ALTER TABLE tdg_suggestions ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ`
      const { rows } = await sql`SELECT COUNT(*)::int AS count FROM tdg_suggestions WHERE type = 'bug_report' AND status = 'pending' AND viewed_at IS NULL`
      pendingBugReports = rows[0]?.count ?? 0
    } catch { /* tabela ainda não existe — sem reports */ }
  }

  // Fase 6 — fila de confirmação (decisões #14-16). Match por token
  // (isAuthorMatch, src/lib/author-match.ts) — mesma função usada em
  // /api/pending-content desde 10/08. Achado da Carla, 20/08: esta rota
  // (que alimenta o badge da sidebar) tinha ficado pra trás usando o match
  // antigo por substring exato (SQL ILIKE), nunca migrado junto — inflava
  // o badge de Billing pra 1248 (763 reviews + 484 knowledge órfãos) quando
  // boa parte já tinha autor real cadastrado, só não batia pela grafia
  // diferente do nome extraído do WhatsApp. Com o match correto, cai pra
  // ~535 — os que restam são de fato sem conta na rede (ex: sócios/pessoas
  // fora do TDG citadas na importação).
  const userName = (profileRes.rows[0] as { name?: string } | undefined)?.name ?? ''
  let pendingImportConfirmations = 0
  let pendingMyReviewConfirmations = 0
  let pendingMyKnowledgeConfirmations = 0
  try {
    const [{ rows: allReviews }, { rows: allKnowledge }, { rows: allUsers }] = await Promise.all([
      sql`SELECT source_author FROM tdg_hotel_reviews WHERE import_approval = 'pending'`,
      sql`SELECT source_author FROM tdg_destination_knowledge WHERE import_approval = 'pending'`,
      sql`SELECT name FROM tdg_users WHERE name IS NOT NULL AND name <> ''`,
    ])
    const realNames = allUsers.map(u => u.name as string)

    if (isAdmin) {
      const orphanReviews = allReviews.filter(r => !realNames.some(n => isAuthorMatch(r.source_author as string | null, n))).length
      const orphanKnowledge = allKnowledge.filter(k => !realNames.some(n => isAuthorMatch(k.source_author as string | null, n))).length
      pendingImportConfirmations = orphanReviews + orphanKnowledge
    }
    if (userName) {
      pendingMyReviewConfirmations = allReviews.filter(r => isAuthorMatch(r.source_author as string | null, userName)).length
      pendingMyKnowledgeConfirmations = allKnowledge.filter(k => isAuthorMatch(k.source_author as string | null, userName)).length
    }
  } catch { /* colunas de import_approval podem não existir em ambiente antigo */ }

  // Badges — decisão #20, sino nunca em tom de perda. "Ganho" e "trocou de
  // dono" (nunca "perdeu"), últimos 7 dias.
  const userId = (profileRes.rows[0] as { id?: string } | undefined)?.id ?? null
  let recentBadgesEarned: { badge_type: string; context: string }[] = []
  let recentBadgesLost: { badge_type: string; context: string }[] = []
  if (userId) {
    try {
      const { rows: earnedRows } = await sql`
        SELECT badge_type, context FROM tdg_badges
        WHERE user_id = ${userId} AND earned_at >= NOW() - INTERVAL '7 days'
      `
      recentBadgesEarned = earnedRows as { badge_type: string; context: string }[]
      const { rows: lostRows } = await sql`
        SELECT badge_type, context FROM tdg_badges
        WHERE user_id = ${userId} AND is_current = false AND badge_type != 'pioneira'
          AND lost_at >= NOW() - INTERVAL '7 days'
      `
      recentBadgesLost = lostRows as { badge_type: string; context: string }[]
    } catch { /* tabela pode não existir em ambiente antigo */ }
  }

  const [pendingRes, reviewsRes, promotionsRes, lastReviewRes, pendingLeadsRes, newContentRes] = await Promise.all([
    // Gravações pendentes de transcrição — só da própria agência
    sql`
      SELECT COUNT(*)::int AS count
      FROM tdg_audio_inputs
      WHERE status = 'pending' AND agency = ${agencyName}
    `,
    // Reviews desta semana — só da própria agência
    sql`
      SELECT COUNT(*)::int AS count
      FROM tdg_hotel_reviews
      WHERE created_at >= NOW() - INTERVAL '7 days' AND agency_name = ${agencyName}
    `,
    // Promoções expirando em 7 dias — network-wide de propósito (ofertas são
    // da rede toda, não da agência individual). Foto real do hotel junto.
    sql`
      SELECT p.title, h.name AS hotel_name, h.image_url, p.booking_deadline, p.commission_rate
      FROM tdg_promotions p
      JOIN tdg_hotels h ON h.id = p.hotel_id
      WHERE p.is_active = true
        AND p.booking_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY p.booking_deadline ASC
      LIMIT 5
    `,
    // Última dica registrada
    sql`
      SELECT created_at
      FROM tdg_hotel_reviews
      ORDER BY created_at DESC
      LIMIT 1
    `,
    // Descobertas da rede aguardando teste real (prateleira — ver "Na prática")
    sql`
      SELECT COUNT(*)::int AS count
      FROM tdg_hotel_reviews
      WHERE status = 'a_testar'
    `,
    // Conteúdo novo publicado na Central Bemgsy — broadcast pra rede inteira
    // de propósito (é a Bemgsy avisando todo mundo, não algo por agência).
    sql`
      SELECT id, category, title, created_at
      FROM tdg_partnership_content
      WHERE created_at >= NOW() - INTERVAL '14 days'
      ORDER BY created_at DESC
      LIMIT 5
    `,
  ])

  return NextResponse.json({
    agent_name: agentName,
    avatar_url: avatarUrl,
    pending_recordings: pendingRes.rows[0]?.count ?? 0,
    reviews_this_week: reviewsRes.rows[0]?.count ?? 0,
    expiring_promotions: promotionsRes.rows,
    last_review_date: lastReviewRes.rows[0]?.created_at ?? null,
    pending_guest_requests: pendingGuestRequests,
    pending_bug_reports: pendingBugReports,
    pending_leads: pendingLeadsRes.rows[0]?.count ?? 0,
    new_partnership_content: newContentRes.rows,
    is_admin: isAdmin,
    pending_import_confirmations: pendingImportConfirmations,
    pending_my_review_confirmations: pendingMyReviewConfirmations,
    pending_my_knowledge_confirmations: pendingMyKnowledgeConfirmations,
    recent_badges_earned: recentBadgesEarned,
    recent_badges_lost: recentBadgesLost,
  })
}
