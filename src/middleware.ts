import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig } from './auth.config'

const authMiddleware = NextAuth(authConfig).auth

// Rotas públicas dentro de /flow — nunca passam pelo authMiddleware. Mantidas
// como lista explícita (em vez de só no regex do matcher) porque o matcher
// agora precisa cobrir TODO /flow/* incondicionalmente — o redirect www→raiz
// abaixo tem que rodar em qualquer rota, inclusive estas (achado 06/08/2026:
// o matcher antigo excluía /flow/login do regex, então www.../flow/login
// nunca passava pelo middleware e o redirect não disparava ali).
const PUBLIC_FLOW_PATHS = ['/flow/login', '/flow/esqueci-senha', '/flow/redefinir-senha']

// Site institucional (traveldesignersgroup.com.br) e TDG Flow
// (flow.traveldesignersgroup.com.br) são o mesmo deploy — só muda o host.
// A raiz do subdomínio "flow." vai direto pro login em vez de mostrar a
// home do site (pedido da Carla, 06/08/2026).
export default function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname } = req.nextUrl

  // www → domínio raiz, preservando o path. Roda antes de tudo o mais e pra
  // qualquer rota do matcher — sem isso teríamos duas versões do site
  // competindo no Google como conteúdo duplicado (pedido da Carla,
  // 06/08/2026: raiz é a versão canônica).
  if (host.startsWith('www.traveldesignersgroup.com.br')) {
    const url = new URL(req.url)
    url.host = host.slice('www.'.length)
    return NextResponse.redirect(url, 308)
  }

  if (pathname === '/') {
    if (host.startsWith('flow.')) {
      return NextResponse.redirect(new URL('/flow/login', req.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/flow/signup/') || PUBLIC_FLOW_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  return (authMiddleware as (req: NextRequest) => unknown)(req)
}

export const config = {
  // "/" só pro redirect host-based acima (nunca auth-protegida). Todo
  // /flow/* passa pelo middleware agora — a função acima decide se aplica
  // auth ou deixa passar (login/signup/esqueci-senha/redefinir-senha),
  // necessário pro redirect www cobrir essas rotas públicas também.
  matcher: ['/', '/flow/:path*'],
}
