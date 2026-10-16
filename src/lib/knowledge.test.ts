import { describe, it, expect } from 'vitest'
import { parseKnowledgeItem, revisarEmPadrao, isVencido, KNOWLEDGE_TYPES } from './knowledge'

describe('parseKnowledgeItem', () => {
  it('normaliza, tags em minúsculo sem repetição, testado em três estados', () => {
    const r = parseKnowledgeItem({ title: '  Taxa  turística ', content: 'x', country: 'Itália', tags: ['Aereo', 'aereo', ' Golpe '], testado: true })
    expect(r).toEqual({ ok: true, fields: { type: 'note', title: 'Taxa turística', content: 'x', url: null, country: 'Itália', region: null, tags: ['aereo', 'golpe'], testado: true } })
    expect(parseKnowledgeItem({ title: 'abc', content: 'x', testado: 'sim' })).toMatchObject({ ok: true, fields: { testado: null } })
    expect(parseKnowledgeItem({ title: 'abc', content: 'x', testado: false })).toMatchObject({ ok: true, fields: { testado: false } })
  })
  it('recusa título curto, tipo inventado, link sem http, link sem url, item vazio', () => {
    expect(parseKnowledgeItem({ title: 'ab', content: 'x' }).ok).toBe(false)
    expect(parseKnowledgeItem({ title: 'abc', content: 'x', type: 'dica' }).ok).toBe(false)
    expect(parseKnowledgeItem({ title: 'abc', content: 'x', url: 'www.x.com' }).ok).toBe(false)
    expect(parseKnowledgeItem({ title: 'abc', type: 'link' }).ok).toBe(false)
    expect(parseKnowledgeItem({ title: 'abc' }).ok).toBe(false)
  })
  it('aviso e roteiro são tipos válidos', () => {
    expect(KNOWLEDGE_TYPES).toContain('aviso')
    expect(parseKnowledgeItem({ title: 'Greve em Lisboa', content: 'x', type: 'aviso' })).toMatchObject({ ok: true, fields: { type: 'aviso' } })
  })
})

describe('revisarEmPadrao', () => {
  it('aviso 6 meses, dica 12, roteiro 24, respeitando fim de mês', () => {
    expect(revisarEmPadrao('aviso', new Date('2026-08-31T12:00:00Z'))).toBe('2027-02-28')
    expect(revisarEmPadrao('note', new Date('2026-10-16T12:00:00Z'))).toBe('2027-10-16')
    expect(revisarEmPadrao('roteiro', new Date('2026-10-16T12:00:00Z'))).toBe('2028-10-16')
  })
})

describe('isVencido', () => {
  it('só com data no passado', () => {
    expect(isVencido('2026-01-01', '2026-10-16')).toBe(true)
    expect(isVencido('2027-01-01', '2026-10-16')).toBe(false)
    expect(isVencido(null, '2026-10-16')).toBe(false)
  })
})
