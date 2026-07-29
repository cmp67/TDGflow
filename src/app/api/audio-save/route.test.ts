import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn() }))

import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockPut = put as unknown as ReturnType<typeof vi.fn>

function sessionFor(email: string) {
  return { user: { email } }
}

function postReq(fd: FormData) {
  return new Request('http://localhost/api/audio-save', {
    method: 'POST',
    body: fd,
  }) as unknown as Parameters<typeof POST>[0]
}

function audioForm(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.append('audio', new File(['fake'], 'test.webm', { type: 'audio/webm' }))
  for (const [key, value] of Object.entries(overrides)) fd.append(key, value)
  return fd
}

describe('POST /api/audio-save — agência (texto e id) e nome do agente vêm da sessão, nunca do form', () => {
  const email = `tdd-audio-save-${Date.now()}@example.com`
  const agencyName = `__TDD Audio Save Agency ${Date.now()}__`
  let agencyId: string
  const createdIds: string[] = []

  beforeAll(async () => {
    const { rows: agencyRows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES (${agencyName}, ${`__TDD_CNPJ_SAVE_${Date.now()}__`}) RETURNING id
    `
    agencyId = agencyRows[0].id as string

    await sql`
      INSERT INTO tdg_users (name, email, agency_name, agency_id, password_hash, role)
      VALUES ('TDD Audio Saver', ${email}, ${agencyName}, ${agencyId}, 'x', 'agent')
    `
    mockPut.mockResolvedValue({ url: 'https://example.com/fake.webm' })
  })

  afterAll(async () => {
    if (createdIds.length) await sql`DELETE FROM tdg_audio_inputs WHERE id = ANY(${createdIds})`
    await sql`DELETE FROM tdg_users WHERE email = ${email}`
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  it('sem sessão retorna 401', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(postReq(audioForm()))
    expect(res.status).toBe(401)
  })

  it('ignora agency/agent_name enviados no form e grava agency_name + agency_id da sessão autenticada', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(email))
    const res = await POST(postReq(audioForm({ agency: '__AGENCIA_FALSA__', agent_name: 'Impostor' })))
    const body = await res.json()
    expect(res.status).toBe(200)
    createdIds.push(body.id)

    const { rows } = await sql`SELECT agency, agency_id, agent_name FROM tdg_audio_inputs WHERE id = ${body.id}`
    expect(rows[0].agency).toBe(agencyName)
    expect(rows[0].agency_id).toBe(agencyId)
    expect(rows[0].agent_name).toBe('TDD Audio Saver')
  })
})
