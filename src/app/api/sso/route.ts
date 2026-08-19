import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/auth'

// next/navigation's redirect() throws an error whose `digest` starts with
// this prefix — checking the digest directly (instead of importing an
// internal Next.js path) is the stable, public-API-safe way to detect it.
function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

// Recebe o link de acesso único emitido pelo Gonna Travel GUEST
// (apps/web/src/app/api/flow/sso-link/route.ts, repo gonna-travel-guest) e
// troca por uma sessão real do TDG Flow — sem pedir senha de novo. Nunca
// aceita nada além do token: delega toda validação (assinatura, iss/aud,
// expiração, uso único) pro provider 'sso' em src/auth.ts.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })
  }

  try {
    // Em sucesso, signIn() lança um redirect interno (NEXT_REDIRECT) que o
    // Next.js converte na resposta HTTP real — não retorna normalmente.
    await signIn('sso', { token, redirectTo: '/' })
    // Nunca alcançado em sucesso — mantido só pra satisfazer o tipo de retorno.
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    if (isNextRedirect(error)) throw error
    // Token inválido/expirado/já usado, ou email sem conta ativa no Flow —
    // nunca detalha o motivo específico pro chamador (mesma política do
    // lado GUEST que emite o token).
    return NextResponse.redirect(new URL('/flow/login?erro=sso', request.url))
  }
}
