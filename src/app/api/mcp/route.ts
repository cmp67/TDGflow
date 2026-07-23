import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MCP_SECRET = (process.env.MCP_SECRET ?? '').trim()

// ── Tool definitions ──────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_reviews',
    description:
      'Buscar reviews de hotéis registradas pelos Travel Advisors da rede TDG. Retorna avaliações, highlights, perfil de cliente ideal e ressalvas.',
    inputSchema: {
      type: 'object',
      properties: {
        hotel_name: { type: 'string', description: 'Nome do hotel (busca parcial, ex: "Sagres", "Velaa")' },
        visit_type: {
          type: 'string',
          enum: ['fam_trip', 'site_inspection', 'personal_stay', 'commercial_meeting'],
          description: 'Tipo de visita',
        },
        limit: { type: 'number', description: 'Máximo de resultados (default: 10)' },
      },
    },
  },
  {
    name: 'get_review',
    description: 'Obter detalhes completos de um review específico pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['review_id'],
      properties: {
        review_id: { type: 'string', description: 'UUID do review' },
      },
    },
  },
  {
    name: 'list_hotel_tips',
    description:
      'Listar dicas e highlights agregados de um hotel, consolidando todos os reviews da rede TDG. Ideal para responder "o que os advisors dizem sobre X?".',
    inputSchema: {
      type: 'object',
      required: ['hotel_name'],
      properties: {
        hotel_name: { type: 'string', description: 'Nome do hotel' },
      },
    },
  },
  {
    name: 'register_tip',
    description:
      'Registrar uma dica ou relato de visita de um Travel Advisor no TDG Flow. Use quando o TD compartilhar uma experiência ou dica via WhatsApp.',
    inputSchema: {
      type: 'object',
      required: ['hotel_name', 'agent_name', 'agency_name'],
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
    },
  },
]

// ── Tool implementations ──────────────────────────────────────────

async function searchReviews(args: Record<string, unknown>) {
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

async function getReview(args: Record<string, unknown>) {
  const { rows } = await sql`
    SELECT * FROM tdg_hotel_reviews WHERE id = ${args.review_id as string}
  `
  return { review: rows[0] ?? null }
}

async function listHotelTips(args: Record<string, unknown>) {
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

async function registerTip(args: Record<string, unknown>) {
  const {
    hotel_name, country, agent_name, agency_name,
    visit_type, visit_date, overall_rating,
    highlights = [], client_profile, must_experience, heads_up,
  } = args as Record<string, unknown>

  // Try to find the advisor by name in tdg_users
  const { rows: userRows } = await sql`
    SELECT id FROM tdg_users WHERE name ILIKE ${'%' + (agent_name as string) + '%'} LIMIT 1
  `
  const agentId = userRows[0]?.id ?? null

  const { rows } = await sql`
    INSERT INTO tdg_hotel_reviews
      (hotel_name, country, agent_id, agent_name, agency_name, visit_date, visit_type,
       overall_rating, highlights, client_profile, must_experience, heads_up, status)
    VALUES (
      ${hotel_name as string},
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
      'published'
    )
    RETURNING id, hotel_name, agent_name, created_at
  `

  return { success: true, review: rows[0] }
}

// ── JSON-RPC handler ─────────────────────────────────────────────

type JsonRpcRequest = {
  jsonrpc: string
  method: string
  params?: Record<string, unknown>
  id?: string | number | null
}

function ok(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result })
}

function err(id: string | number | null | undefined, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
}

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (MCP_SECRET && token !== MCP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: JsonRpcRequest
  try {
    body = await req.json()
  } catch {
    return err(null, -32700, 'Parse error')
  }

  const { method, params, id } = body

  // Notifications have no id — acknowledge with 204
  if (id === undefined || id === null) {
    return new NextResponse(null, { status: 204 })
  }

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'tdg-flow-mcp', version: '1.0.0' },
      })

    case 'tools/list':
      return ok(id, { tools: TOOLS })

    case 'tools/call': {
      const name = (params as { name?: string })?.name
      const args = ((params as { arguments?: Record<string, unknown> })?.arguments) ?? {}

      try {
        let result: unknown
        switch (name) {
          case 'search_reviews':   result = await searchReviews(args);   break
          case 'get_review':       result = await getReview(args);        break
          case 'list_hotel_tips':  result = await listHotelTips(args);    break
          case 'register_tip':     result = await registerTip(args);      break
          default:
            return err(id, -32601, `Tool not found: ${name}`)
        }
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(result) }] })
      } catch (e) {
        console.error(`[MCP tools/call] ${name}:`, e)
        return err(id, -32603, String(e))
      }
    }

    default:
      return err(id, -32601, `Method not found: ${method}`)
  }
}

export async function GET() {
  return NextResponse.json({ name: 'tdg-flow-mcp', version: '1.0.0', status: 'ok' })
}
