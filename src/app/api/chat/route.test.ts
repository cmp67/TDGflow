import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { processToolCall } from './route'

describe('search_tdg_suppliers — bug real: "casal com filhos pra Algarve" não achava nada', () => {
  it('profiles=Família + region=Algarve encontra os fornecedores reais (Martinhal Sagres/Quinta do Lago)', async () => {
    const result = await processToolCall('search_tdg_suppliers', { region: 'Algarve', profiles: ['Família'] }) as { suppliers: { name: string }[] }
    const names = result.suppliers.map(r => r.name)
    expect(names).toContain('Martinhal Sagres')
    expect(names).toContain('Martinhal Quinta do Lago')
  })

  it('country=Portugal também funciona (region e country são parâmetros independentes)', async () => {
    const result = await processToolCall('search_tdg_suppliers', { country: 'Portugal', profiles: ['Família'] }) as { suppliers: unknown[] }
    expect(result.suppliers.length).toBeGreaterThan(0)
  })

  it('tags aceita busca parcial/case-insensitive, não exige grafia idêntica', async () => {
    const result = await processToolCall('search_tdg_suppliers', { tags: ['golf'] }) as { suppliers: { name: string; tags: string[] }[] }
    expect(result.suppliers.some(r => r.name === 'Martinhal Quinta do Lago')).toBe(true)
  })

  it('profiles com valor que não existe em nenhum fornecedor retorna vazio, não erro', async () => {
    const result = await processToolCall('search_tdg_suppliers', { profiles: ['__perfil_inexistente__'] }) as { suppliers: unknown[] }
    expect(result.suppliers).toEqual([])
  })
})
