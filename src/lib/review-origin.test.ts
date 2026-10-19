import { describe, it, expect } from 'vitest'
import { originDateLabel } from './review-origin'

describe('originDateLabel', () => {
  it('visita registrada: mostra a data da visita', () => {
    expect(originDateLabel({ visit_date: '2026-09-03', source: null, source_date: null, created_at: '2026-10-01T12:00:00Z' })).toBe('visita em set. 2026')
  })
  it('relato importado do grupo: data em que a pessoa falou no grupo', () => {
    expect(originDateLabel({ visit_date: null, source: 'whatsapp_import', source_date: '2026-08-12', created_at: '2026-10-17T12:00:00Z' })).toBe('no grupo em 12 ago. 2026')
  })
  it('sem visita nem origem: data do registro no Flow', () => {
    expect(originDateLabel({ visit_date: null, source: null, source_date: null, created_at: '2026-10-05T15:00:00Z' })).toBe('registrado em 5 out. 2026')
  })
})
