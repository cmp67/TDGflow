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

describe('acervo privado por agência em materiais (migration 021)', () => {
  const suffix = Date.now()
  const agencyName = `__TDD Materials Agency ${suffix}__`
  const emailA = `tdd-materials-agencya-${suffix}@example.com`
  const emailOther = `tdd-materials-other-${suffix}@example.com`
  let agencyId: string
  const createdIds: string[] = []

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES (${agencyName}, ${`__TDD_CNPJ_MATERIALS_${suffix}__`}) RETURNING id
    `
    agencyId = rows[0].id as string
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role)
      VALUES ('TDD Materials A', ${emailA}, ${agencyName}, ${agencyId}, 'x', 'agent')
    `
    await sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
      VALUES ('TDD Materials Other', ${emailOther}, 'Outra Agência', 'x', 'agent')
    `
  })

  afterAll(async () => {
    if (createdIds.length) await sql.query('DELETE FROM tdg_materials WHERE id = ANY($1)', [createdIds])
    await sql`DELETE FROM tdg_users WHERE email IN (${emailA}, ${emailOther})`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('POST visibility=privado sem agência atribuída retorna 400', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailOther))
    const res = await POST(formDataReq({
      category: 'outro', title: `__TDD Privado Sem Agencia ${suffix}__`,
      link_url: 'https://example.com/x', visibility: 'privado',
    }))
    expect(res.status).toBe(400)
  })

  it('POST visibility=privado grava agency_id e não aparece pra outra agência', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const createRes = await POST(formDataReq({
      category: 'outro', title: `__TDD Material Privado ${suffix}__`,
      link_url: 'https://example.com/privado', visibility: 'privado',
    }))
    const created = (await createRes.json()).material
    expect(createRes.status).toBe(201)
    createdIds.push(created.id)
    expect(created.agency_id).toBe(agencyId)
    expect(created.is_private).toBe(true)

    mockAuth.mockResolvedValueOnce(sessionFor(emailOther))
    const resOther = await GET()
    const bodyOther = await resOther.json()
    expect(bodyOther.materials.find((m: { id: string }) => m.id === created.id)).toBeUndefined()

    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const resA = await GET()
    const bodyA = await resA.json()
    expect(bodyA.materials.find((m: { id: string }) => m.id === created.id)).toBeTruthy()
  })

  it('POST sem visibility (default) continua compartilhado com a rede, como sempre', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const createRes = await POST(formDataReq({
      category: 'outro', title: `__TDD Material Default ${suffix}__`,
      link_url: 'https://example.com/default',
    }))
    const created = (await createRes.json()).material
    createdIds.push(created.id)
    expect(created.agency_id).toBeNull()
    expect(created.is_private).toBe(false)

    mockAuth.mockResolvedValueOnce(sessionFor(emailOther))
    const resOther = await GET()
    const bodyOther = await resOther.json()
    expect(bodyOther.materials.find((m: { id: string }) => m.id === created.id)).toBeTruthy()
  })

  it('POST rejeita visibility inválida', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(emailA))
    const res = await POST(formDataReq({
      category: 'outro', title: 'x', link_url: 'https://example.com/y', visibility: 'secreto',
    }))
    expect(res.status).toBe(400)
  })
})
