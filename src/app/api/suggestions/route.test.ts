import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST, PATCH } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function jsonReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/suggestions — tipo bug_report (Reportar problema, Linha Direta Bemgsy)', () => {
  const email = `__tdd_report_${Date.now()}__@example.com`
  const createdIds: number[] = []

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Reporter', ${email}, 'TDD Agency', 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdIds.length > 0) {
      await sql.query('DELETE FROM tdg_suggestions WHERE id = ANY($1)', [createdIds])
    }
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
  })

  it('cria um report com screenshot_url quando type = bug_report', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email, name: 'TDD Reporter' } })
    const res  = await POST(jsonReq({
      title: '__TDD bug__ botão não responde',
      description: 'Cliquei e nada aconteceu',
      type: 'bug_report',
      impact: 4,
      screenshot_url: 'https://blob.example.com/bug-reports/x.png',
    }))
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.suggestion.type).toBe('bug_report')
    expect(data.suggestion.status).toBe('pending')
    expect(data.suggestion.screenshot_url).toBe('https://blob.example.com/bug-reports/x.png')
    createdIds.push(data.suggestion.id)
  })

  it('ignora screenshot_url quando o tipo não é bug_report', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email, name: 'TDD Reporter' } })
    const res  = await POST(jsonReq({
      title: '__TDD melhoria__ filtro extra',
      description: 'Seria útil ter esse filtro',
      type: 'improvement',
      impact: 3,
      screenshot_url: 'https://blob.example.com/bug-reports/deveria-ser-ignorado.png',
    }))
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.suggestion.screenshot_url).toBeNull()
    createdIds.push(data.suggestion.id)
  })

  it('cai pra "improvement" quando o tipo enviado é inválido', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email, name: 'TDD Reporter' } })
    const res  = await POST(jsonReq({
      title: '__TDD tipo invalido__',
      description: 'descrição qualquer',
      type: 'algo_nao_suportado',
      impact: 3,
    }))
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.suggestion.type).toBe('improvement')
    createdIds.push(data.suggestion.id)
  })

  it('admin consegue mudar o status pra "done" (Resolvido, na UI)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email, name: 'TDD Reporter' } })
    const createRes  = await POST(jsonReq({ title: '__TDD status__', description: 'x', type: 'bug_report', impact: 2 }))
    const created    = (await createRes.json()).suggestion
    createdIds.push(created.id)

    await sql`UPDATE tdg_users SET role = 'admin' WHERE email = ${email}`
    mockAuth.mockResolvedValueOnce({ user: { email, name: 'TDD Reporter' } })
    const patchRes = await PATCH(jsonReq({ id: created.id, action: 'status', status: 'done' }))
    const patched  = (await patchRes.json()).suggestion
    expect(patchRes.status).toBe(200)
    expect(patched.status).toBe('done')
    expect(patched.screenshot_url).toBeNull()
    await sql`UPDATE tdg_users SET role = 'agent' WHERE email = ${email}`
  })

  it('GET traz screenshot_url junto com as demais colunas', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email } })
    const res  = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.suggestions.some((s: { screenshot_url?: string }) => 'screenshot_url' in s)).toBe(true)
  })
})
