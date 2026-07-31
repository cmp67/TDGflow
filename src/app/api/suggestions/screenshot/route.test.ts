import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn() }))

import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockPut = put as unknown as ReturnType<typeof vi.fn>

function reqWithImage(file: File | null) {
  const fd = new FormData()
  if (file) fd.append('image', file)
  return { formData: async () => fd } as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/suggestions/screenshot — upload de print de erro', () => {
  it('retorna 401 sem sessão', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const res = await POST(reqWithImage(new File(['x'], 'a.png', { type: 'image/png' })))
    expect(res.status).toBe(401)
  })

  it('retorna 400 sem imagem', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    const res = await POST(reqWithImage(null))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se o arquivo não for imagem', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    const res = await POST(reqWithImage(new File(['x'], 'a.pdf', { type: 'application/pdf' })))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se a imagem exceder 8MB', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    const big = new Uint8Array(8 * 1024 * 1024 + 1)
    const res = await POST(reqWithImage(new File([big], 'big.png', { type: 'image/png' })))
    expect(res.status).toBe(400)
  })

  it('faz upload e devolve a URL do blob', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'a@example.com' } })
    mockPut.mockResolvedValueOnce({ url: 'https://blob.example.com/bug-reports/a-123.png' })
    const res  = await POST(reqWithImage(new File(['x'], 'erro.png', { type: 'image/png' })))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.screenshot_url).toBe('https://blob.example.com/bug-reports/a-123.png')
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('bug-reports/a_at_example.com-'),
      expect.anything(),
      { access: 'public', addRandomSuffix: false }
    )
  })
})
