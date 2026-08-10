import { describe, it, expect } from 'vitest'
import { getQuestions, isLeadSubmission } from './review-questions'

describe('getQuestions', () => {
  it('pergunta o tipo de entidade antes de tudo, independente do resto', () => {
    const qs = getQuestions({})
    expect(qs[0].id).toBe('entity_type')
  })

  it('reunião comercial pula perguntas de estadia e ganha a pergunta do porquê', () => {
    const qs = getQuestions({ entity_type: 'hotel', visit_type: 'commercial_meeting' })
    const ids = qs.map(q => q.id)
    expect(ids).not.toContain('sub_ratings')
    expect(ids).not.toContain('must_experience')
    expect(ids).not.toContain('heads_up')
    expect(ids).toContain('why_it_matters')
  })

  it('reunião comercial de fornecedor não-hotel ganha SÓ a pergunta do porquê + lista de nomes, nunca as do trilho leve', () => {
    const qs = getQuestions({ entity_type: 'beach_club', visit_type: 'commercial_meeting' })
    const ids = qs.map(q => q.id)
    expect(ids).toContain('why_it_matters')
    expect(ids).toContain('hotel_names') // lote — vários nomes, mesmo contexto (achado 10/08)
    expect(ids).not.toContain('hotel_name') // singular não existe nesse trilho
    expect(ids).not.toContain('visit_date') // não houve visita real, não faz sentido perguntar quando
    // visit_type vence entity_type — reunião comercial nunca concatena com o
    // trilho leve de dica (overall_rating/impressions/client_profile)
    expect(ids).not.toContain('overall_rating')
    expect(ids).not.toContain('impressions')
    expect(ids).not.toContain('client_profile')
    expect(qs).toHaveLength(5) // entity_type, visit_type, country, why_it_matters, hotel_names
  })

  it('entity_type respondido mas visit_type ainda não — prefixo compartilhado (2 perguntas) nunca quebra o índice do step', () => {
    const qs = getQuestions({ entity_type: 'beach_club' })
    const ids = qs.map(q => q.id)
    // entity_type e visit_type vêm sempre primeiro, iguais em toda ramificação —
    // é isso que garante que o step atual nunca aponta pra fora do array
    // quando o usuário responde a última pergunta do prefixo (visit_type, índice 1)
    expect(ids).toEqual(['entity_type', 'visit_type'])
  })

  it('site inspection de hotel pede mapa de sentimento e foto, nunca sub-notas fixas (Fase 3 — removidas)', () => {
    const qs = getQuestions({ entity_type: 'hotel', visit_type: 'site_inspection' })
    const ids = qs.map(q => q.id)
    expect(ids).not.toContain('sub_ratings')
    expect(ids).toContain('sentiment_map')
    expect(ids).toContain('photo')
  })

  it('reunião comercial nunca pede foto — ninguém foi lá pessoalmente ainda', () => {
    const qs = getQuestions({ entity_type: 'hotel', visit_type: 'commercial_meeting' })
    expect(qs.map(q => q.id)).not.toContain('photo')
  })

  it('site inspection de beach club NÃO pede sub-notas nem mapa de sentimento (trilho leve)', () => {
    const qs = getQuestions({ entity_type: 'beach_club', visit_type: 'site_inspection' })
    const ids = qs.map(q => q.id)
    expect(ids).not.toContain('sub_ratings')
    expect(ids).not.toContain('sentiment_map')
    expect(ids).not.toContain('must_experience')
    expect(ids).not.toContain('heads_up')
    expect(ids).toContain('overall_rating') // ainda avalia de forma geral, só sem sub-notas
  })

  it('sem entity_type ainda respondido, assume hotel como default (trilho completo)', () => {
    const qs = getQuestions({ visit_type: 'fam_trip' })
    expect(qs.map(q => q.id)).toContain('sentiment_map')
  })

  it('lista de nomes é do tipo name_list, o único trilho que pede mais de 1 nome por vez', () => {
    const qs = getQuestions({ entity_type: 'hotel', visit_type: 'commercial_meeting' })
    const namesQuestion = qs.find(q => q.id === 'hotel_names')
    expect(namesQuestion?.type).toBe('name_list')
  })
})

describe('isLeadSubmission', () => {
  it('reunião comercial é sempre lead, nunca review publicado direto', () => {
    expect(isLeadSubmission({ visit_type: 'commercial_meeting' })).toBe(true)
  })

  it('site inspection não é lead', () => {
    expect(isLeadSubmission({ visit_type: 'site_inspection' })).toBe(false)
  })
})
