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

describe('contato → fornecedor automático + fonte (16/10/2026)', () => {
  const suffix = Date.now()
  const email = `tdd-contact-supplier-${suffix}@example.com`
  const org = `__TDD Tekser DMC ${suffix}__`
  const ids: string[] = []
  const supplierIds: string[] = []

  beforeAll(async () => {
    await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES ('TDD Tester', ${email}, '__TDD_AGENCY__', 'x', 'agent')`
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    if (ids.length) await sql`DELETE FROM tdg_hotel_contacts WHERE id = ANY(${ids})`
    if (supplierIds.length) { await sql`DELETE FROM tdg_hotel_reviews WHERE hotel_id = ANY(${supplierIds})`; await sql`DELETE FROM tdg_hotels WHERE id = ANY(${supplierIds})` }
    await sql`DELETE FROM tdg_hotels WHERE name = ${org}`
  })

  it('DMC com organização cria o card do fornecedor (tipo dmc) e vincula; segundo contato reaproveita', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({ name: 'Duygu', surname: 'Argin', category: 'dmc', organization: org, source_kind: 'feira', source_detail: 'ILTM 2026' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    ids.push(body.contact.id)
    expect(body.supplier_created).toBe(true)
    expect(body.contact.hotel_id).toBeTruthy()
    expect(body.contact.category).toBe('dmc')
    expect(body.contact.added_by_email).toBe(email)
    expect(body.contact.source_kind).toBe('feira')
    supplierIds.push(body.contact.hotel_id)
    const { rows } = await sql`SELECT entity_type, created_by FROM tdg_hotels WHERE id = ${body.contact.hotel_id}`
    expect(rows[0]).toEqual({ entity_type: 'dmc', created_by: email })
    // card nasce como descoberta ("Aguardando teste") em nome de quem cadastrou, com a fonte
    const { rows: leads } = await sql`SELECT status, visit_type, heads_up, source FROM tdg_hotel_reviews WHERE hotel_id = ${body.contact.hotel_id}`
    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({ status: 'a_testar', visit_type: 'commercial_meeting', source: 'contact' })
    expect(leads[0].heads_up).toContain('Feira: ILTM 2026')

    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res2 = await POST(postReq({ name: 'Nilay', surname: 'Firil', category: 'dmc', organization: org.toUpperCase() }))
    const body2 = await res2.json()
    ids.push(body2.contact.id)
    expect(body2.supplier_created).toBe(false)
    expect(body2.contact.hotel_id).toBe(body.contact.hotel_id)
  })

  it('aérea com organização continua pessoa avulsa, sem card', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq({ name: 'Ana', surname: 'Aérea', category: 'aérea', organization: `__TDD Cia Aérea ${suffix}__` }))
    const body = await res.json()
    ids.push(body.contact.id)
    expect(body.contact.hotel_id).toBeNull()
    expect(body.supplier_created).toBe(false)
  })

  it('fonte inválida é recusada', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    expect((await POST(postReq({ name: 'X', surname: 'Y', category: 'guia', source_kind: 'linkedin' }))).status).toBe(400)
  })
})
