import { sql } from '@vercel/postgres'

interface BemgsyOfferRow {
  id: string
  hotel_id: string | null
  title: string
  description: string | null
  commission_percentage: number | null
  valid_until: string | null
  offer_type: string | null
  image_url: string | null
  smart_tags: { emoji: string; label: string; category: string }[] | null
  created_at: string | null
}

export interface OfferRow {
  id: string
  hotel_id: string | null
  hotel_name: string
  location: string | null
  offer_type: string | null
  commission: number
  valid_until: string | null
  highlights: string[]
  full_description: string | null
  image_url: string | null
  accent: string
  curated: boolean
  curated_by: string | null
  curated_at: string | null
}

// Curadoria de oferta hoje é sempre a mesma agência (não temos resolução de
// identidade cross-sistema com o Bemgsy Central ainda — created_by de lá é
// um UUID de auth.users, sem acesso de leitura via anon key). Combinado com
// a Carla: usar esse nome fixo por enquanto, até existir identidade real.
const CURATOR_NAME = 'Agência 20 Teste'

const ACCENTS = ['#4a9bbe', '#7aaa5a', '#c8a060', '#8080c8', '#c07840', '#6b9080', '#a0616a']

function offerTypeLabel(type: string | null): string {
  switch (type) {
    case 'seasonal':      return 'Oferta Sazonal'
    case 'early_booking':  return 'Early Booking'
    case 'package':        return 'Pacote Especial'
    case 'last_minute':    return 'Last Minute'
    default:                return 'Oferta Ativa'
  }
}

const DESCRIPTION_HIGHLIGHT_MAX = 140

/* Nem toda oferta em Bemgsy Central tem smart_tags preenchidas — algumas só
   têm uma description longa em markdown (às vezes com imagem embutida).
   Sem isso, o card vira uma parede de texto cru enquanto os outros ficam
   curtos e escaneáveis. Aqui sempre normaliza pro mesmo peso visual. */
function cleanDescription(description: string | null): string | null {
  if (!description) return null
  const cleaned = description
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
}

function summarizeDescription(description: string | null): string | null {
  const cleaned = cleanDescription(description)
  if (!cleaned) return null
  return cleaned.length > DESCRIPTION_HIGHLIGHT_MAX
    ? `${cleaned.slice(0, DESCRIPTION_HIGHLIGHT_MAX).trim()}…`
    : cleaned
}

/* Ofertas reais vêm do Bemgsy Central (mesmo banco de imagens/dados já
   usado no redesenho de "Na prática" e nas fotos de Hotéis) — nunca mais
   mock hardcoded. Filtro espelha a RLS de lá: só oferta pública, ativa,
   com slug de compartilhamento e dentro da validade. */
async function fetchBemgsyCentralOffers(): Promise<BemgsyOfferRow[]> {
  const url = process.env.BEMGSY_CENTRAL_SUPABASE_URL
  const key = process.env.BEMGSY_CENTRAL_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const nowIso = new Date().toISOString()
  const params = new URLSearchParams({
    select: 'id,hotel_id,title,description,commission_percentage,valid_until,offer_type,image_url,smart_tags,created_at',
    is_active: 'eq.true',
    is_public: 'eq.true',
    share_slug: 'not.is.null',
    valid_until: `gt.${nowIso}`,
    order: 'commission_percentage.desc',
  })

  const res = await fetch(`${url}/rest/v1/hotel_offers?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

// Usado tanto por GET /api/offers (REST, consumido pelo OfertasList) quanto
// pela ferramenta search_tdg_offers do MCP (/api/mcp) — uma fonte de
// verdade só, pra não divergir regra de negócio entre os dois caminhos.
export async function getOffers(): Promise<OfferRow[]> {
  const bemgsyOffers = await fetchBemgsyCentralOffers()

  const hotelIds = [...new Set(bemgsyOffers.map(o => o.hotel_id).filter((id): id is string => !!id))]
  let hotelsById: Record<string, { name: string; location: string | null; image_url: string | null }> = {}
  if (hotelIds.length > 0) {
    const { rows } = await sql.query(
      'SELECT id, name, location, image_url FROM tdg_hotels WHERE id = ANY($1)',
      [hotelIds]
    )
    hotelsById = Object.fromEntries(rows.map(r => [r.id as string, {
      name: r.name as string, location: r.location as string | null, image_url: r.image_url as string | null,
    }]))
  }

  return bemgsyOffers.map((o, i) => {
    const hotel = o.hotel_id ? hotelsById[o.hotel_id] : undefined
    const highlights = (o.smart_tags ?? [])
      .filter(t => t.category !== 'financial') // comissão já aparece em destaque na foto, não repete na lista
      .slice(0, 3)
      .map(t => `${t.emoji} ${t.label}`)

    return {
      id: o.id,
      hotel_id: o.hotel_id,
      hotel_name: hotel?.name ?? o.title,
      location: hotel?.location ?? null,
      offer_type: offerTypeLabel(o.offer_type),
      commission: o.commission_percentage ?? 0,
      valid_until: o.valid_until,
      highlights: highlights.length > 0 ? highlights : [summarizeDescription(o.description)].filter((h): h is string => !!h),
      full_description: cleanDescription(o.description),
      image_url: o.image_url ?? hotel?.image_url ?? null,
      accent: ACCENTS[i % ACCENTS.length],
      // Toda oferta hoje vem do Bemgsy Central (fonte central com processo
      // de aprovação — is_active+is_public+share_slug), nunca solta de
      // agente. Combinado com Adriano: fonte precisa ficar visível — quando
      // a ingestão por e-mail existir, essa flag para de ser sempre true.
      curated: true,
      curated_by: CURATOR_NAME,
      curated_at: o.created_at,
    }
  })
}
