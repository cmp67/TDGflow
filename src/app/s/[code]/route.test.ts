import { describe, it, expect, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /s/[code] (redirect público — não exige sessão, destino que exige)', () => {
  const code = `__tdd${Date.now()}`

  afterAll(async () => {
    await sql`DELETE FROM tdg_short_links WHERE code = ${code}`
  })

  it('código inexistente redireciona pra /flow (fallback seguro, não quebra)', async () => {
    const res = await GET(
      new NextRequest('http://localhost/s/naoexiste'),
      { params: Promise.resolve({ code: 'naoexiste' }) }
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/flow')
  })

  it('código existente redireciona pro target_path real', async () => {
    await sql`
      INSERT INTO tdg_short_links (code, target_path, created_by)
      VALUES (${code}, '/flow/rede?tab=fornecedores&hotelId=abc123', 'tdd@example.com')
    `
    const res = await GET(
      new NextRequest(`http://localhost/s/${code}`),
      { params: Promise.resolve({ code }) }
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/flow/rede?tab=fornecedores&hotelId=abc123')
  })
})
