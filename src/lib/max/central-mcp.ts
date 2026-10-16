/* Bemgsy Central via MCP (16/10/2026). No GPT Maker o Max tinha, além das
   ferramentas do TDG Flow, seis ferramentas de LEITURA do Bemgsy Central:
   hotéis representados, fichas/FAQs/SOPs/treinamentos (materiais) e ofertas.
   O servidor MCP do Central (`functions/v1/mcp-server`) autentica com
   `Authorization: Bearer <agent token>` (tabela mcp_agent_tokens) — o mesmo
   token que o GPT Maker usava no OAuth. Aqui chamamos o JSON-RPC direto.
   Sem token configurado, o Max simplesmente não tem essas ferramentas. */

import type Anthropic from '@anthropic-ai/sdk'

export const CENTRAL_READ_TOOLS = ['search_hotels', 'get_hotel_details', 'search_materials', 'get_material_content', 'search_offers', 'get_offer_details'] as const
export type CentralConfig = { url: string; token: string }

export function readCentralConfig(env: Record<string, string | undefined>): CentralConfig | null {
  const url = (env.BEMGSY_CENTRAL_MCP_URL ?? '').trim().replace(/\/+$/, '')
  const token = (env.BEMGSY_CENTRAL_MCP_TOKEN ?? '').trim()
  return /^https:\/\/\S+$/.test(url) && token ? { url, token } : null
}

type Rpc = { jsonrpc: '2.0'; id: number; result?: Record<string, unknown>; error?: { message?: string } }

async function rpc(config: CentralConfig, method: string, params: Record<string, unknown>, fetchImpl: typeof fetch): Promise<Record<string, unknown>> {
  const res = await fetchImpl(config.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${config.token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Central MCP ${res.status}`)
  const body = await res.json() as Rpc
  if (body.error) throw new Error(body.error.message ?? 'erro do Central MCP')
  return body.result ?? {}
}

let cache: { at: number; tools: Anthropic.Tool[] } | null = null
const CACHE_MS = 10 * 60 * 1000

/* Definições das seis ferramentas de leitura, vindas do próprio servidor
   (schema sempre o atual), cacheadas 10 min. Falha = lista vazia, nunca erro:
   o Max continua funcionando só com o TDG Flow. */
export async function centralToolDefinitions(config: CentralConfig | null, fetchImpl: typeof fetch = fetch): Promise<Anthropic.Tool[]> {
  if (!config) return []
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.tools
  try {
    const result = await rpc(config, 'tools/list', {}, fetchImpl)
    const list = Array.isArray(result.tools) ? result.tools as Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> : []
    const tools = list
      .filter(t => (CENTRAL_READ_TOOLS as readonly string[]).includes(t.name))
      .map(t => ({ name: t.name, description: t.description ?? '', input_schema: (t.inputSchema ?? { type: 'object', properties: {} }) as Anthropic.Tool['input_schema'] }))
    cache = { at: Date.now(), tools }
    return tools
  } catch (err) {
    console.warn('[max] Central MCP indisponível, seguindo só com o Flow', { error: err instanceof Error ? err.message : String(err) })
    return []
  }
}

export function isCentralTool(name: string): boolean {
  return (CENTRAL_READ_TOOLS as readonly string[]).includes(name)
}

export async function callCentralTool(config: CentralConfig, name: string, args: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  if (!isCentralTool(name)) return { error: `ferramenta do Central não permitida: ${name}` }
  const result = await rpc(config, 'tools/call', { name, arguments: args }, fetchImpl)
  const content = Array.isArray(result.content) ? result.content as Array<{ type: string; text?: string }> : []
  const text = content.filter(c => c.type === 'text' && c.text).map(c => c.text).join('\n')
  if (!text) return result
  try { return JSON.parse(text) } catch { return { text } }
}

export function resetCentralToolCache(): void { cache = null }
