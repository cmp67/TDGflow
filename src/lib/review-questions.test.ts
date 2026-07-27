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

  it('reunião comercial de fornecedor não-hotel ganha SÓ a pergunta do porquê, nunca as do trilho leve', () => {
    const qs = getQuestions({ entity_type: 'beach_club', visit_type: 'commercial_meeting' })
    const ids = qs.map(q => q.id)
    expect(ids).toContain('why_it_matters')
    // visit_type vence entity_type — reunião comercial nunca concatena com o
    // trilho leve de dica (overall_rating/impressions/client_profile)
    expect(ids).not.toContain('overall_rating')
    expect(ids).not.toContain('impressions')
    expect(ids).not.toContain('client_profile')
    expect(qs).toHaveLength(6) // 5 base + why_it_matters, nunca mais que isso
  })

  it('meio do questionário (entity_type respondido, visit_type ainda não) já reflete o trilho leve sem quebrar o índice do step', () => {
    const qs = getQuestions({ entity_type: 'beach_club' })
    const ids = qs.map(q => q.id)
    // as perguntas compartilhadas (0-4) continuam as mesmas 5, na mesma ordem —
    // é isso que garante que o step atual nunca aponta pra fora do array
    // quando o usuário responde a última pergunta base (visit_type, índice 4)
    expect(ids.slice(0, 5)).toEqual(['entity_type', 'hotel_name', 'country', 'visit_date', 'visit_type'])
    expect(ids).not.toContain('sub_ratings')
  })

  it('site inspection de hotel pede sub-notas de quarto/comida/localização', () => {
    const qs = getQuestions({ entity_type: 'hotel', visit_type: 'site_inspection' })
    expect(qs.map(q => q.id)).toContain('sub_ratings')
  })

  it('site inspection de beach club NÃO pede sub-notas de estadia (trilho leve)', () => {
    const qs = getQuestions({ entity_type: 'beach_club', visit_type: 'site_inspection' })
    const ids = qs.map(q => q.id)
    expect(ids).not.toContain('sub_ratings')
    expect(ids).not.toContain('must_experience')
    expect(ids).not.toContain('heads_up')
    expect(ids).toContain('overall_rating') // ainda avalia de forma geral, só sem sub-notas
  })

  it('sem entity_type ainda respondido, assume hotel como default (trilho completo)', () => {
    const qs = getQuestions({ visit_type: 'fam_trip' })
    expect(qs.map(q => q.id)).toContain('sub_ratings')
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
