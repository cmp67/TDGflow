import { describe, it, expect, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { createFaqItem, updateFaqItem, getFaqItemBySlug, listFaqItems, createFaqRequest, listOpenFaqRequests, resolveFaqRequest } from './faq-db'

const suffix = String(Date.now()).slice(-8)
const pergunta = `__TDD Como faço ${suffix}?`
const ids: string[] = []

afterAll(async () => {
  await sql`DELETE FROM tdg_faq_requests WHERE pergunta LIKE ${`__TDD%${suffix}%`}`
  for (const id of ids) await sql`DELETE FROM tdg_faq_items WHERE id = ${id}`
})

describe('tdg_faq_items', () => {
  it('cria com slug da pergunta; segunda igual ganha sufixo; slug não muda ao editar', async () => {
    const a = await createFaqItem({ pergunta, resposta_md: 'Assim.', area: 'geral', publicado: true, ordem: 0 }, 'tdd@example.com')
    ids.push(a.id)
    expect(a.slug).toBe(`tdd-como-faco-${suffix}`)

    const b = await createFaqItem({ pergunta, resposta_md: 'Assado.', area: 'geral', publicado: false, ordem: 0 }, 'tdd@example.com')
    ids.push(b.id)
    expect(b.slug).toBe(`tdd-como-faco-${suffix}-2`)

    const edited = await updateFaqItem(a.id, { pergunta: `${pergunta} (editada)`, resposta_md: 'Nova.', area: 'lumis', publicado: true, ordem: 5 }, 'tdd@example.com')
    expect(edited).toMatchObject({ slug: a.slug, pergunta: `${pergunta} (editada)`, area: 'lumis', ordem: 5 })
  })

  it('não publicada só aparece pra admin, na lista e por slug', async () => {
    const hidden = ids[1]
    const { rows } = await sql`SELECT slug FROM tdg_faq_items WHERE id = ${hidden}`
    const slug = rows[0].slug as string
    expect((await listFaqItems(false)).some(i => i.id === hidden)).toBe(false)
    expect((await listFaqItems(true)).some(i => i.id === hidden)).toBe(true)
    expect(await getFaqItemBySlug(slug, false)).toBeNull()
    expect((await getFaqItemBySlug(slug, true))?.id).toBe(hidden)
  })

  it('a semente está lá e é só leitura pelo assistente', async () => {
    expect(await getFaqItemBySlug('o-que-significam-os-selos-do-fornecedor', false)).toMatchObject({ area: 'fornecedores', publicado: true })
  })
})

describe('tdg_faq_requests', () => {
  it('pergunta da rede abre, vira respondida ligada ao item, e não fecha duas vezes', async () => {
    const r = await createFaqRequest(`__TDD dúvida ${suffix}`, 'contexto', 'agente@example.com')
    expect((await listOpenFaqRequests()).some(x => x.id === r.id)).toBe(true)
    expect(await resolveFaqRequest(r.id, 'respondida', 'tdd@example.com', ids[0])).toBe(true)
    expect((await listOpenFaqRequests()).some(x => x.id === r.id)).toBe(false)
    expect(await resolveFaqRequest(r.id, 'descartada', 'tdd@example.com', null)).toBe(false)
  })
})
