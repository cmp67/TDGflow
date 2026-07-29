import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

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

describe('GET /api/context — sino escopado por agência (29/07)', () => {
  const agencyA = `__TDD Agency A ${Date.now()}__`
  const agencyB = `__TDD Agency B ${Date.now()}__`
  const emailA = `__tdd_a_${Date.now()}__@example.com`
  const emailB = `__tdd_b_${Date.now()}__@example.com`
  let contentId: string

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD A', ${emailA}, ${agencyA}, 'x', 'agent'),
             ('TDD B', ${emailB}, ${agencyB}, 'x', 'agent')
    `
    await sql`
      INSERT INTO tdg_audio_inputs (agent_name, agency, status)
      VALUES ('TDD A', ${agencyA}, 'pending')
    `
    await sql`
      INSERT INTO tdg_hotel_reviews (hotel_name, agent_name, agency_name, status)
      VALUES ('__TDD Hotel Context__', 'TDD A', ${agencyA}, 'published')
    `
    const { rows } = await sql`
      INSERT INTO tdg_partnership_content (category, title, kind, link_url, created_by)
      VALUES ('comunicado', '__TDD Comunicado Context__', 'link', 'https://example.com', ${emailA})
      RETURNING id
    `
    contentId = rows[0].id as string
  })

  afterAll(async () => {
    await sql`DELETE FROM tdg_partnership_content WHERE id = ${contentId}`
    await sql`DELETE FROM tdg_hotel_reviews WHERE hotel_name = '__TDD Hotel Context__'`
    await sql`DELETE FROM tdg_audio_inputs WHERE agency IN (${agencyA}, ${agencyB})`
    await sql`DELETE FROM tdg_users WHERE email IN (${emailA}, ${emailB})`
  })

  it('agência A vê a própria gravação pendente e a própria atividade de dicas', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: emailA } })
    const res = await GET()
    const data = await res.json()
    expect(data.pending_recordings).toBeGreaterThanOrEqual(1)
    expect(data.reviews_this_week).toBeGreaterThanOrEqual(1)
  })

  it('agência B não vê a gravação nem a dica da agência A', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: emailB } })
    const res = await GET()
    const data = await res.json()
    expect(data.pending_recordings).toBe(0)
    expect(data.reviews_this_week).toBe(0)
  })

  it('conteúdo novo da Central Bemgsy aparece pras duas agências (broadcast, não escopado)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: emailB } })
    const res = await GET()
    const data = await res.json()
    expect(data.new_partnership_content.some((c: { id: string }) => c.id === contentId)).toBe(true)
  })
})
