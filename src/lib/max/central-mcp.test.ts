import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readCentralConfig, centralToolDefinitions, callCentralTool, isCentralTool, resetCentralToolCache } from './central-mcp'

const config = { url: 'https://x.supabase.co/functions/v1/mcp-server', token: 'tok' }
const rpcOk = (result: unknown) => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), { status: 200 })

beforeEach(() => resetCentralToolCache())

describe('Central MCP para o Max', () => {
  it('config só com url https e token', () => {
    expect(readCentralConfig({})).toBeNull()
    expect(readCentralConfig({ BEMGSY_CENTRAL_MCP_URL: 'https://a/b/', BEMGSY_CENTRAL_MCP_TOKEN: 't' })).toEqual({ url: 'https://a/b', token: 't' })
  })
  it('tools/list filtra só as seis de leitura e manda o Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rpcOk({ tools: [
      { name: 'search_materials', description: 'm', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } },
      { name: 'create_invoice', description: 'nunca', inputSchema: { type: 'object' } },
    ] }))
    const tools = await centralToolDefinitions(config, fetchMock)
    expect(tools.map(t => t.name)).toEqual(['search_materials'])
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer tok')
    expect(await centralToolDefinitions(config, fetchMock)).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // cache
  })
  it('sem config ou com erro, lista vazia (Max segue só com o Flow)', async () => {
    expect(await centralToolDefinitions(null)).toEqual([])
    expect(await centralToolDefinitions(config, vi.fn().mockResolvedValue(new Response('x', { status: 500 })))).toEqual([])
  })
  it('tools/call devolve o JSON do texto; ferramenta de escrita é recusada antes de chamar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rpcOk({ content: [{ type: 'text', text: JSON.stringify({ materials: [{ title: 'FAQ' }] }) }] }))
    expect(await callCentralTool(config, 'search_materials', { query: 'kids' }, fetchMock)).toEqual({ materials: [{ title: 'FAQ' }] })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).params).toEqual({ name: 'search_materials', arguments: { query: 'kids' } })
    expect(isCentralTool('create_invoice')).toBe(false)
    expect(await callCentralTool(config, 'create_invoice', {}, fetchMock)).toMatchObject({ error: expect.stringContaining('não permitida') })
  })
})
