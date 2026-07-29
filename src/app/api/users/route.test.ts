import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST, PATCH } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string, role = 'admin', name = 'TDD Admin') {
  return { user: { email, role, name } }
}

function req(body: unknown) {
  return new Request('http://localhost/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('gestão de usuários — criação e promoção de papel', () => {
  const adminEmail = `__tdd_admin_${Date.now()}__@example.com`
  const createdEmails: string[] = []
  let userId: string

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await sql.query('DELETE FROM tdg_audit_log WHERE entity_type = $1', ['user_role'])
      await sql.query('DELETE FROM tdg_users WHERE email = ANY($1)', [createdEmails])
    }
  })

  it('POST bloqueado pra quem não é admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('agent@example.com', 'agent'))
    const res = await POST(req({ name: 'X', email: 'x@example.com', agency_name: 'X', password: 'senha1234', whatsapp: '5511999999999' }))
    expect(res.status).toBe(403)
  })

  it('POST admin cria usuário agent por padrão', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const email = `__tdd_user_${Date.now()}__@example.com`
    const res = await POST(req({ name: 'Novo Agente', email, agency_name: 'TDD Agency', password: 'senha1234', whatsapp: '5511999999999' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    createdEmails.push(email)
    userId = body.user.id
    expect(body.user.role).toBe('agent')
  })

  it('PATCH promove agent para agency_admin, registra log com nome/email de quem mudou', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await PATCH(req({ id: userId, role: 'agency_admin' }))
    expect(res.status).toBe(200)

    const { rows } = await sql`SELECT role FROM tdg_users WHERE id = ${userId}`
    expect(rows[0].role).toBe('agency_admin')

    const { rows: log } = await sql`SELECT summary FROM tdg_audit_log WHERE entity_type = 'user_role' AND entity_id = ${userId}`
    expect(log.some(l => l.summary.includes('Admin de Agência'))).toBe(true)
  })

  it('PATCH pra mesma role não duplica log', async () => {
    const { rows: before } = await sql`SELECT COUNT(*)::int AS count FROM tdg_audit_log WHERE entity_type = 'user_role' AND entity_id = ${userId}`
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    await PATCH(req({ id: userId, role: 'agency_admin' }))
    const { rows: after } = await sql`SELECT COUNT(*)::int AS count FROM tdg_audit_log WHERE entity_type = 'user_role' AND entity_id = ${userId}`
    expect(after[0].count).toBe(before[0].count)
  })

  it('PATCH rejeita role inválida', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await PATCH(req({ id: userId, role: 'super_hacker' }))
    expect(res.status).toBe(400)
  })

  it('PATCH bloqueado pra quem não é admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('agent@example.com', 'agent'))
    const res = await PATCH(req({ id: userId, role: 'admin' }))
    expect(res.status).toBe(403)
  })
})
