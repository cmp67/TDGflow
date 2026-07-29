import { describe, it, expect, vi, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postReq(body: unknown) {
  return new Request('http://localhost/api/short-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/short-links (idempotente por target_path)', () => {
  const testPath = `/flow/dicas?reviewId=__tdd_${Date.now()}__`
  const codes: string[] = []

  afterAll(async () => {
    if (codes.length) await sql.query('DELETE FROM tdg_short_links WHERE code = ANY($1)', [codes])
  })

  it('retorna 401 sem sessão', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(postReq({ path: testPath }))
    expect(res.status).toBe(401)
  })

  it('rejeita path que não começa com /', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('a@example.com'))
    const res = await POST(postReq({ path: 'https://evil.example.com' }))
    expect(res.status).toBe(400)
  })

  it('cria um código novo pra um path inédito', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('a@example.com'))
    const res = await POST(postReq({ path: testPath, label: 'Review: Teste' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(typeof body.code).toBe('string')
    expect(body.code.length).toBeGreaterThan(0)
    codes.push(body.code)
  })

  it('reaproveita o mesmo código pro mesmo path (idempotente)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('b@example.com'))
    const res = await POST(postReq({ path: testPath, label: 'Review: Teste' }))
    const body = await res.json()

    expect(body.code).toBe(codes[0])
  })
})
