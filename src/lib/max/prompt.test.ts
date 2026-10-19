import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { maxSystemPrompt, maxContextBlock } from './prompt'

describe('molde do Max', () => {
  it('tem as seis seções fixas do método da casa, na ordem', () => {
    const p = maxSystemPrompt()
    const order = ['<papel>', '<diretrizes>', '<politica>', '<tom>', '<dados>', '<formato_saida>'].map(t => p.indexOf(t))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(p).toBe(readFileSync('agentes/tdg-flow/max/prompt.md', 'utf8').trim())
  })
  it('contexto da chamada nomeia consultora, agência e canal', () => {
    const c = maxContextBlock({ userName: 'Dani', agencyName: 'NZ', identified: true, isGroup: false })
    expect(c).toContain('Dani'); expect(c).toContain('NZ'); expect(c).toContain('individual'); expect(c).toContain('</contexto_da_chamada>')
  })
  it('contexto traz a data de hoje em Brasília (Max propôs 2025 pra "próxima quinta", 19/10/2026)', () => {
    const c = maxContextBlock({ userName: 'Carla', agencyName: 'TDG', identified: true, isGroup: true, now: new Date('2026-10-19T13:00:00Z') })
    expect(c).toContain('Hoje é segunda-feira, 19/10/2026')
  })
})
