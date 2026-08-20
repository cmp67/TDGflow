import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'
import { hash } from 'bcryptjs'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { PATCH } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function patchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// PATCH /api/profile — pedido da Carla, 20/08: campo de WhatsApp no perfil,
// é dali que o MAX resolve quem manda mensagem (GET /api/agent/verify-user
// busca por tdg_users.whatsapp).
describe('PATCH /api/profile — whatsapp', () => {
  const suffix = Date.now()
  const emailA = `tdd-profile-a-${suffix}@example.com`
  const emailB = `tdd-profile-b-${suffix}@example.com`
  let userAId: string

  beforeAll(async () => {
    const passwordHash = await hash('senha-teste-123', 4)
    const { rows: a } = await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('__TDD Profile A__', ${emailA}, '__TDD_AGENCY__', ${passwordHash}, 'agent')
      RETURNING id
    `
    userAId = a[0].id as string
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, whatsapp)
      VALUES ('__TDD Profile B__', ${emailB}, '__TDD_AGENCY__', ${passwordHash}, 'agent', ${'5511900000000' + (suffix % 100)})
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_users WHERE email IN (${emailA}, ${emailB})`
  })

  it('normaliza o número — só dígitos, sem +/espaço/traço', async () => {
    mockAuth.mockResolvedValue({ user: { email: emailA } })
    const res = await PATCH(patchRequest({ whatsapp: '+55 11 98888-7777' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.whatsapp).toBe('5511988887777')

    const { rows } = await sql`SELECT whatsapp FROM tdg_users WHERE id = ${userAId}`
    expect(rows[0].whatsapp).toBe('5511988887777')
  })

  it('rejeita número curto demais (sem código de país plausível)', async () => {
    mockAuth.mockResolvedValue({ user: { email: emailA } })
    const res = await PATCH(patchRequest({ whatsapp: '999887766' }))
    expect(res.status).toBe(400)
  })

  it('rejeita número já usado por outra conta (coluna UNIQUE)', async () => {
    mockAuth.mockResolvedValue({ user: { email: emailA } })
    const res = await PATCH(patchRequest({ whatsapp: '5511900000000' + (suffix % 100) }))
    expect(res.status).toBe(409)
  })

  it('limpa o número quando vazio', async () => {
    mockAuth.mockResolvedValue({ user: { email: emailA } })
    const res = await PATCH(patchRequest({ whatsapp: '' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.whatsapp).toBeNull()

    const { rows } = await sql`SELECT whatsapp FROM tdg_users WHERE id = ${userAId}`
    expect(rows[0].whatsapp).toBeNull()
  })

  it('exige sessão autenticada', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(patchRequest({ whatsapp: '5511988887777' }))
    expect(res.status).toBe(401)
  })
})
