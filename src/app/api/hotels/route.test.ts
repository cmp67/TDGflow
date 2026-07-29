import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

describe('GET /api/hotels (catálogo de fornecedores)', () => {
  it('returns 401 with no session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns the seeded catalog with all fields the frontend card needs', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.hotels)).toBe(true)
    expect(body.hotels.length).toBeGreaterThanOrEqual(6)

    const sagres = body.hotels.find((h: { name: string }) => h.name === 'Martinhal Sagres')
    expect(sagres).toBeTruthy()
    expect(sagres.location).toBe('Sagres, Algarve, Portugal')
    expect(sagres.currency).toBe('EUR')
    expect(sagres.group_name).toBe('Martinhal')
    expect(Array.isArray(sagres.profiles)).toBe(true)
    expect(sagres.profiles).toContain('Família')
    expect(Array.isArray(sagres.gallery)).toBe(true)
    expect(sagres.gallery[0]).toHaveProperty('label')
  })

  it('includes a hotel auto-created from a pre-existing free-text review', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    const backfilled = body.hotels.find((h: { name: string }) => h.name === 'La Sivoliere')
    expect(backfilled).toBeTruthy()
  })

  it('reports tested_count from published reviews linked by hotel_id', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    const testado = body.hotels.find((h: { name: string }) => h.name === 'La Sivoliere')
    expect(testado.tested_count).toBeGreaterThanOrEqual(1)

    const semReview = body.hotels.find((h: { name: string }) => h.name === 'Martinhal Sagres')
    expect(semReview.tested_count).toBe(0)
    expect(semReview.pending_lead_count).toBe(0)
  })

  it('benefits vem [] quando o fornecedor não tem condição negociada, sem quebrar tested_count', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor('any@example.com'))
    const res  = await GET()
    const body = await res.json()

    const semBeneficio = body.hotels.find((h: { name: string }) => h.name === 'Martinhal Sagres')
    expect(semBeneficio.benefits).toEqual([])
  })
})
