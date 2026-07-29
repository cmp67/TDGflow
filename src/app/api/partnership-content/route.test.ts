import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { GET, POST, DELETE } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email, name: 'TDD Tester' } }
}

function postReq(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return new Request('http://localhost/api/partnership-content', { method: 'POST', body: fd }) as unknown as Parameters<typeof POST>[0]
}

function deleteReq(id: string) {
  return new NextRequest(`http://localhost/api/partnership-content?id=${id}`, { method: 'DELETE' })
}

describe('canal Bemgsy → agências (documentos, vídeos/atas, comunicados de roadmap)', () => {
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
      await sql.query('DELETE FROM tdg_partnership_content WHERE id = ANY($1)', [createdIds])
    }
    await sql`DELETE FROM tdg_users WHERE email IN (${adminEmail}, ${agentEmail})`
  })

  it('POST bloqueado pra quem não é admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const res = await POST(postReq({ category: 'comunicado', title: 'Roadmap Q3', link_url: 'https://example.com/roadmap' }))
    expect(res.status).toBe(403)
  })

  it('POST cria conteúdo quando admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(postReq({ category: 'video_ata', title: 'Ata 24/07 — Adriano', link_url: 'https://meetgeek.ai/meeting/xyz' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.content.category).toBe('video_ata')
    createdIds.push(data.content.id)
  })

  it('GET lista pra qualquer agente autenticado', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content.some((c: { id: string }) => createdIds.includes(c.id))).toBe(true)
  })

  it('DELETE bloqueado pra quem não é admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(agentEmail))
    const res = await DELETE(deleteReq(createdIds[0]))
    expect(res.status).toBe(403)
  })

  it('DELETE funciona pra admin', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await DELETE(deleteReq(createdIds[0]))
    expect(res.status).toBe(200)
    createdIds.pop()
  })

  it('rejeita categoria inválida', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(adminEmail))
    const res = await POST(postReq({ category: 'invalida', title: 'X', link_url: 'https://example.com' }))
    expect(res.status).toBe(400)
  })
})
