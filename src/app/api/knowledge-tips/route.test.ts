import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST, GET } from './route'
import { PATCH } from './[id]/route'
import { POST as ARQUIVAR } from './[id]/arquivar/route'
import { GET as VERSOES } from './[id]/versoes/route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const sessionFor = (email: string) => ({ user: { email } })
const req = (url: string, method: string, body?: unknown) =>
  new Request(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) as unknown as Parameters<typeof POST>[0]
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('Knowledge Base — registrar, editar com versão, arquivar (16/10/2026)', () => {
  const suffix = Date.now()
  const autora = `__tdd_kb_autora_${suffix}__@example.com`
  const outra = `__tdd_kb_outra_${suffix}__@example.com`
  let id: string

  beforeAll(async () => {
    await sql`INSERT INTO tdg_users (name, email, agency_name, password_hash, role) VALUES (${`TDD KB Autora ${suffix}`}, ${autora}, '__TDD_AGENCY__', 'x', 'agent'), (${`TDD KB Outra ${suffix}`}, ${outra}, '__TDD_AGENCY__', 'x', 'agent')`
  })
  afterAll(async () => {
    if (id) { await sql`DELETE FROM tdg_conteudo_versoes WHERE entidade_id = ${id}`; await sql`DELETE FROM tdg_destination_knowledge WHERE id = ${id}` }
    await sql`DELETE FROM tdg_users WHERE email IN (${autora}, ${outra})`
  })

  it('POST cria aviso testado, publicado, com prazo; GET lista', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(autora))
    const res = await POST(req('http://localhost/api/knowledge-tips', 'POST', { type: 'aviso', title: `__TDD Aviso ${suffix}`, content: 'Aeroporto em obras.', country: 'Chile', tags: ['aereo'], testado: true }))
    const body = await res.json()
    expect(res.status).toBe(201)
    id = body.tip.id
    expect(body.tip).toMatchObject({ type: 'aviso', testado: true, status: 'publicado', versao: 1, vencido: false })
    expect(body.tip.revisar_em).toBeTruthy()
    mockAuth.mockResolvedValueOnce(sessionFor(outra))
    const list = await (await GET()).json()
    expect(list.tips.some((t: { id: string }) => t.id === id)).toBe(true)
  })

  it('POST recusa link sem url', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(autora))
    const res = await POST(req('http://localhost/api/knowledge-tips', 'POST', { type: 'link', title: 'Site útil' }))
    expect(res.status).toBe(400)
  })

  it('PATCH de outra pessoa funciona (versão 1 → 2) e versão velha dá 409', async () => {
    mockAuth.mockResolvedValueOnce(sessionFor(outra))
    const res = await PATCH(req(`http://localhost/api/knowledge-tips/${id}`, 'PATCH', { type: 'aviso', title: `__TDD Aviso ${suffix} atualizado`, content: 'Obras terminaram.', country: 'Chile', tags: [], testado: false, versao: 1 }), params(id))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tip.versao).toBe(2)
    mockAuth.mockResolvedValueOnce(sessionFor(outra))
    const stale = await PATCH(req(`http://localhost/api/knowledge-tips/${id}`, 'PATCH', { type: 'aviso', title: 'Qualquer coisa', content: 'x', versao: 1 }), params(id))
    expect(stale.status).toBe(409)
    mockAuth.mockResolvedValueOnce(sessionFor(outra))
    const versoes = await (await VERSOES(req(`http://localhost/api/knowledge-tips/${id}/versoes`, 'GET'), params(id))).json()
    expect(versoes.versoes).toHaveLength(1)
    expect(versoes.versoes[0].snapshot.title).toBe(`__TDD Aviso ${suffix}`)
  })

  it('arquivar: só autora ou admin', async () => {
    const terceira = `__tdd_kb_3_${suffix}__@example.com`
    mockAuth.mockResolvedValueOnce(sessionFor(terceira))
    expect((await ARQUIVAR(req(`http://localhost/api/knowledge-tips/${id}/arquivar`, 'POST'), params(id))).status).toBe(403)
    mockAuth.mockResolvedValueOnce(sessionFor(autora))
    expect((await ARQUIVAR(req(`http://localhost/api/knowledge-tips/${id}/arquivar`, 'POST'), params(id))).status).toBe(200)
    mockAuth.mockResolvedValueOnce(sessionFor(autora))
    const list = await (await GET()).json()
    expect(list.tips.some((t: { id: string }) => t.id === id)).toBe(false)
  })
})
