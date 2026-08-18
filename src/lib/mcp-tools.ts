import { sql } from '@vercel/postgres'
import { getOffers } from '@/lib/offers'

/* Ferramentas de busca/registro sobre a rede TDG — extraídas de
   src/app/api/mcp/route.ts (servidor MCP usado pelo agente MAX no GPT
   Maker) pra serem reaproveitadas também pelo chat in-app do TDG Flow
   (src/app/api/chat/route.ts), que até aqui só tinha search_hotels
   básico + get_hotel_full_details lendo de tdg_contracts/tdg_promotions/
   tdg_knowledge — as 3 tabelas vazias (schema legado), nunca retornando
   nada de verdade. Uma implementação só, dois consumidores. */

export const TOOL_DEFINITIONS = [
  {
    name: 'search_tdg_suppliers',
    description:
      'Buscar fornecedores no catálogo da rede TDG (hotéis, beach clubs, transfers, guias, restaurantes) por nome, região, país ou perfil de cliente. Retorna também se o fornecedor tem condição negociada pela rede.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Nome do fornecedor (busca parcial, ex: "Martinhal", "Velaa")' },
        region: { type: 'string', description: 'Região/destino (ex: Algarve, Lisboa, Maldivas)' },
        country: { type: 'string', description: 'País (ex: Portugal, Itália) ou continente/região ampla (ex: Europa, Caribe, África, Ásia) — continente expande automaticamente pra vários países reais do catálogo' },
        entity_type: {
          type: 'string',
          enum: ['hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'],
          description: 'Tipo de fornecedor',
        },
        profiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Perfil de cliente — valores válidos: Família, Casais & Lua de Mel, Praia, Urbano/Cidade, Boutique, Ultra Luxury, Villas & Privacidade, Overwater, Safári, Ski & Montanha, Natureza & Ecoturismo, Cultural & Histórico, Gastronomia, Wellness & Spa, All-Inclusive, Cruzeiro, Enoturismo/Vinícola, Golf, Negócios',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Palavras-chave descritivas livres (ex: "Golf", "5 Estrelas", "Ski") — busca parcial, não precisa ser exato. Não usar pra tipo de cliente, isso é o parâmetro profiles.',
        },
        limit: { type: 'number', description: 'Máximo de resultados (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_tdg_supplier_details',
    description:
      'Obter ficha completa de um fornecedor da rede TDG: dados gerais, condições negociadas (comissão diferenciada, amenidade exclusiva, condição de pagamento), contatos e resumo das reviews da rede.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_id: { type: 'string', description: 'UUID do fornecedor (obtido via search_tdg_suppliers)' },
      },
      required: ['hotel_id'],
    },
  },
  {
    name: 'search_tdg_offers',
    description:
      'Buscar ofertas ativas da rede TDG (comissão negociada, prazo de validade). Ordenadas por comissão mais alta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Nome do fornecedor ou da oferta (busca parcial)' },
        limit: { type: 'number', description: 'Máximo de resultados (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'search_reviews',
    description:
      'Buscar reviews de hotéis registradas pelos Travel Advisors da rede TDG. Retorna avaliações, highlights, perfil de cliente ideal e ressalvas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_name: { type: 'string', description: 'Nome do hotel (busca parcial, ex: "Sagres", "Velaa")' },
        visit_type: {
          type: 'string',
          enum: ['fam_trip', 'site_inspection', 'personal_stay', 'commercial_meeting'],
          description: 'Tipo de visita',
        },
        limit: { type: 'number', description: 'Máximo de resultados (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_review',
    description: 'Obter detalhes completos de um review específico pelo ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        review_id: { type: 'string', description: 'UUID do review' },
      },
      required: ['review_id'],
    },
  },
  {
    name: 'list_hotel_tips',
    description:
      'Listar dicas e highlights agregados de um hotel, consolidando todos os reviews da rede TDG. Ideal para responder "o que os advisors dizem sobre X?".',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_name: { type: 'string', description: 'Nome do hotel' },
      },
      required: ['hotel_name'],
    },
  },
  {
    name: 'register_tip',
    description:
      'Registrar uma visita ou relato de experiência de um Travel Advisor no TDG Flow. Use quando o TD compartilhar uma experiência via WhatsApp.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_name: { type: 'string', description: 'Nome do hotel' },
        country: { type: 'string', description: 'País do hotel' },
        agent_name: { type: 'string', description: 'Nome do Travel Advisor' },
        agency_name: { type: 'string', description: 'Nome da agência' },
        visit_type: {
          type: 'string',
          enum: ['fam_trip', 'site_inspection', 'personal_stay', 'commercial_meeting'],
          description: 'Tipo de visita',
        },
        visit_date: { type: 'string', description: 'Data da visita (YYYY-MM-DD)' },
        overall_rating: { type: 'number', description: 'Avaliação geral de 1 a 5' },
        highlights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de pontos de destaque (3-5 bullets)',
        },
        client_profile: { type: 'string', description: 'Perfil ideal de cliente para este hotel' },
        must_experience: { type: 'string', description: 'Experiência que nenhum hóspede deve perder' },
        heads_up: { type: 'string', description: 'Ressalvas ou cuidados importantes' },
      },
      required: ['hotel_name', 'agent_name', 'agency_name'],
    },
  },
]

