import { NextRequest, NextResponse } from 'next/server'
import { TOOL_DEFINITIONS, callMcpTool } from '@/lib/mcp-tools'

export const dynamic = 'force-dynamic'

const MCP_SECRET = (process.env.MCP_SECRET ?? '').trim()

// ── Tool definitions ──────────────────────────────────────────────
//
// search_tdg_*/get_tdg_* — prefixo deliberado: outro MCP já conectado
// (Bemgsy Central, apelidado sem querer de "bemgsy-flow" numa sessão
// anterior — nada a ver com este projeto) também tem search_hotels/
// get_hotel_details. Nomes diferentes evitam colisão se o GUEST um dia
// conectar nos dois MCPs ao mesmo tempo.
//
// Implementações vivem em src/lib/mcp-tools.ts (Fase 8e, 02/08) —
// reaproveitadas pelo chat in-app do TDG Flow (src/app/api/chat/route.ts),
// que antes só tinha acesso a tabelas legadas vazias.

const TOOLS = TOOL_DEFINITIONS.map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.input_schema,
}))

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

      if (!name) return err(id, -32602, 'Missing tool name')

      try {
        const result = await callMcpTool(name, args)
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
