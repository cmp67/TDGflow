import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

describe('GET /api/context — pending_leads (prateleira de descobertas)', () => {
  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('reports how many reviews are still awaiting real testing (status=a_testar)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'any@example.com', name: 'Tester' } })
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(typeof body.pending_leads).toBe('number')
    expect(body.pending_leads).toBeGreaterThanOrEqual(0)
  })
})
