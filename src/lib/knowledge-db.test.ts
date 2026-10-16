import { describe, it, expect, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { createKnowledge, updateKnowledge, arquivarKnowledge, listKnowledge, listKnowledgeVersoes, searchKnowledge, getKnowledge } from './knowledge-db'

const suffix = String(Date.now()).slice(-8)
const autor = { email: `tdd-${suffix}@example.com`, name: `TDD Autora ${suffix}` }
const outra = { email: `tdd-outra-${suffix}@example.com`, name: `TDD Outra ${suffix}` }
const ids: string[] = []

afterAll(async () => {
  for (const id of ids) {
    await sql`DELETE FROM tdg_conteudo_versoes WHERE entidade = 'knowledge' AND entidade_id = ${id}`
    await sql`DELETE FROM tdg_destination_knowledge WHERE id = ${id}`
  }
})

describe('knowledge-db — criar, editar com versão, arquivar, buscar', () => {
  it('cria publicado, sem fila, com prazo de revisão por tipo', async () => {
    const item = await createKnowledge({ type: 'aviso', title: `__TDD Greve ${suffix}`, content: 'Metrô de Lisboa parado dia 20.', url: null, country: 'Portugal', region: 'Lisboa', tags: ['transfer-transporte'], testado: true }, autor)
    ids.push(item.id)
    expect(item.status).toBe('publicado')
    expect(item.import_approval).toBeNull()
    expect(item.versao).toBe(1)
    expect(item.testado).toBe(true)
    expect(item.vencido).toBe(false)
    const months = (new Date(item.revisar_em!).getTime() - Date.now()) / (1000 * 3600 * 24 * 30)
    expect(months).toBeGreaterThan(5); expect(months).toBeLessThan(7)
    expect((await listKnowledge()).some(k => k.id === item.id)).toBe(true)
  })

  it('editar guarda a versão anterior, renova o prazo, e versão velha dá 409', async () => {
    const id = ids[0]
    const r = await updateKnowledge(id, { type: 'note', title: `__TDD Greve ${suffix} (editada)`, content: 'Resolvida.', url: null, country: 'Portugal', region: null, tags: [], testado: false }, 1, outra)
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.item.versao).toBe(2); expect(r.item.updated_by).toBe(outra.email); expect(r.item.title).toContain('editada') }
    const versoes = await listKnowledgeVersoes(id)
    expect(versoes).toHaveLength(1)
    expect(versoes[0].versao).toBe(1)
    expect(versoes[0].snapshot.title).toBe(`__TDD Greve ${suffix}`)
    const stale = await updateKnowledge(id, { type: 'note', title: 'x'.repeat(5), content: 'y', url: null, country: null, region: null, tags: [], testado: null }, 1, outra)
    expect(stale).toMatchObject({ ok: false, status: 409 })
  })

  it('busca por destino/título/tag sem acento, devolvendo autor e vencimento', async () => {
    const hits = await searchKnowledge('portugál', undefined, 10)
    expect(hits.some(h => h.id === ids[0])).toBe(true)
    const byTag = await searchKnowledge('__tdd greve', 'note', 10)
    expect(byTag.some(h => h.id === ids[0])).toBe(true)
    expect(hits.find(h => h.id === ids[0])).toMatchObject({ source_author: autor.name, vencido: false })
  })

  it('arquivar: outra pessoa não pode, autora pode, e some da lista e da busca', async () => {
    const id = ids[0]
    const terceira = { email: `tdd-3-${suffix}@example.com`, name: `TDD Terceira ${suffix}` }
    expect(await arquivarKnowledge(id, terceira, false)).toMatchObject({ ok: false, status: 403 })
    expect(await arquivarKnowledge(id, autor, false)).toEqual({ ok: true })
    expect((await listKnowledge()).some(k => k.id === id)).toBe(false)
    expect((await searchKnowledge('portugal', undefined, 10)).some(k => k.id === id)).toBe(false)
    expect((await getKnowledge(id))?.status).toBe('arquivado')
    expect(await arquivarKnowledge(id, autor, true)).toMatchObject({ ok: false, status: 404 })
  })
})
