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

  // Combo/pacote entre propriedades (Bemgsy Central só tem hotel_id
  // singular, não suporta vincular mais de um hotel) — achado da Carla,
  // 27/08: "Combo Algarve + Lisboa" cobre os 4 Martinhal, mas com hotel_id
  // nulo virava UM "hotel" fantasma com o título da oferta inteira como
  // nome, e os outros 3 Martinhal ficavam sem essa oferta. Sem mexer no
  // schema do Central (Lovable é fonte de verdade lá), casa o texto da
  // oferta contra o catálogo real e expande em uma linha por hotel citado.
  const needsCatalogMatch = bemgsyOffers.some(o => !o.hotel_id)
  let catalog: { id: string; name: string; location: string | null; image_url: string | null }[] = []
  if (needsCatalogMatch) {
    const { rows } = await sql`SELECT id, name, location, image_url FROM tdg_hotels WHERE entity_type = 'hotel'`
    catalog = rows.map(r => ({
      id: r.id as string, name: r.name as string,
      location: r.location as string | null, image_url: r.image_url as string | null,
    }))
  }
  function matchHotelsInText(text: string) {
    const lower = text.toLowerCase()
    return catalog.filter(h => lower.includes(h.name.toLowerCase()))
  }

  return bemgsyOffers.flatMap((o, i): OfferRow[] => {
    const highlights = (o.smart_tags ?? [])
      .filter(t => t.category !== 'financial') // comissão já aparece em destaque na foto, não repete na lista
      .slice(0, 3)
      .map(t => `${t.emoji} ${t.label}`)

    const shared = {
      offer_type: offerTypeLabel(o.offer_type),
      commission: o.commission_percentage ?? 0,
      valid_until: o.valid_until,
      highlights: highlights.length > 0 ? highlights : [summarizeDescription(o.description)].filter((h): h is string => !!h),
      full_description: cleanDescription(o.description),
      // Toda oferta hoje vem do Bemgsy Central (fonte central com processo
      // de aprovação — is_active+is_public+share_slug), nunca solta de
      // agente. Combinado com Adriano: fonte precisa ficar visível — quando
      // a ingestão por e-mail existir, essa flag para de ser sempre true.
      curated: true,
      curated_by: CURATOR_NAME,
      curated_at: o.created_at,
    }

    if (o.hotel_id) {
      const hotel = hotelsById[o.hotel_id]
      return [{
        ...shared,
        id: o.id,
        hotel_id: o.hotel_id,
        hotel_name: hotel?.name ?? o.title,
        location: hotel?.location ?? null,
        image_url: o.image_url ?? hotel?.image_url ?? null,
        accent: ACCENTS[i % ACCENTS.length],
      }]
    }

    const matched = matchHotelsInText(`${o.title} ${o.description ?? ''}`)
    if (matched.length === 0) {
      return [{
        ...shared,
        id: o.id,
        hotel_id: null,
        hotel_name: o.title,
        location: null,
        image_url: o.image_url ?? null,
        accent: ACCENTS[i % ACCENTS.length],
      }]
    }
    return matched.map((hotel, j) => ({
      ...shared,
      id: `${o.id}-${hotel.id}`,
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      location: hotel.location,
      image_url: o.image_url ?? hotel.image_url ?? null,
      accent: ACCENTS[(i + j) % ACCENTS.length],
    }))
  })
}
