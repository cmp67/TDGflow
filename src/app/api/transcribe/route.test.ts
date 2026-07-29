import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'
import { POST } from './route'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

function postReq(fd: FormData) {
  return new Request('http://localhost/api/transcribe', {
    method: 'POST',
    body: fd,
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/transcribe — exige sessão', () => {
  it('sem sessão retorna 401 antes de debitar créditos ou chamar as APIs de IA', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const fd = new FormData()
    fd.append('audio', new File(['fake'], 'test.webm', { type: 'audio/webm' }))
    const res = await POST(postReq(fd))
    expect(res.status).toBe(401)
  })
})
