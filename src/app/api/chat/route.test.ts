import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { processToolCall } from './route'

describe('search_hotels — bug real: "casal com filhos pra Algarve" não achava nada', () => {
  it('profiles=Família + region=Algarve encontra os fornecedores reais (Martinhal Sagres/Quinta do Lago)', async () => {
    const rows = await processToolCall('search_hotels', { region: 'Algarve', profiles: ['Família'] }) as { name: string }[]
    const names = rows.map(r => r.name)
    expect(names).toContain('Martinhal Sagres')
    expect(names).toContain('Martinhal Quinta do Lago')
  })

  it('country=Portugal também funciona (region e country são parâmetros independentes)', async () => {
    const rows = await processToolCall('search_hotels', { country: 'Portugal', profiles: ['Família'] }) as { name: string }[]
    expect(rows.length).toBeGreaterThan(0)
  })

  it('tags aceita busca parcial/case-insensitive, não exige grafia idêntica', async () => {
    const rows = await processToolCall('search_hotels', { tags: ['golf'] }) as { name: string; tags: string[] }[]
    expect(rows.some(r => r.name === 'Martinhal Quinta do Lago')).toBe(true)
  })

  it('profiles com valor que não existe em nenhum fornecedor retorna vazio, não erro', async () => {
    const rows = await processToolCall('search_hotels', { profiles: ['__perfil_inexistente__'] }) as unknown[]
    expect(rows).toEqual([])
  })
})
