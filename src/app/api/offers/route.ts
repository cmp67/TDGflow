import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
}

export interface OfferRow {
  id: string
  hotel_name: string
  location: string | null
  offer_type: string | null
  commission: number
  valid_until: string | null
  highlights: string[]
  image_url: string | null
  accent: string
}

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
    select: 'id,hotel_id,title,description,commission_percentage,valid_until,offer_type,image_url,smart_tags',
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

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const offers: OfferRow[] = bemgsyOffers.map((o, i) => {
    const hotel = o.hotel_id ? hotelsById[o.hotel_id] : undefined
    const highlights = (o.smart_tags ?? [])
      .filter(t => t.category !== 'financial') // comissão já aparece em destaque na foto, não repete na lista
      .slice(0, 3)
      .map(t => `${t.emoji} ${t.label}`)

    return {
      id: o.id,
      hotel_name: hotel?.name ?? o.title,
      location: hotel?.location ?? null,
      offer_type: offerTypeLabel(o.offer_type),
      commission: o.commission_percentage ?? 0,
      valid_until: o.valid_until,
      highlights: highlights.length > 0 ? highlights : [o.description ?? ''].filter(Boolean),
      image_url: o.image_url ?? hotel?.image_url ?? null,
      accent: ACCENTS[i % ACCENTS.length],
    }
  })

  return NextResponse.json({ offers })
}
