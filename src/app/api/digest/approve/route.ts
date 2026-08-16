import { NextRequest, NextResponse } from 'next/server'
import { approveIssueByToken } from '@/lib/weekly-digest'

export const dynamic = 'force-dynamic'

// PUBLIC — sem auth() de propósito. Ela clica esse link direto do e-mail
// de prévia (07h BRT), fora de sessão logada; o token de 256 bits (mesmo
// padrão dos convites em src/lib/invites.ts) é a própria credencial. Só
// existe pra ela: nunca é divulgado fora do e-mail de prévia.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const issueNumber = token ? await approveIssueByToken(token) : null

  const html = issueNumber
    ? `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Envio aprovado</title></head>
       <body style="font-family: -apple-system, sans-serif; background: #F3F7F8; padding: 48px 24px; text-align: center; color: #112630;">
         <h1 style="font-size: 20px;">Edição #${issueNumber} aprovada ✓</h1>
         <p style="color: #4A7580; font-size: 14px;">A rede recebe no horário programado (domingo, 19h57 BRT).</p>
       </body></html>`
    : `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Link inválido</title></head>
       <body style="font-family: -apple-system, sans-serif; background: #F3F7F8; padding: 48px 24px; text-align: center; color: #112630;">
         <h1 style="font-size: 20px;">Link inválido ou expirado</h1>
       </body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
