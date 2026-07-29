import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST, DELETE } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string, name = 'TDD Tester') {
  return { user: { email, name } }
}

function postReq(body: unknown) {
  return new Request('http://localhost/api/hotel-benefits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function getReq(params: string) {
  return new NextRequest(`http://localhost/api/hotel-benefits?${params}`)
}

describe('benefícios negociados por fornecedor (comissão diferenciada, amenidade, pagamento)', () => {
  const adminEmail = `__tdd_admin_${Date.now()}__@example.com`
  const agentEmail = `__tdd_agent_${Date.now()}__@example.com`
  let hotelId: string
  const createdBenefitIds: string[] = []

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Admin', ${adminEmail}, 'TDD Agency', 'x', 'admin'),
             ('TDD Agent', ${agentEmail}, 'TDD Agency', 'x', 'agent')
    `
    const { rows } = await sql`
      INSERT INTO tdg_hotels (name) VALUES (${`__TDD Hotel Benefits ${Date.now()}__`}) RETURNING id
    `
    hotelId = rows[0].id as string
  })

  afterAll(async () => {
    if (createdBenefitIds.length > 0) {
      await sql.query('DELETE FROM tdg_hotel_benefits WHERE id = ANY($1)', [createdBenefitIds])
    }
    await sql`DELETE FROM tdg_audit_log WHERE entity_type = 'hotel_benefit' AND entity_id = ${hotelId}`
    await sql`DELETE FROM tdg_hotels WHERE id = ${hotelId}`
    await sql`DELETE FROM tdg_users WHERE email IN (${adminEmail}, ${agentEmail})`
  })

  it('POST bloqueado pra quem não é admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const res = await POST(postReq({ hotelId, category: 'comissao', description: '15%', commissionPct: 15 }))
    expect(res.status).toBe(403)
  })

  it('POST admin cria benefício de comissão com percentual, registra log', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(postReq({ hotelId, category: 'comissao', description: 'Reservas diretas', commissionPct: 15 }))
    const body = await res.json()

    expect(res.status).toBe(201)
    createdBenefitIds.push(body.benefit.id)
    expect(body.benefit.commission_pct).toBe('15.00')

    const { rows: log } = await sql`SELECT summary FROM tdg_audit_log WHERE entity_type = 'hotel_benefit' AND entity_id = ${hotelId}`
    expect(log.some(l => l.summary.includes('15') && l.summary.includes('Comissão'))).toBe(true)
  })

  it('POST amenidade não numérica ignora commissionPct mesmo se mandado', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(postReq({ hotelId, category: 'amenidade', description: 'Late checkout garantido', commissionPct: 99 }))
    const body = await res.json()

    expect(res.status).toBe(201)
    createdBenefitIds.push(body.benefit.id)
    expect(body.benefit.commission_pct).toBeNull()
  })

  it('POST rejeita categoria inválida', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(postReq({ hotelId, category: 'invalida', description: 'x' }))
    expect(res.status).toBe(400)
  })

  it('GET lista os benefícios do hotel (qualquer usuário autenticado)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const res = await GET(getReq(`hotelId=${hotelId}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.benefits.length).toBeGreaterThanOrEqual(2)
  })

  it('DELETE bloqueado pra quem não é admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const res = await DELETE(getReq(`id=${createdBenefitIds[0]}`))
    expect(res.status).toBe(403)
  })

  it('DELETE admin remove e registra log', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await DELETE(getReq(`id=${createdBenefitIds[0]}`))
    expect(res.status).toBe(200)

    const { rows: log } = await sql`SELECT summary FROM tdg_audit_log WHERE entity_type = 'hotel_benefit' AND entity_id = ${hotelId} AND action = 'delete'`
    expect(log.length).toBeGreaterThanOrEqual(1)
  })
})
