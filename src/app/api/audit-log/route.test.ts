import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'
import { logAudit } from '@/lib/audit'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function getReq(params: string) {
  return new NextRequest(`http://localhost/api/audit-log?${params}`)
}

describe('GET /api/audit-log (trilha genérica, visível pra rede)', () => {
  const entityId = '00000000-0000-0000-0000-000000000001'

  afterAll(async () => {
    await sql`DELETE FROM tdg_audit_log WHERE entity_type = '__tdd_entity__' AND entity_id = ${entityId}`
  })

  it('retorna 401 sem sessão', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET(getReq('entityType=__tdd_entity__&entityId=' + entityId))
    expect(res.status).toBe(401)
  })

  it('exige entityType e entityId', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res = await GET(getReq(''))
    expect(res.status).toBe(400)
  })

  it('lista entradas em ordem cronológica reversa, visível a qualquer usuário autenticado', async () => {
    await logAudit({ entityType: '__tdd_entity__', entityId, action: 'create', summary: 'primeira', changedBy: 'a@example.com' })
    await logAudit({ entityType: '__tdd_entity__', entityId, action: 'update', summary: 'segunda', changedBy: 'b@example.com' })

    mockAuth.mockResolvedValueOnce(sessionFor('qualquer-agente@example.com'))
    const res = await GET(getReq('entityType=__tdd_entity__&entityId=' + entityId))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.entries.length).toBeGreaterThanOrEqual(2)
    expect(body.entries[0].summary).toBe('segunda')
  })
})
