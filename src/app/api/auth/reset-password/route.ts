import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { hash } from 'bcryptjs'
import { db } from '@vercel/postgres'
import { MIN_SIGNUP_PASSWORD_LENGTH } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// POST /api/auth/reset-password — PUBLIC, no auth() call.
//
// Mesmo padrão de /api/signup: SELECT ... FOR UPDATE na linha do token
// dentro de uma transação, pra duas redenções concorrentes do mesmo link
// nunca poderem ambas suceder. Mensagem de erro genérica igual à de convite
// — "inválido", "expirado" e "já usado" retornam o mesmo texto, não dá pra
// um prober diferenciar os três casos.

const GENERIC_TOKEN_ERROR = 'Link inválido, expirado ou já utilizado. Solicite um novo.'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: string; password?: string }
  const { token, password } = body

  if (!token || !password) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }
  if (password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Senha deve ter no mínimo ${MIN_SIGNUP_PASSWORD_LENGTH} caracteres.` },
      { status: 400 }
    )
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const passwordHash = await hash(password, 12)

  const client = await db.connect()
  try {
    await client.sql`BEGIN`

    const { rows } = await client.sql`
      SELECT id, user_id, used_at, expires_at
      FROM tdg_password_resets
      WHERE token_hash = ${tokenHash}
      FOR UPDATE
    `
    const reset = rows[0]
    const isValid = Boolean(reset) && !reset.used_at && new Date(reset.expires_at as string) > new Date()

    if (!isValid) {
      await client.sql`ROLLBACK`
      return NextResponse.json({ error: GENERIC_TOKEN_ERROR }, { status: 400 })
    }

    await client.sql`
      UPDATE tdg_users SET password_hash = ${passwordHash} WHERE id = ${reset.user_id as string}
    `
    await client.sql`
      UPDATE tdg_password_resets SET used_at = NOW() WHERE id = ${reset.id as string} AND used_at IS NULL
    `

    await client.sql`COMMIT`
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    try { await client.sql`ROLLBACK` } catch { /* ignore rollback error */ }
    console.error('[reset-password] erro:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erro ao redefinir senha.' }, { status: 500 })
  } finally {
    client.release()
  }
}
