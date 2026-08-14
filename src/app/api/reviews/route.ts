import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logUsage } from '@/lib/usage-log'
import { checkAndDeductCredits } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'
import { buildReviewExtractionPrompt } from '@/lib/review-extraction'

export const dynamic = 'force-dynamic'

/* ── GET — list reviews grouped by hotel ─────────────────────── */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentEmail = session.user?.email ?? ''
  const { searchParams } = new URL(req.url)
  const hotel = searchParams.get('hotel')
  const hotelId = searchParams.get('hotelId')
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
  if (hotelId) {
    // Fase 2: a ficha do fornecedor pede as próprias reviews por hotel_id
    // real — exato, sem depender de casar hotel_name por texto.
    const { rows } = await sql`
      SELECT r.*,
             CASE WHEN f.review_id IS NOT NULL THEN true ELSE false END AS is_favorite,
             (SELECT COUNT(*)::int FROM tdg_review_favorites WHERE review_id = r.id) AS favorite_count,
             (r.agent_id IS NOT NULL AND r.agent_id = ${agentId}) AS is_own
      FROM tdg_hotel_reviews r
      LEFT JOIN tdg_review_favorites f
        ON f.review_id = r.id AND f.agent_id = ${agentId}
      WHERE r.hotel_id = ${hotelId}
        AND r.status = ${status}
      ORDER BY r.visit_date DESC NULLS LAST
    `
    reviewRows = rows
  } else if (hotel) {
    const { rows } = await sql`
      SELECT r.*,
             CASE WHEN f.review_id IS NOT NULL THEN true ELSE false END AS is_favorite,
             (SELECT COUNT(*)::int FROM tdg_review_favorites WHERE review_id = r.id) AS favorite_count,
             (r.agent_id IS NOT NULL AND r.agent_id = ${agentId}) AS is_own
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
    // Group: one row por hotel/fornecedor (última visita), com contagem.
    // A escolha do representante por fornecedor continua sendo a visita mais
    // recente (visit_date), mas a ORDEM da lista externa é por created_at —
    // achado da Carla, 14/08: a lista tava alfabética por nome do hotel
    // (efeito colateral do DISTINCT ON), então uma review acabada de
    // registrar não subia pro topo, parecia ter sumido.
    const { rows } = await sql`
      SELECT * FROM (
        SELECT DISTINCT ON (r.hotel_name)
          r.*,
          COUNT(*) OVER (PARTITION BY r.hotel_name) AS visit_count,
          AVG(r.overall_rating) OVER (PARTITION BY r.hotel_name) AS avg_rating,
          CASE WHEN f.review_id IS NOT NULL THEN true ELSE false END AS is_favorite,
          (SELECT COUNT(*)::int FROM tdg_review_favorites WHERE review_id = r.id) AS favorite_count,
          (r.agent_id IS NOT NULL AND r.agent_id = ${agentId}) AS is_own
        FROM tdg_hotel_reviews r
        LEFT JOIN tdg_review_favorites f
          ON f.review_id = r.id AND f.agent_id = ${agentId}
        WHERE r.status = ${status}
          AND (${entityType}::text IS NULL OR r.entity_type = ${entityType})
        ORDER BY r.hotel_name, r.visit_date DESC NULLS LAST
      ) grouped
      ORDER BY grouped.created_at DESC
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
      raw_answers, sentiment_map, photo_url, photo_urls, related_lead_id,
      media_usage_authorized, document_url,
    } = body

    // status nunca vem do cliente — é sempre derivado de visit_type/entity_type
    // no servidor, senão um cliente malicioso/com bug publica um lead não
    // testado direto na fila de confiança da rede. Roteiro entra no mesmo
    // grupo de "descoberta" que reunião comercial — documento recebido,
    // ninguém testou ainda.
    const isLead = visit_type === 'commercial_meeting' || entity_type === 'roteiro'
    const status = isLead ? 'a_testar' : 'published'

    // Reunião comercial nunca pergunta nota geral (não houve estadia) — só
    // exige overall_rating fora do caso de lead.
    if (!hotel_name || (!isLead && overall_rating == null)) {
      return NextResponse.json({ error: 'hotel_name e overall_rating são obrigatórios' }, { status: 400 })
    }

    // Lead de reunião comercial nunca tem foto — ninguém foi lá pessoalmente
    // ainda, não há o que fotografar. Ignora silenciosamente se vier mesmo assim.
    // photo_urls (múltiplas, Fase de multi-foto) é a fonte de verdade quando
    // vem preenchida; photo_url singular segue aceito pra clientes antigos.
    const finalPhotoUrls: string[] = isLead ? [] : (Array.isArray(photo_urls) ? photo_urls.filter(Boolean) : (photo_url ? [photo_url] : []))
    const finalPhotoUrl = finalPhotoUrls[0] ?? null

    // Ensure country column exists (idempotent migration)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS country TEXT`

    // Ensure photo_url column exists (idempotent migration)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS photo_url TEXT`

    // Ensure photo_urls column exists (idempotent migration) — array completo;
    // photo_url continua guardando só a primeira, pra não quebrar telas que já
    // leem esse campo (capa do card, hero da rede etc.)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb`

    // Autorização de uso das fotos/vídeos por outras agências (achado da
    // Carla, 10/08: sem isso, quem sobe mídia não tem como sinalizar se ela
    // pode ser reusada em propostas de outra agência ou é só referência
    // interna). Default ligado (opt-out) — decisão dela, combina com o
    // espírito de inteligência coletiva do produto.
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS media_usage_authorized BOOLEAN NOT NULL DEFAULT true`

    // Add sentiment_map column (idempotent)
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS sentiment_map JSONB`

    // Documento do roteiro (PDF/Word/fotos das páginas) — idempotente
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS document_url TEXT`

    // hotel_id — Fase 1 da reorganização de caixinhas (ver migration 012):
    // liga a review ao catálogo real de fornecedores em vez de só um texto
    // livre, pra permitir a ficha do hotel puxar suas próprias reviews depois.
    await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES tdg_hotels(id) ON DELETE SET NULL`

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
      SELECT id, name, agency_name, role FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
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
      const creditCheck = await checkAndDeductCredits({ agencyId, action: 'review_extraction', userEmail: session.user?.email ?? 'unknown', isBemgsyAdmin: user.role === 'admin' })
      // Extraction is best-effort: if credits are unavailable for any reason
      // (insufficient balance or no agency assigned), skip it — the review is
      // still saved below. Do NOT fail-open on unexpected reasons.
      try {
        if (!creditCheck.ok) throw new Error(creditCheck.reason)
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const prompt = buildReviewExtractionPrompt(raw_answers as Record<string, string>, overall_rating)
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

    // Toda review liga a um fornecedor real no catálogo — acha por nome +
    // tipo (case-insensitive) ou cria a linha na hora. Catálogo cresce
    // organicamente a partir de reviews reais, nunca fica review órfã.
    // Corrigido (28/07): antes só rodava pra entity_type=hotel — o catálogo
    // era "Hotéis" de fato, apesar de ter sido pedido pra nascer como
    // "Fornecedores" cobrindo todos os tipos desde a Fase 1. Agora vale pra
    // beach_club/transfer/guia/restaurante/outro igual.
    const finalEntityType = entity_type || 'hotel'
    let hotelId: string | null = null
    // Roteiro não é fornecedor — é um documento/destino, não entra no
    // catálogo de tdg_hotels (ficaria lixo entre hotéis/beach clubs reais).
    if (finalEntityType !== 'roteiro') {
      const trimmedName = String(hotel_name).trim()
      const { rows: existingHotel } = await sql`
        SELECT id FROM tdg_hotels WHERE lower(trim(name)) = lower(${trimmedName}) AND entity_type = ${finalEntityType}
      `
      if (existingHotel[0]) {
        hotelId = existingHotel[0].id as string
      } else {
        // Copia country/location da review pro fornecedor recém-criado —
        // achado da Carla, 14/08: fornecedor nascia sem destino nenhum, então
        // sumia de qualquer filtro de região em HoteisView (que filtra por
        // tdg_hotels.country, não pelo country da review).
        const { rows: createdHotel } = await sql`
          INSERT INTO tdg_hotels (name, entity_type, country, location) VALUES (${trimmedName}, ${finalEntityType}, ${country || null}, ${country || null})
          ON CONFLICT (lower(trim(name)), entity_type) WHERE agency_id IS NULL DO NOTHING
          RETURNING id
        `
        if (createdHotel[0]) {
          hotelId = createdHotel[0].id as string
        } else {
          // Corrida: outra requisição criou o mesmo fornecedor entre o SELECT e o INSERT.
          const { rows: racedHotel } = await sql`
            SELECT id FROM tdg_hotels WHERE lower(trim(name)) = lower(${trimmedName}) AND entity_type = ${finalEntityType}
          `
          hotelId = racedHotel[0]?.id ?? null
        }
      }
    }

    const { rows } = await sql`
      INSERT INTO tdg_hotel_reviews
        (hotel_name, hotel_id, entity_type, country, agent_id, agent_name, agency_name, visit_date, visit_type,
         overall_rating, rooms_rating, service_rating, food_rating, location_rating,
         highlights, client_profile, must_experience, heads_up, status, photo_url, photo_urls, media_usage_authorized, related_lead_id, raw_answers, sentiment_map, document_url)
      VALUES (
        ${hotel_name}, ${hotelId}, ${finalEntityType}, ${country || null}, ${user.id}, ${user.name}, ${user.agency_name},
        ${visit_date || null}, ${visit_type || null},
        ${overall_rating}, ${rooms_rating || null}, ${service_rating || null},
        ${food_rating || null}, ${location_rating || null},
        ${JSON.stringify(structured.highlights ?? [])}, ${structured.client_profile ?? null},
        ${structured.must_experience ?? null}, ${structured.heads_up ?? null},
        ${status}, ${finalPhotoUrl}, ${JSON.stringify(finalPhotoUrls)}, ${media_usage_authorized !== false}, ${finalRelatedLeadId},
        ${JSON.stringify(raw_answers)},
        ${sentiment_map ? JSON.stringify(sentiment_map) : null},
        ${document_url || null}
      )
      RETURNING *
    `

    // Capa do fornecedor = foto da visita mais recente (esta review é a mais
    // recente no momento em que é salva). Achado da Carla, 07/08: a
    // Herdade da Malhadinha Nova tinha review com foto real mas capa vazia
    // — não existia NENHUMA ligação entre foto de review e capa do
    // fornecedor. Reunião comercial (lead) nunca tem foto, então nunca
    // sobrescreve a capa com nada.
    if (finalPhotoUrl && hotelId) {
      await sql`UPDATE tdg_hotels SET image_url = ${finalPhotoUrl} WHERE id = ${hotelId}`
    }

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

  const { review_id, action, fields, new_photo_urls } = await req.json() // action: 'add' | 'remove' | 'view' | 'edit'

  if (action === 'view') {
    if (!review_id) return NextResponse.json({ error: 'review_id required' }, { status: 400 })
    await sql`UPDATE tdg_hotel_reviews SET view_count = view_count + 1 WHERE id = ${review_id}`
    return NextResponse.json({ ok: true })
  }

  const { rows: userRows } = await sql`
    SELECT id FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1
  `
  const agentId = userRows[0]?.id
  if (!agentId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Achado da Carla, 10/08: review editável EXCLUSIVAMENTE por quem a fez —
  // sem exceção de admin aqui (diferente da fila de import, que tem
  // fallback do admin). Também dá pra acrescentar mais fotos depois, sem
  // precisar recriar a review inteira.
  if (action === 'edit') {
    if (!review_id) return NextResponse.json({ error: 'review_id required' }, { status: 400 })
    const { rows: ownerRows } = await sql`SELECT agent_id, photo_urls FROM tdg_hotel_reviews WHERE id = ${review_id}`
    if (!ownerRows.length) return NextResponse.json({ error: 'Review não encontrada' }, { status: 404 })
    if (ownerRows[0].agent_id !== agentId) {
      return NextResponse.json({ error: 'Só o autor pode editar esta review' }, { status: 403 })
    }

    const f = (fields ?? {}) as Record<string, unknown>
    const existingPhotos: string[] = ownerRows[0].photo_urls ?? []
    const mergedPhotos = Array.isArray(new_photo_urls) && new_photo_urls.length > 0
      ? [...existingPhotos, ...new_photo_urls]
      : existingPhotos
    const mediaAuth = typeof f.media_usage_authorized === 'boolean' ? f.media_usage_authorized : null

    const { rows: updated } = await sql`
      UPDATE tdg_hotel_reviews SET
        overall_rating          = COALESCE(${f.overall_rating as number ?? null}, overall_rating),
        highlights              = COALESCE(${f.highlights ? JSON.stringify(f.highlights) : null}, highlights),
        client_profile          = COALESCE(${f.client_profile as string ?? null}, client_profile),
        must_experience         = COALESCE(${f.must_experience as string ?? null}, must_experience),
        heads_up                = COALESCE(${f.heads_up as string ?? null}, heads_up),
        visit_type               = COALESCE(${f.visit_type as string ?? null}, visit_type),
        media_usage_authorized  = COALESCE(${mediaAuth}, media_usage_authorized),
        photo_urls              = ${JSON.stringify(mergedPhotos)},
        photo_url               = COALESCE(photo_url, ${mergedPhotos[0] ?? null})
      WHERE id = ${review_id}
      RETURNING *
    `
    return NextResponse.json({ review: updated[0] })
  }

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