// Apelidos de continente/região ampla aceitos no parâmetro `country` —
// listas derivadas dos valores reais de tdg_hotels.country (17/08).
// Achado: instruir via prompt pro modelo sempre quebrar "Europa" em
// várias chamadas (uma por país) não é confiável — comportamento de LLM
// não é determinístico, um teste real (Carla, 18/08) voltou só Portugal
// mesmo com a instrução no ar. Resolvido no código: se o valor bater com
// um continente conhecido, expande pra países reais aqui, sem depender
// do modelo lembrar de repetir a busca.
const CONTINENT_COUNTRIES: Record<string, string[]> = {
  europa: ['Portugal', 'Spain', 'Italy', 'France', 'Greece', 'United Kingdom', 'Switzerland', 'Austria', 'Germany', 'Netherlands', 'Croatia', 'Türkiye', 'Denmark', 'Sweden', 'Czechia', 'Hungary'],
  europe: ['Portugal', 'Spain', 'Italy', 'France', 'Greece', 'United Kingdom', 'Switzerland', 'Austria', 'Germany', 'Netherlands', 'Croatia', 'Türkiye', 'Denmark', 'Sweden', 'Czechia', 'Hungary'],
  caribe: ['Anguilla', 'Saint Barthélemy', 'The Bahamas', 'Turks and Caicos Islands', 'Dominican Republic', 'Curaçao', 'Saint Martin'],
  caribbean: ['Anguilla', 'Saint Barthélemy', 'The Bahamas', 'Turks and Caicos Islands', 'Dominican Republic', 'Curaçao', 'Saint Martin'],
  africa: ['South Africa', 'Tanzania', 'Morocco', 'Egypt', 'Seychelles'],
  'áfrica': ['South Africa', 'Tanzania', 'Morocco', 'Egypt', 'Seychelles'],
  asia: ['Japan', 'Singapore', 'Indonesia', 'South Korea', 'Hong Kong', 'Thailand', 'Cambodia', 'Macau', 'Qatar', 'United Arab Emirates', 'Israel'],
  'ásia': ['Japan', 'Singapore', 'Indonesia', 'South Korea', 'Hong Kong', 'Thailand', 'Cambodia', 'Macau', 'Qatar', 'United Arab Emirates', 'Israel'],
  'américa do sul': ['Argentina', 'Chile', 'Uruguay', 'Colombia', 'Peru', 'Brazil'],
  'south america': ['Argentina', 'Chile', 'Uruguay', 'Colombia', 'Peru', 'Brazil'],
  'américa do norte': ['United States', 'Canada', 'Mexico'],
  'north america': ['United States', 'Canada', 'Mexico'],
}

