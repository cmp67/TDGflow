import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authConfig } from './auth.config'

const authMiddleware = NextAuth(authConfig).auth

// Site institucional (traveldesignersgroup.com.br) e TDG Flow
// (flow.traveldesignersgroup.com.br) são o mesmo deploy — só muda o host.
// A raiz do subdomínio "flow." vai direto pro login em vez de mostrar a
// home do site (pedido da Carla, 06/08/2026).
export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/') {
    const host = req.headers.get('host') || ''
    if (host.startsWith('flow.')) {
      return NextResponse.redirect(new URL('/flow/login', req.url))
    }
    return NextResponse.next()
  }
  return (authMiddleware as (req: NextRequest) => unknown)(req)
}

export const config = {
  // Protect all /flow/* except /flow/login and /flow/signup/[token] — the
  // latter is the public self-registration entry point (invite redemption),
  // reachable by a signed-out stranger with a valid link. "/" is matched too,
  // only to run the host-based redirect above (never auth-protected).
  matcher: ['/', '/flow/((?!login|signup).*)'],
}
