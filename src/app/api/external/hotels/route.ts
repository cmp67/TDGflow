import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rota server-to-server pro Gonna Travel GUEST consumir o catálogo/acervo
// privado do TDG Flow (handoff 19/08 — sugestões "Do Acervo" na tela de
// Cotação). Segue o mesmo padrão de bearer secret já usado em
// AGENT_SECRET/MCP_SECRET (src/app/api/agent/verify-user, src/app/api/mcp)
// — nenhuma auth nova inventada.
//
// Diferente desses dois: aqui a chave FALTANDO falha fechado (401), não
// aberto. AGENT_SECRET/MCP_SECRET desligam a checagem se a env var estiver
// vazia (bom pra dev local antigo, ruim pra uma rota nova que expõe dado
// de uma rede inteira pra um sistema de outra empresa) — não repetir esse
// comportamento aqui.
const EXTERNAL_SECRET = (process.env.TDG_FLOW_API_SECRET ?? '').trim()

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

// Shape deliberadamente mais enxuto que HotelRow (src/app/api/hotels/route.ts)
// — este endpoint atravessa fronteira de empresa (Gonna Travel GUEST não é
// o mesmo produto/dono que o TDG Flow, mesmo a agência sendo afiliada à
// rede). Fica de fora: created_by (e-mail interno de quem cadastrou),
// can_edit (permissão que só faz sentido dentro do Flow) e benefits
// (comissão negociada — dado comercial sensível da rede, não é pra
// vazar pra um sistema de terceiro). Se o GUEST precisar de mais campos,
// adicionar sob pedido explícito, não por default.
interface ExternalHotelRow {
  id: string
  name: string
  entity_type: string
  location: string | null
  region: string | null
  country: string | null
  description: string | null
  image_url: string | null
  tags: string[] | null
  profiles: string[] | null
  agency_id: string | null
  is_private: boolean
}

export async function GET(req: NextRequest) {
  if (!EXTERNAL_SECRET) {
    return NextResponse.json({ error: 'Rota não configurada (TDG_FLOW_API_SECRET ausente)' }, { status: 401 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (token !== EXTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // new URL(req.url) em vez de req.nextUrl — nextUrl só existe quando o
  // objeto passa pelo runtime real do Next.js; testável com Request puro assim.
  const { searchParams } = new URL(req.url)
  const destino = searchParams.get('destino')?.trim() || undefined
  const agencyIdParam = searchParams.get('agency_id')?.trim() || undefined
  const limitParam = Number(searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT

  // Mesma regra de visibilidade do catálogo interno (GET /api/hotels):
  // compartilhado com a rede (agency_id NULL) sempre visível; privado só
  // aparece quando o chamador pede explicitamente pela própria agência.
  // Sem agency_id no pedido, só o catálogo compartilhado — nunca vaza
  // acervo privado de agência nenhuma por omissão.
  let sqlQuery = `
    SELECT h.id, h.name, h.entity_type, h.location, h.region, h.country, h.description,
           h.image_url, h.tags, h.profiles, h.agency_id, (h.agency_id IS NOT NULL) AS is_private
    FROM tdg_hotels h
    WHERE 1=1
  `
  const params: unknown[] = []
  let i = 1

  if (agencyIdParam) {
    sqlQuery += ` AND (h.agency_id IS NULL OR h.agency_id = $${i++}::uuid)`
    params.push(agencyIdParam)
  } else {
    sqlQuery += ' AND h.agency_id IS NULL'
  }

  if (destino) {
    sqlQuery += ` AND (h.location ILIKE $${i} OR h.region ILIKE $${i} OR h.country ILIKE $${i})`
    params.push(`%${destino}%`)
    i++
  }

  sqlQuery += ` ORDER BY h.name LIMIT $${i++}`
  params.push(limit)

  const { rows } = await sql.query<ExternalHotelRow>(sqlQuery, params)
  return NextResponse.json({ hotels: rows, total: rows.length })
}
