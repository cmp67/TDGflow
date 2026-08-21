import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn((req: NextRequest) => req) }),
}))
vi.mock('./auth.config', () => ({ authConfig: {} }))

import middleware from './middleware'

function makeRequest(url: string, host: string): NextRequest {
  const req = new NextRequest(url)
  req.headers.set('host', host)
  return req
}

// Achado 21/08 (Carla): SSO do Gonna Travel GUEST termina com
// signIn(..., { redirectTo: '/' }) — a raiz do subdomínio "flow." jogava
// fora um login SSO bem-sucedido, mandando incondicionalmente pra
// /flow/login sem checar se já havia sessão válida. A tela de login não
// tem nenhum useSession()/redirect client-side, então o usuário ficava
// visualmente preso ali mesmo autenticado (cookie de sessão já setado).
describe('middleware — raiz do subdomínio flow.', () => {
  it('redireciona "/" em flow.* pra /flow/chat, não mais /flow/login', () => {
    const req = makeRequest('https://flow.traveldesignersgroup.com.br/', 'flow.traveldesignersgroup.com.br')
    const res = middleware(req) as Response
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://flow.traveldesignersgroup.com.br/flow/chat')
  })

  it('"/" no domínio institucional (sem host flow.) não é redirecionado', () => {
    const req = makeRequest('https://traveldesignersgroup.com.br/', 'traveldesignersgroup.com.br')
    const res = middleware(req) as Response
    expect(res.status).toBe(200)
  })
})
