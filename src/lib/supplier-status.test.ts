import { describe, it, expect } from 'vitest'
import { supplierStatus, TRUST_LABELS } from './supplier-status'

describe('supplierStatus — três selos de confiança (porte do Trip Flow, 16/10/2026)', () => {
  it('testado vence tudo: alguém da rede esteve lá', () => {
    const s = supplierStatus({ testedCount: 1, clientApprovedCount: 3, pendingLeadCount: 2 })
    expect(s?.variant).toBe('testado')
    expect(s?.label).toBe(TRUST_LABELS.testado)
    expect(s?.icon).toBe('i-verified')
  })

  it('aprovado por cliente vence aguardando teste', () => {
    const s = supplierStatus({ testedCount: 0, clientApprovedCount: 1, pendingLeadCount: 5 })
    expect(s?.variant).toBe('aprovado')
    expect(s?.label).toBe('Aprovado por cliente')
    expect(s?.icon).toBe('i-client')
  })

  it('só lead → aguardando teste', () => {
    const s = supplierStatus({ testedCount: 0, clientApprovedCount: 0, pendingLeadCount: 1 })
    expect(s?.variant).toBe('descoberto')
    expect(s?.icon).toBe('i-spark')
  })

  it('sem nada a dizer → null (card sem selo, nunca uma cor "neutra")', () => {
    expect(supplierStatus({ testedCount: 0, clientApprovedCount: 0, pendingLeadCount: 0 })).toBeNull()
  })

  it('contagem ausente conta como zero', () => {
    expect(supplierStatus({ testedCount: 0, pendingLeadCount: 0 })).toBeNull()
    expect(supplierStatus({ testedCount: 0, pendingLeadCount: 1 })?.variant).toBe('descoberto')
  })
})
