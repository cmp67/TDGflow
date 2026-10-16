import { describe, it, expect } from 'vitest'
import { slugify, parseFaqItem, parseFaqRequest, matchesFaq, faqIndexForPrompt, FAQ_AREAS } from './faq'

describe('slugify', () => {
  it('sem acento, minúsculo, hífens, sem sobra nas pontas', () => {
    expect(slugify('Como registro uma visita?')).toBe('como-registro-uma-visita')
    expect(slugify('  ¿Cómo hago?  ')).toBe('como-hago')
    expect(slugify('???')).toBe('pergunta')
  })
  it('corta em 80 sem deixar hífen no fim', () => {
    const s = slugify('a'.repeat(79) + ' b')
    expect(s.length).toBeLessThanOrEqual(80)
    expect(s.endsWith('-')).toBe(false)
  })
})

describe('parseFaqItem', () => {
  it('normaliza e aplica padrões', () => {
    expect(parseFaqItem({ pergunta: ' Como? ', resposta_md: ' Assim. ', area: 'fornecedores' })).toEqual({
      ok: true, fields: { pergunta: 'Como?', resposta_md: 'Assim.', area: 'fornecedores', publicado: true, ordem: 0 },
    })
  })
  it('recusa pergunta vazia, resposta vazia, área inventada, publicado não booleano', () => {
    expect(parseFaqItem({ pergunta: '', resposta_md: 'x', area: 'geral' })).toMatchObject({ ok: false })
    expect(parseFaqItem({ pergunta: 'x', resposta_md: '  ', area: 'geral' })).toMatchObject({ ok: false })
    expect(parseFaqItem({ pergunta: 'x', resposta_md: 'y', area: 'base_viva' })).toMatchObject({ ok: false })
    expect(parseFaqItem({ pergunta: 'x', resposta_md: 'y', area: 'geral', publicado: 'sim' })).toMatchObject({ ok: false })
  })
  it('áreas da rede TDG (sem Base Viva)', () => {
    expect(FAQ_AREAS).toContain('lumis')
    expect(FAQ_AREAS).toContain('conhecimento')
    expect(FAQ_AREAS).not.toContain('base_viva')
  })
})

describe('parseFaqRequest', () => {
  it('exige um mínimo de texto e corta o contexto', () => {
    expect(parseFaqRequest({ pergunta: 'oi' })).toMatchObject({ ok: false })
    expect(parseFaqRequest({ pergunta: 'Como vejo o histórico?', contexto: 'x'.repeat(300) }))
      .toEqual({ ok: true, pergunta: 'Como vejo o histórico?', contexto: 'x'.repeat(200) })
  })
})

describe('matchesFaq e índice', () => {
  const item = { pergunta: 'Como registro uma condição comercial?', resposta_md: 'Ficha → Adicionar condição.' }
  it('busca sem acento na pergunta e na resposta', () => {
    expect(matchesFaq(item, 'condicao')).toBe(true)
    expect(matchesFaq(item, 'ADICIONAR')).toBe(true)
    expect(matchesFaq(item, 'selo')).toBe(false)
    expect(matchesFaq(item, '   ')).toBe(true)
  })
  it('índice pro assistente lista área, pergunta e slug', () => {
    expect(faqIndexForPrompt([{ slug: 'a', pergunta: 'P?', area: 'lumis' }])).toBe('- [Lumis e assinatura] P? (slug: a)')
    expect(faqIndexForPrompt([])).toBe('(nenhum item ainda)')
  })
})
