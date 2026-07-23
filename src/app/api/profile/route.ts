import { sql } from '@vercel/postgres'
import { hash, compare } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

// PATCH — update own name or password
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const email = session.user.email
  const body  = await req.json()

  // ── Update name ────────────────────────────────────────────────
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })

    await sql`UPDATE tdg_users SET name = ${name} WHERE email = ${email}`
    return NextResponse.json({ ok: true })
  }

  // ── Update password ────────────────────────────────────────────
  if (body.currentPassword !== undefined && body.newPassword !== undefined) {
    const { currentPassword, newPassword } = body

    if (!currentPassword || String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Senha atual obrigatória e nova senha com mínimo 6 caracteres.' }, { status: 400 })
    }

    // Verify current password
    const { rows } = await sql`SELECT password_hash FROM tdg_users WHERE email = ${email} LIMIT 1`
    if (!rows[0]) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })

    const valid = await compare(String(currentPassword), rows[0].password_hash)
    if (!valid) return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 403 })

    const newHash = await hash(String(newPassword), 12)
    await sql`UPDATE tdg_users SET password_hash = ${newHash} WHERE email = ${email}`
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
}
