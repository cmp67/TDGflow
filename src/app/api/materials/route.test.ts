import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn(), del: vi.fn() }))

import { auth } from '@/auth'
import { del } from '@vercel/blob'
import { GET, POST, DELETE } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockDel = del as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function formDataReq(fields: Record<string, string>, url = 'http://localhost/api/materials') {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return { formData: async () => fd, nextUrl: new URL(url) } as unknown as Parameters<typeof POST>[0]
}

describe('materiais da rede (contratos, formulários, treinamento)', () => {
  const adminEmail = `__tdd_admin_${Date.now()}__@example.com`
  const agentEmail = `__tdd_agent_${Date.now()}__@example.com`
  const createdIds: string[] = []

  beforeAll(async () => {
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Admin', ${adminEmail}, 'TDD Agency', 'x', 'admin'),
             ('TDD Agent', ${agentEmail}, 'TDD Agency', 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdIds.length > 0) {
      await sql.query('DELETE FROM tdg_materials WHERE id = ANY($1)', [createdIds])
    }
    await sql`DELETE FROM tdg_users WHERE email IN (${adminEmail}, ${agentEmail})`
  })

  it('GET sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('POST qualquer agente autenticado pode contribuir (não é só admin)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const createRes = await POST(formDataReq({
      category: 'treinamento',
      title: 'Onboarding de novos consultores',
      description: 'Gravação da reunião de kickoff',
      link_url: 'https://example.com/video',
    }))
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()).material
    expect(created.created_by).toBe(agentEmail)
    createdIds.push(created.id)

    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const listRes = await GET()
    const { materials } = await listRes.json()
    expect(materials.some((m: { id: string }) => m.id === created.id)).toBe(true)
  })

  it('POST admin cria material tipo link (vídeo de treinamento) e aparece no GET', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const createRes = await POST(formDataReq({
      category: 'treinamento',
      title: 'Onboarding de novos consultores',
      description: 'Gravação da reunião de kickoff',
      link_url: 'https://example.com/video',
    }))
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()).material
    expect(created.kind).toBe('link')
    expect(created.link_url).toBe('https://example.com/video')
    expect(created.file_url).toBeNull()
    createdIds.push(created.id)

    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const listRes = await GET()
    const { materials } = await listRes.json()
    expect(materials.some((m: { id: string }) => m.id === created.id)).toBe(true)
  })

  it('POST rejeita quando não manda nem arquivo nem link', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(formDataReq({ category: 'outro', title: 'sem nada' }))
    expect(res.status).toBe(400)
  })

  it('POST rejeita categoria inválida', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(formDataReq({ category: 'invalida', title: 'x', link_url: 'https://example.com' }))
    expect(res.status).toBe(400)
  })

  it('DELETE de material tipo link não chama del do blob (nada pra limpar)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const createRes = await POST(formDataReq({ category: 'formulario', title: 'Form X', link_url: 'https://example.com/form' }))
    const created = (await createRes.json()).material

    mockDel.mockClear()
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const delRes = await DELETE(formDataReq({}, `http://localhost/api/materials?id=${created.id}`))
    expect(delRes.status).toBe(200)
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('DELETE bloqueado pra quem não criou o material e não é admin', async () => {
    const otherAgentEmail = `__tdd_agent2_${Date.now()}__@example.com`
    await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES ('TDD Agent 2', ${otherAgentEmail}, 'TDD Agency', 'x', 'agent')`

    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const createRes = await POST(formDataReq({ category: 'outro', title: 'Form Y', link_url: 'https://example.com/y' }))
    const created = (await createRes.json()).material
    createdIds.push(created.id)

    mockAuth.mockResolvedValueOnce(sessionFor(otherAgentEmail))
    const delRes = await DELETE(formDataReq({}, `http://localhost/api/materials?id=${created.id}`))
    expect(delRes.status).toBe(403)

    await sql`DELETE FROM tdg_users WHERE email = ${otherAgentEmail}`
  })

  it('DELETE permitido pra quem criou o próprio material (mesmo sem ser admin)', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const createRes = await POST(formDataReq({ category: 'outro', title: 'Form Z', link_url: 'https://example.com/z' }))
    const created = (await createRes.json()).material

    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const delRes = await DELETE(formDataReq({}, `http://localhost/api/materials?id=${created.id}`))
    expect(delRes.status).toBe(200)
  })

  it('DELETE permitido pro admin mesmo em material de outro agente', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const createRes = await POST(formDataReq({ category: 'outro', title: 'Form W', link_url: 'https://example.com/w' }))
    const created = (await createRes.json()).material

    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const delRes = await DELETE(formDataReq({}, `http://localhost/api/materials?id=${created.id}`))
    expect(delRes.status).toBe(200)
  })
})
