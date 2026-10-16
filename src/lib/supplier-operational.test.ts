import { describe, it, expect } from 'vitest'
import { parseOperational, reopeningOverdue, OPERATIONAL_STATUSES } from './supplier-operational'

const TODAY = '2026-10-16'

describe('parseOperational — regras puras do estado operacional (porte do Trip Flow, 16/10/2026)', () => {
  it('status inválido é recusado', () => {
    expect(parseOperational({ operational_status: 'vendido' }, TODAY)).toEqual({ ok: false, error: expect.stringContaining('ativo, reforma ou fechado') })
    expect(OPERATIONAL_STATUSES).toEqual(['ativo', 'reforma', 'fechado'])
  })

  it('reforma exige data prevista de reabertura, no futuro', () => {
    expect(parseOperational({ operational_status: 'reforma' }, TODAY).ok).toBe(false)
    expect(parseOperational({ operational_status: 'reforma', reopening_expected: '2026-01-01' }, TODAY).ok).toBe(false)
    expect(parseOperational({ operational_status: 'reforma', reopening_expected: '2026-13-45' }, TODAY).ok).toBe(false)
    const r = parseOperational({ operational_status: 'reforma', reopening_expected: '2027-03-01', operational_note: ' piscina fechada ' }, TODAY)
    expect(r).toEqual({ ok: true, fields: { operational_status: 'reforma', operational_note: 'piscina fechada', reopening_expected: '2027-03-01' } })
  })

  it('fechado exige motivo e nunca guarda data de reabertura', () => {
    expect(parseOperational({ operational_status: 'fechado', operational_note: '   ' }, TODAY).ok).toBe(false)
    const r = parseOperational({ operational_status: 'fechado', operational_note: 'Vendido para outra bandeira', reopening_expected: '2027-01-01' }, TODAY)
    expect(r).toEqual({ ok: true, fields: { operational_status: 'fechado', operational_note: 'Vendido para outra bandeira', reopening_expected: null } })
  })

  it('voltar a ativo limpa motivo e previsão', () => {
    const r = parseOperational({ operational_status: 'ativo', operational_note: 'x', reopening_expected: '2027-01-01' }, TODAY)
    expect(r).toEqual({ ok: true, fields: { operational_status: 'ativo', operational_note: null, reopening_expected: null } })
  })

  it('observação longa demais é recusada', () => {
    expect(parseOperational({ operational_status: 'fechado', operational_note: 'x'.repeat(501) }, TODAY).ok).toBe(false)
  })
})

describe('reopeningOverdue', () => {
  it('só reforma com previsão no passado', () => {
    expect(reopeningOverdue('reforma', '2026-10-01', TODAY)).toBe(true)
    expect(reopeningOverdue('reforma', '2026-12-01', TODAY)).toBe(false)
    expect(reopeningOverdue('fechado', '2026-10-01', TODAY)).toBe(false)
    expect(reopeningOverdue('reforma', null, TODAY)).toBe(false)
  })
})