export async function searchTdgSuppliers(args: Record<string, unknown>) {
  const query = args.query as string | undefined
  const region = args.region as string | undefined
  const countryInput = args.country as string | undefined
  const entityType = args.entity_type as string | undefined
  const profiles = args.profiles as string[] | undefined
  const tags = args.tags as string[] | undefined
  const limit = (args.limit as number | undefined) ?? 10

  const continentCountries = countryInput ? CONTINENT_COUNTRIES[countryInput.trim().toLowerCase()] : undefined
  // Busca ampla — sem país específico resolvido (nem passado, nem um
  // continente) e sem região — diversifica por país no ORDER BY em vez de
  // alfabético puro. Sem isso, os resultados ficam dominados por qualquer
  // país cujos nomes de hotel comecem cedo no alfabeto, mesmo quando outro
  // país tem mais opções reais no catálogo.
  const diversifyByCountry = !region && (!countryInput || Boolean(continentCountries))

  let baseQuery = `
    SELECT h.id, h.name, h.entity_type, h.location, h.region, h.country, h.tags, h.profiles,
           COUNT(*) FILTER (WHERE r.status = 'published')::int AS tested_count,
           EXISTS (SELECT 1 FROM tdg_hotel_benefits b WHERE b.hotel_id = h.id) AS has_negotiated_benefits
    FROM tdg_hotels h
    LEFT JOIN tdg_hotel_reviews r ON r.hotel_id = h.id
    WHERE 1=1
  `
  const params: unknown[] = []
  let i = 1
  if (query) { baseQuery += ` AND h.name ILIKE $${i++}`; params.push(`%${query}%`) }
  if (region) { baseQuery += ` AND h.region ILIKE $${i++}`; params.push(`%${region}%`) }
  if (continentCountries) {
    baseQuery += ` AND h.country = ANY($${i++})`
    params.push(continentCountries)
  } else if (countryInput) {
    baseQuery += ` AND h.country ILIKE $${i++}`
    params.push(`%${countryInput}%`)
  }
  if (entityType) { baseQuery += ` AND h.entity_type = $${i++}`; params.push(entityType) }
  if (profiles?.length) { baseQuery += ` AND h.profiles && $${i++}`; params.push(profiles) }
  // tags é texto livre — busca parcial case-insensitive em vez de match
  // exato de array, pra não depender do modelo acertar a grafia idêntica.
  if (tags?.length) {
    baseQuery += ` AND EXISTS (SELECT 1 FROM unnest(h.tags) AS tg WHERE tg ILIKE ANY($${i++}))`
    params.push(tags.map(t => `%${t}%`))
  }
  baseQuery += ` GROUP BY h.id`

  // Round-robin por país (rn=1 de cada país primeiro, depois rn=2...)
  // garante a maior diversidade geográfica possível dentro do LIMIT —
  // com 16 países europeus e limit=10, por exemplo, vem 1 hotel de 10
  // países diferentes em vez de 10 hotéis do mesmo país.
  const sqlQuery = diversifyByCountry
    ? `SELECT * FROM (
         SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.country ORDER BY s.name) AS rn
         FROM (${baseQuery}) s
       ) ranked ORDER BY rn, country LIMIT $${i++}`
    : `${baseQuery} ORDER BY h.name LIMIT $${i++}`
  params.push(limit)

  const { rows } = await sql.query(sqlQuery, params)
  return { suppliers: rows, total: rows.length }
}

