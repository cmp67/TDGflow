import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, PATCH } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function getReq(query: string) {
  return new NextRequest(`http://localhost/api/pending-content?${query}`)
}

function patchReq(body: unknown) {
  return new Request('http://localhost/api/pending-content', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0]
}

// Achado real, 06/08/2026: scope=mine com nome vazio virava ILIKE '%%',
// vazando os itens pendentes de TODA a rede pra qualquer conta sem nome
// cadastrado. E o PATCH (approve/edit/delete) não verificava permissão
// nenhuma — só a tela escondia o botão, a API aceitava de qualquer um.
describe('GET /api/pending-content — scope=mine nunca vaza a fila inteira', () => {
  const emailSemNome = `__tdd_pending_sem_nome_${Date.now()}__@example.com`
  const emailComNome = `__tdd_pending_com_nome_${Date.now()}__@example.com`
  const hotelName = `__TDD Pending Hotel ${Date.now()}__`
  let reviewId: string

  beforeAll(async () => {
    // name = '' — reproduz exatamente o cenário do achado (usuário sem
    // nome cadastrado no banco).
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('', ${emailSemNome}, '__TDD_AGENCY__', 'x', 'agent')
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Nome Real', ${emailComNome}, '__TDD_AGENCY__', 'x', 'agent')
    `
    const { rows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, source_author, import_approval)
      VALUES (${hotelName}, 'TDD Agent', '__TDD_AGENCY__', 'Alguém de Outra Agência', 'pending')
      RETURNING id
    `
    reviewId = rows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotel_reviews WHERE id = ${reviewId}`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailSemNome}, ${emailComNome})`
  })

  it('usuário sem nome cadastrado recebe lista vazia, nunca a fila inteira', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailSemNome))
    const res = await GET(getReq('scope=mine'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })

  it('usuário com nome real não vê item de outro autor (sem match, sem vazar)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailComNome))
    const res = await GET(getReq('scope=mine'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items.find((i: { id: string }) => i.id === reviewId)).toBeUndefined()
  })
})

describe('PATCH /api/pending-content — exige ser admin ou dono do item', () => {
  const emailEstranho = `__tdd_pending_estranho_${Date.now()}__@example.com`
  const hotelName = `__TDD Pending Auth Hotel ${Date.now()}__`
  let reviewId: string

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Estranho', ${emailEstranho}, '__TDD_AGENCY__', 'x', 'agent')
    `
    const { rows } = await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, source_author, import_approval)
      VALUES (${hotelName}, 'TDD Agent', '__TDD_AGENCY__', 'Alguém de Outra Agência', 'pending')
      RETURNING id
    `
    reviewId = rows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_hotel_reviews WHERE id = ${reviewId}`
    await sql`DELETE FROM tdg_users WHERE email = ${emailEstranho}`
  })

  it('usuário que não é admin nem autor não consegue aprovar', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailEstranho))
    const res = await PATCH(patchReq({ id: reviewId, content_type: 'review', action: 'approve' }))
    expect(res.status).toBe(403)

    const { rows } = await sql`SELECT import_approval FROM tdg_hotel_reviews WHERE id = ${reviewId}`
    expect(rows[0].import_approval).toBe('pending')
  })

  it('usuário que não é admin nem autor não consegue apagar', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailEstranho))
    const res = await PATCH(patchReq({ id: reviewId, content_type: 'review', action: 'delete' }))
    expect(res.status).toBe(403)

    const { rows } = await sql`SELECT id FROM tdg_hotel_reviews WHERE id = ${reviewId}`
    expect(rows).toHaveLength(1)
  })
})
