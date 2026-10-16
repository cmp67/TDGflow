import { describe, it, expect } from 'vitest'
import { CATEGORY_TO_ENTITY, ENTITY_TO_CATEGORY, PERSON_CATEGORIES, parseSource } from './contacts'

describe('contatos — categoria ↔ fornecedor e fonte (16/10/2026)', () => {
  it('DMC é categoria própria e vira card de DMC; aérea nunca vira card', () => {
    expect(PERSON_CATEGORIES.some(c => c.key === 'dmc')).toBe(true)
    expect(CATEGORY_TO_ENTITY.dmc).toBe('dmc')
    expect(CATEGORY_TO_ENTITY.hospedagem).toBe('hotel')
    expect(CATEGORY_TO_ENTITY['aérea']).toBeUndefined()
    expect(ENTITY_TO_CATEGORY.dmc).toBe('dmc')
  })
  it('fonte: tipo fechado, detalhe livre cortado em 200', () => {
    expect(parseSource({ source_kind: 'feira', source_detail: ' ILTM Cannes 2026 ' })).toEqual({ ok: true, source_kind: 'feira', source_detail: 'ILTM Cannes 2026' })
    expect(parseSource({})).toEqual({ ok: true, source_kind: null, source_detail: null })
    expect(parseSource({ source_kind: 'linkedin' }).ok).toBe(false)
  })
})
