import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { sql } from '@vercel/postgres'
import { sendPasswordResetEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// POST /api/auth/forgot-password — PUBLIC, no auth() call.
//
// SECURITY: sempre responde a mesma mensagem genérica de sucesso, exista ou
// não o e-mail em tdg_users — sem isso, esta rota vira um oráculo pra
// descobrir quais e-mails têm conta aqui. Mesma lógica do GENERIC_INVITE_ERROR
// em /api/signup.
//
// O token vai puro no link do e-mail, mas só o hash (sha256) fica salvo em
// tdg_password_resets — ver comentário na migration 023.

const GENERIC_MESSAGE = 'Se esse e-mail tiver uma conta aqui, enviamos um link de redefinição.'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string }
  const email = body.email?.trim()

  if (!email) {
    return NextResponse.json({ error: 'Informe o e-mail.' }, { status: 400 })
  }

  const { rows } = await sql`
    SELECT id, name FROM tdg_users WHERE email = ${email} AND active = true LIMIT 1
  `
  const user = rows[0]

  if (user) {
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    await sql`
      INSERT INTO tdg_password_resets (user_id, token_hash)
      VALUES (${user.id as string}, ${tokenHash})
    `

    const origin = req.headers.get('origin') ?? new URL(req.url).origin
    const resetUrl = `${origin}/flow/redefinir-senha?token=${rawToken}`

    try {
      await sendPasswordResetEmail(email, resetUrl)
    } catch (e: unknown) {
      // Não propaga o erro pro cliente (manteria a mensagem genérica de
      // qualquer forma) — mas registra no servidor, isso não pode falhar em
      // silêncio total.
      console.error('[forgot-password] falha ao enviar e-mail:', e instanceof Error ? e.message : e)
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE })
}
