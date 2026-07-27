import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logUsage } from '@/lib/usage-log'
import { checkAndDeductCredits } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'

export const dynamic = 'force-dynamic'

/* ── GET — list reviews grouped by hotel ─────────────────────── */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentEmail = session.user?.email ?? ''
  const { searchParams } = new URL(req.url)
  const hotel = searchParams.get('hotel')
  const entityType = searchParams.get('entity_type')
  // Sem status explícito, só o que já foi confirmado pela rede — lead
  // ("a_testar") é opt-in, nunca aparece por padrão misturado com o resto.
  const status = searchParams.get('status') || 'published'

  // Get agent id for favorites lookup
  const { rows: userRows } = await sql`
    SELECT id FROM tdg_users WHERE email = ${agentEmail} LIMIT 1
  `
  const agentId = userRows[0]?.id ?? null

  let reviewRows
  if (hotel) {
    const { rows } = await sql`
      SELECT r.*,
             CASE WHEN f.review_id IS NOT NULL THEN true ELSE false END AS is_favorite
      FROM tdg_hotel_reviews r
      LEFT JOIN tdg_review_favorites f
        ON f.review_id = r.id AND f.agent_id = ${agentId}
      WHERE r.hotel_name ILIKE ${`%${hotel}%`}
        AND r.status = ${status}
        AND (${entityType}::text IS NULL OR r.entity_type = ${entityType})
      ORDER BY r.visit_date DESC NULLS LAST
    `
    reviewRows = rows
  } else {
    // Group: one row por hotel/fornecedor (última visita), com contagem
    const { rows } = await sql`
      SELECT DISTINCT ON (r.hotel_name)
        r.*,
        COUNT(*) OVER (PARTITION BY r.hotel_name) AS visit_count,
        AVG(r.overall_rating) OVER (PARTITION BY r.hotel_name) AS avg_rating,
        CASE WHEN f.review_id IS NOT NULL THEN true ELSE false END AS is_favorite
      FROM tdg_hotel_reviews r
      LEFT JOIN tdg_review_favorites f
        ON f.review_id = r.id AND f.agent_id = ${agentId}
      WHERE r.status = ${status}
        AND (${entityType}::text IS NULL OR r.entity_type = ${entityType})
      ORDER BY r.hotel_name, r.visit_date DESC NULLS LAST
    `
    reviewRows = rows
  }

  return NextResponse.json({ reviews: reviewRows })
}