export async function getTdgSupplierDetails(args: Record<string, unknown>) {
  const hotelId = args.hotel_id as string

  const [hotel, benefits, contacts, reviews] = await Promise.all([
    sql`SELECT * FROM tdg_hotels WHERE id = ${hotelId}`,
    sql`SELECT category, description, commission_pct FROM tdg_hotel_benefits WHERE hotel_id = ${hotelId} ORDER BY created_at DESC`,
    sql`SELECT name, surname, title, email, whatsapp FROM tdg_hotel_contacts WHERE hotel_id = ${hotelId}`,
    sql`
      SELECT agent_name, agency_name, visit_date, overall_rating, highlights, client_profile, must_experience, heads_up
      FROM tdg_hotel_reviews
      WHERE hotel_id = ${hotelId} AND status = 'published'
      ORDER BY visit_date DESC NULLS LAST
      LIMIT 5
    `,
  ])

  if (!hotel.rows[0]) return { error: 'Fornecedor não encontrado' }

  return {
    supplier: hotel.rows[0],
    negotiated_benefits: benefits.rows,
    contacts: contacts.rows,
    recent_reviews: reviews.rows,
  }
}

export async function searchTdgOffers(args: Record<string, unknown>) {
  const query = (args.query as string | undefined)?.toLowerCase().trim()
  const limit = (args.limit as number | undefined) ?? 10

  const offers = await getOffers()
  const filtered = query
    ? offers.filter(o => o.hotel_name.toLowerCase().includes(query))
    : offers

  return { offers: filtered.slice(0, limit), total: filtered.length }
}

export async function searchReviews(args: Record<string, unknown>) {
  const hotel_name = args.hotel_name as string | undefined
  const visit_type = args.visit_type as string | undefined
  const limit = (args.limit as number | undefined) ?? 10

  const { rows } =
    hotel_name && visit_type
      ? await sql`
          SELECT id, hotel_name, country, agent_name, agency_name, visit_date, visit_type,
                 overall_rating, highlights, client_profile, must_experience, heads_up, created_at
          FROM tdg_hotel_reviews
          WHERE hotel_name ILIKE ${'%' + hotel_name + '%'}
            AND visit_type = ${visit_type}
            AND status = 'published'
          ORDER BY visit_date DESC NULLS LAST
          LIMIT ${limit}
        `
      : hotel_name
      ? await sql`
          SELECT id, hotel_name, country, agent_name, agency_name, visit_date, visit_type,
                 overall_rating, highlights, client_profile, must_experience, heads_up, created_at
          FROM tdg_hotel_reviews
          WHERE hotel_name ILIKE ${'%' + hotel_name + '%'}
            AND status = 'published'
          ORDER BY visit_date DESC NULLS LAST
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, hotel_name, country, agent_name, agency_name, visit_date, visit_type,
                 overall_rating, highlights, client_profile, must_experience, heads_up, created_at
          FROM tdg_hotel_reviews
          WHERE status = 'published'
          ORDER BY visit_date DESC NULLS LAST
          LIMIT ${limit}
        `

  return { reviews: rows, total: rows.length }
}

export async function getReview(args: Record<string, unknown>) {
  const { rows } = await sql`
    SELECT * FROM tdg_hotel_reviews WHERE id = ${args.review_id as string}
  `
  return { review: rows[0] ?? null }
}

export async function listHotelTips(args: Record<string, unknown>) {
  const hotel_name = args.hotel_name as string

  const { rows } = await sql`
    SELECT agent_name, agency_name, visit_date, visit_type,
           overall_rating, highlights, client_profile, must_experience, heads_up
    FROM tdg_hotel_reviews
    WHERE hotel_name ILIKE ${'%' + hotel_name + '%'}
      AND status = 'published'
    ORDER BY visit_date DESC NULLS LAST
  `

  const allHighlights: string[] = rows.flatMap((r) => {
    const h = r.highlights
    if (Array.isArray(h)) return h as string[]
    if (typeof h === 'string') {
      try { return JSON.parse(h) as string[] } catch { return [h] }
    }
    return []
  })

  const avgRating =
    rows.length > 0
      ? (rows.reduce((s, r) => s + (Number(r.overall_rating) || 0), 0) / rows.length).toFixed(1)
      : null

  return {
    hotel_name,
    total_reviews: rows.length,
    avg_rating: avgRating,
    highlights: allHighlights,
    reviews: rows,
  }
}

