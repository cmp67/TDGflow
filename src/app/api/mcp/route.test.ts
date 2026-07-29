import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { POST } from './route'

const SECRET = (process.env.MCP_SECRET ?? '').trim()

function rpcReq(method: string, params?: Record<string, unknown>, id: number | string = 1) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id }),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('MCP — ferramentas novas pro GUEST consumir (search_tdg_suppliers/get_tdg_supplier_details/search_tdg_offers)', () => {
  let hotelId: string
  const hotelName = `__TDD MCP Supplier ${Date.now()}__`

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_hotels (name, entity_type, region, country, profiles)
      VALUES (${hotelName}, 'hotel', '__TDD Region__', '__TDD Country__', ARRAY['Família'])
      RETURNING id
    `
    hotelId = rows[0].id as string
    await sql`
      INSERT INTO tdg_hotel_benefits (hotel_id, category, description, commission_pct, created_by)
      VALUES (${hotelId}, 'comissao', 'Teste MCP', 12, 'tdd@example.com')
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotel_benefits WHERE hotel_id = ${hotelId}`
    await sql`DELETE FROM tdg_hotels WHERE id = ${hotelId}`
  })

  it('rejeita token errado', async () => {
    const res = await POST(new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer errado' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    }) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('tools/list inclui as 3 ferramentas novas com prefixo tdg_', async () => {
    const res = await POST(rpcReq('tools/list'))
    const body = await res.json()
    const names = body.result.tools.map((t: { name: string }) => t.name)
    expect(names).toContain('search_tdg_suppliers')
    expect(names).toContain('get_tdg_supplier_details')
    expect(names).toContain('search_tdg_offers')
  })

  it('search_tdg_suppliers acha o fornecedor por região e perfil, sinaliza condição negociada', async () => {
    const res = await POST(rpcReq('tools/call', {
      name: 'search_tdg_suppliers',
      arguments: { region: '__TDD Region__', profiles: ['Família'] },
    }))
    const body = await res.json()
    const result = JSON.parse(body.result.content[0].text)

    expect(result.suppliers.some((s: { id: string }) => s.id === hotelId)).toBe(true)
    const found = result.suppliers.find((s: { id: string }) => s.id === hotelId)
    expect(found.has_negotiated_benefits).toBe(true)
  })

  it('get_tdg_supplier_details traz o benefício negociado', async () => {
    const res = await POST(rpcReq('tools/call', {
      name: 'get_tdg_supplier_details',
      arguments: { hotel_id: hotelId },
    }))
    const body = await res.json()
    const result = JSON.parse(body.result.content[0].text)

    expect(result.supplier.id).toBe(hotelId)
    expect(result.negotiated_benefits).toHaveLength(1)
    expect(result.negotiated_benefits[0].commission_pct).toBe('12.00')
  })

  it('get_tdg_supplier_details com id inexistente retorna erro claro, não quebra', async () => {
    const res = await POST(rpcReq('tools/call', {
      name: 'get_tdg_supplier_details',
      arguments: { hotel_id: '00000000-0000-0000-0000-000000000000' },
    }))
    const body = await res.json()
    const result = JSON.parse(body.result.content[0].text)
    expect(result.error).toBeTruthy()
  })

  it('search_tdg_offers retorna a lista (Bemgsy Central pode estar vazio no ambiente de teste, mas não deve quebrar)', async () => {
    const res = await POST(rpcReq('tools/call', { name: 'search_tdg_offers', arguments: {} }))
    const body = await res.json()
    const result = JSON.parse(body.result.content[0].text)
    expect(Array.isArray(result.offers)).toBe(true)
  })
})
