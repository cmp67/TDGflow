import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email, name: 'TDD Tester' } }
}

function postReq(body: unknown) {
  return new Request('http://localhost/api/hotel-contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function getReq(hotelId: string) {
  return new NextRequest(`http://localhost/api/hotel-contacts?hotelId=${hotelId}`)
}

describe('POST /api/hotel-contacts (Fase 5 — contato de hotel também é contato de rede)', () => {
  const email = `tdd-hotel-contacts-${Date.now()}@example.com`
  let hotelId: string
  let contactId: string

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_hotels (name) VALUES (${`__TDD Hotel Contatos ${Date.now()}__`}) RETURNING id, name
    `
    hotelId = rows[0].id as string
  })

  afterAll(async () => {
    if (contactId) await sql`DELETE FROM tdg_hotel_contacts WHERE id = ${contactId}`
    await sql`DELETE FROM tdg_hotels WHERE id = ${hotelId}`
  })

  it('marca o contato como is_network_contact=true, category=hotel, e guarda o nome do hotel em organization', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({ hotelId, name: 'João', surname: 'Silva' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    contactId = body.contact.id

    const { rows } = await sql`
      SELECT is_network_contact, category, organization FROM tdg_hotel_contacts WHERE id = ${contactId}
    `
    expect(rows[0].is_network_contact).toBe(true)
    expect(rows[0].category).toBe('hotel')
    expect(rows[0].organization).toContain('__TDD Hotel Contatos')
  })

  it('continua aparecendo na ficha do hotel via GET por hotelId', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq(hotelId))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contacts.some((c: { id: string }) => c.id === contactId)).toBe(true)
  })
})
