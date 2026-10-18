import { describe, it, expect } from 'vitest'
import { ownWords, ownWordsLead, firstName } from './review-words'

describe('ownWords — as palavras de quem registrou, sem edição', () => {
  it('devolve os campos livres na ordem, com rótulo, ignorando vazio e não-texto', () => {
    const w = ownWords({ impressions: ' quarto pequeno, formula turistica ', heads_up: 'caro', client_profile: '', overall_rating: 3, photo: null })
    expect(w).toEqual([{ key: 'impressions', label: 'Como foi', text: 'quarto pequeno, formula turistica' }, { key: 'heads_up', label: 'Ressalva', text: 'caro' }])
    expect(ownWordsLead({ client_said: 'Cliente amou.' })).toBe('Cliente amou.')
  })
  it('sem raw_answers, nada (import antigo do Max não guardava o texto)', () => {
    expect(ownWords(null)).toEqual([]); expect(ownWords('x')).toEqual([]); expect(ownWordsLead({})).toBeNull()
  })
  it('primeiro nome', () => { expect(firstName('Dani Filippozzi')).toBe('Dani'); expect(firstName(null)).toBe('quem registrou') })
})
