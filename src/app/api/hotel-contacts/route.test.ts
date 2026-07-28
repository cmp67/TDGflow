import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST, DELETE } from './route'

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

function getReq(params: string) {
  return new NextRequest(`http://localhost/api/hotel-contacts?${params}`)
}

function deleteReq(id: string) {
  return new NextRequest(`http://localhost/api/hotel-contacts?id=${id}`)
}

describe('Contact Hub — contatos com ou sem fornecedor vinculado', () => {
  const email = `tdd-hotel-contacts-${Date.now()}@example.com`
  let hotelId: string
  const createdContactIds: string[] = []

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_hotels (name) VALUES (${`__TDD Hotel Contatos ${Date.now()}__`}) RETURNING id, name
    `
    hotelId = rows[0].id as string
  })

  afterAll(async () => {
    if (createdContactIds.length > 0) {
      await sql.query('DELETE FROM tdg_hotel_contacts WHERE id = ANY($1)', [createdContactIds])
    }
    await sql`DELETE FROM tdg_hotels WHERE id = ${hotelId}`
  })

  it('POST com hotelId — category default "hotel", organization vem do nome do fornecedor', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({ hotelId, name: 'João', surname: 'Silva' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    createdContactIds.push(body.contact.id)
    expect(body.contact.category).toBe('hotel')
    expect(body.contact.organization).toContain('__TDD Hotel Contatos')
    expect(body.contact.hotel_id).toBe(hotelId)
  })

  it('GET por hotelId continua trazendo os contatos daquela ficha', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq(`hotelId=${hotelId}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contacts.some((c: { id: string }) => createdContactIds.includes(c.id))).toBe(true)
  })

  it('POST sem hotelId exige category (pessoa avulsa precisa de um papel)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({ name: 'Maria', surname: 'Advogada' }))
    expect(res.status).toBe(400)
  })

  it('POST sem hotelId, com category — cria contato avulso (pessoa sem fornecedor)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({
      name: 'Maria', surname: 'Advogada', category: 'jurídico', organization: 'Escritório Maria & Associados',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    createdContactIds.push(body.contact.id)
    expect(body.contact.hotel_id).toBeNull()
    expect(body.contact.category).toBe('jurídico')
    expect(body.contact.organization).toBe('Escritório Maria & Associados')
  })

  it('GET sem hotelId (lente Contatos) traz avulsos e vinculados juntos, com counts por categoria', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq(''))
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = body.contacts.map((c: { id: string }) => c.id)
    expect(createdContactIds.every(id => ids.includes(id))).toBe(true)
    expect(body.counts.hotel).toBeGreaterThanOrEqual(1)
    expect(body.counts['jurídico']).toBeGreaterThanOrEqual(1)
  })

  it('GET com category filtra só a categoria pedida', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await GET(getReq('category=jurídico'))
    const body = await res.json()

    expect(body.contacts.every((c: { category: string }) => c.category === 'jurídico')).toBe(true)
  })

  it('DELETE remove o contato', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const createRes = await POST(postReq({ name: 'Temp', surname: 'Pra Apagar', category: 'outro' }))
    const created = (await createRes.json()).contact

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const delRes = await DELETE(deleteReq(created.id))
    expect(delRes.status).toBe(200)
  })
})