/* ── POST — submit a new review (with AI extraction) ─────────── */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      hotel_name, entity_type, country, visit_date, visit_type,
      overall_rating, rooms_rating, service_rating, food_rating, location_rating,
      raw_answers, sentiment_map, photo_url, related_lead_id,
    } = body

    // status nunca vem do cliente — é sempre derivado de visit_type no servidor,
    // senão um cliente malicioso/com bug publica um lead não testado direto na
    // fila de confiança da rede.
    const isLead = visit_type === 'commercial_meeting'
    const status = isLead ? 'a_testar' : 'published'

    // Reunião comercial nunca pergunta nota geral (não houve estadia) — só
    // exige overall_rating fora do caso de lead.
    if (!hotel_name || (!isLead && overall_rating == null)) {
      return NextResponse.json({ error: 'hotel_name e overall_rating são obrigatórios' }, { status: 400 })
    }

    // Lead de reunião comercial nunca tem foto — ninguém foi lá pessoalmente
    // ainda, não há o que fotografar. Ignora silenciosamente se vier mesmo assim.
    const finalPhotoUrl = isLead ? null : (photo_url || null)

    // Ensure country column exists (idempotent migration)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS country TEXT`

    // Ensure photo_url column exists (idempotent migration)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS photo_url TEXT`

    // Add sentiment_map column (idempotent)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS sentiment_map JSONB`

    // Migrate highlights from TEXT[] to JSONB (idempotent via column type check)
    await sql`
      ALTER TABLE tdg_hotel_reviews
        ALTER COLUMN highlights TYPE JSONB
        USING to_jsonb(highlights)
    `.catch(() => { /* already JSONB — ignore */ })

    // Widen rating columns to accept −5..+5 (drop old 1-5 check constraints)
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_overall_rating_check`
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_rooms_rating_check`
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_service_rating_check`
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_food_rating_check`
    await sql`ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_location_rating_check`

    // Lookup user — fail clearly if not found
    const { rows: userRows } = await sql`
      SELECT id, name, agency_name FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
    `
    const user = userRows[0]
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Lead de reunião comercial: só uma resposta curta (por que chamou atenção),
    // sem estadia pra extrair — não vale a chamada de IA nem os créditos.
    // A resposta em si vira heads_up, que a UI já sabe renderizar — sem precisar
    // de tela nova só pra mostrar o texto do lead.
    let structured: { highlights?: string[]; client_profile?: string; must_experience?: string; heads_up?: string | null } = {}
    if (isLead) {
      structured = { heads_up: (raw_answers as Record<string, string>)?.why_it_matters ?? null }
    } else {
      // AI extraction — check balance first; if insufficient, skip extraction but still save the review
      const agencyId = await getAgencyId(session.user?.email ?? '')
      const creditCheck = await checkAndDeductCredits({ agencyId, action: 'review_extraction', userEmail: session.user?.email ?? 'unknown' })
      // Extraction is best-effort: if credits are unavailable for any reason
      // (insufficient balance or no agency assigned), skip it — the review is
      // still saved below. Do NOT fail-open on unexpected reasons.
      try {
        if (!creditCheck.ok) throw new Error(creditCheck.reason)
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const prompt = `Você é um assistente especializado em turismo de luxo. Com base nas respostas do travel advisor abaixo sobre uma visita, extraia as informações estruturadas.

Respostas do advisor:
${Object.entries(raw_answers as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join('\n')}

Retorne APENAS um JSON válido com esta estrutura:
{
  "highlights": ["array de 3 a 5 pontos mais relevantes — específicos, úteis para vender ao cliente"],
  "client_profile": "perfil ideal em 1-2 frases — quem deve se beneficiar disso?",
  "must_experience": "UMA experiência obrigatória, se aplicável (ou null)",
  "heads_up": "ressalva ou informação importante (ou null se não houver)"
}`
        const extraction = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        })
        const textBlock = extraction.content.find(b => b.type === 'text')
        if (textBlock?.type === 'text') {
          const match = textBlock.text.match(/\{[\s\S]*\}/)
          if (match) structured = JSON.parse(match[0])
        }
        logUsage({ event_type: 'review_extraction', user_email: session.user?.email ?? 'unknown', meta: { hotel: hotel_name } })
      } catch { /* AI failure is non-blocking — review saves without extraction */ }
    }

    // related_lead_id nunca em lead — só uma review confirmada aponta de
    // volta pro lead original que ela testou.
    const finalRelatedLeadId = isLead ? null : (related_lead_id || null)

    const { rows } = await sql`
      INSERT INTO tdg_hotel_reviews
        (hotel_name, entity_type, country, agent_id, agent_name, agency_name, visit_date, visit_type,
         overall_rating, rooms_rating, service_rating, food_rating, location_rating,
         highlights, client_profile, must_experience, heads_up, status, photo_url, related_lead_id, raw_answers, sentiment_map)
      VALUES (
        ${hotel_name}, ${entity_type || 'hotel'}, ${country || null}, ${user.id}, ${user.name}, ${user.agency_name},
        ${visit_date || null}, ${visit_type || null},
        ${overall_rating}, ${rooms_rating || null}, ${service_rating || null},
        ${food_rating || null}, ${location_rating || null},
        ${JSON.stringify(structured.highlights ?? [])}, ${structured.client_profile ?? null},
        ${structured.must_experience ?? null}, ${structured.heads_up ?? null},
        ${status}, ${finalPhotoUrl}, ${finalRelatedLeadId},
        ${JSON.stringify(raw_answers)},
        ${sentiment_map ? JSON.stringify(sentiment_map) : null}
      )
      RETURNING *
    `

    return NextResponse.json({ review: rows[0] })
  } catch (e) {
    console.error('[POST /api/reviews]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/* ── PATCH — toggle favorite ──────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { review_id, action } = await req.json() // action: 'add' | 'remove'

  const { rows: userRows } = await sql`
    SELECT id FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
  `
  const agentId = userRows[0]?.id
  if (!agentId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (action === 'add') {
    await sql`
      INSERT INTO tdg_review_favorites (agent_id, review_id)
      VALUES (${agentId}, ${review_id})
      ON CONFLICT DO NOTHING
    `
  } else {
    await sql`
      DELETE FROM tdg_review_favorites WHERE agent_id = ${agentId} AND review_id = ${review_id}
    `
  }

  return NextResponse.json({ ok: true })
}
