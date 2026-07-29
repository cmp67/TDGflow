import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentName = session.user?.name ?? 'Agente'

  // Ensure avatar column exists and fetch it
  await sql`ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`
  const profileRes = await sql`SELECT avatar_url, role, agency_name FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1`
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
    pending_leads: pendingLeadsRes.rows[0]?.count ?? 0,
    new_partnership_content: newContentRes.rows,
    is_admin: isAdmin,
  })
}