export async function registerTip(args: Record<string, unknown>) {
  const {
    hotel_name, country, agent_name, agency_name,
    visit_type, visit_date, overall_rating,
    highlights = [], client_profile, must_experience, heads_up,
  } = args as Record<string, unknown>

  // Marca de origem — pra distinguir na UI (ex: inbox do Max) o que veio
  // via WhatsApp/register_tip do que foi registrado direto no app.
  await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS source TEXT`
  await sql`ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS created_by TEXT`

  // Try to find the advisor by name in tdg_users
  const { rows: userRows } = await sql`
    SELECT id FROM tdg_users WHERE name ILIKE ${'%' + (agent_name as string) + '%'} LIMIT 1
  `
  const agentId = userRows[0]?.id ?? null

  // Toda review liga a um fornecedor real no catálogo — mesma lógica de
  // find-or-create de src/app/api/reviews/route.ts (POST). Sem isso a review
  // do Max ficava órfã (hotel_id null), invisível em qualquer tela que
  // agrupa/filtra pelo catálogo em vez do texto livre hotel_name.
  const trimmedName = String(hotel_name).trim()
  let hotelId: string | null = null
  {
    const { rows: existingHotel } = await sql`
      SELECT id FROM tdg_hotels WHERE lower(trim(name)) = lower(${trimmedName}) AND entity_type = 'hotel'
    `
    if (existingHotel[0]) {
      hotelId = existingHotel[0].id as string
    } else {
      const { rows: createdHotel } = await sql`
        INSERT INTO tdg_hotels (name, entity_type, country, location) VALUES (${trimmedName}, 'hotel', ${(country as string) ?? null}, ${(country as string) ?? null})
        ON CONFLICT (lower(trim(name)), entity_type) WHERE agency_id IS NULL DO NOTHING
        RETURNING id
      `
      if (createdHotel[0]) {
        hotelId = createdHotel[0].id as string
      } else {
        const { rows: racedHotel } = await sql`
          SELECT id FROM tdg_hotels WHERE lower(trim(name)) = lower(${trimmedName}) AND entity_type = 'hotel'
        `
        hotelId = racedHotel[0]?.id ?? null
      }
    }
  }

  const { rows } = await sql`
    INSERT INTO tdg_hotel_reviews
      (hotel_name, hotel_id, country, agent_id, agent_name, agency_name, visit_date, visit_type,
       overall_rating, highlights, client_profile, must_experience, heads_up, status, source)
    VALUES (
      ${trimmedName},
      ${hotelId},
      ${(country as string) ?? null},
      ${agentId},
      ${agent_name as string},
      ${agency_name as string},
      ${(visit_date as string) ?? null},
      ${(visit_type as string) ?? null},
      ${(overall_rating as number) ?? null},
      ${JSON.stringify(highlights)},
      ${(client_profile as string) ?? null},
      ${(must_experience as string) ?? null},
      ${(heads_up as string) ?? null},
      'published',
      'max_whatsapp'
    )
    RETURNING id, hotel_name, agent_name, created_at
  `

  return { success: true, review: rows[0] }
}

export async function callMcpTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'search_tdg_suppliers':    return searchTdgSuppliers(args)
    case 'get_tdg_supplier_details': return getTdgSupplierDetails(args)
    case 'search_tdg_offers':       return searchTdgOffers(args)
    case 'search_reviews':          return searchReviews(args)
    case 'get_review':              return getReview(args)
    case 'list_hotel_tips':         return listHotelTips(args)
    case 'register_tip':            return registerTip(args)
    default:                        return { error: `Tool not found: ${name}` }
  }
}
