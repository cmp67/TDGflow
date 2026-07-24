import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@vercel/postgres'
import { MIN_SIGNUP_PASSWORD_LENGTH } from '@/lib/invites'

export const dynamic = 'force-dynamic'

// POST /api/signup — PUBLIC, no auth() call. This is how a brand-new user
// enters the system: they redeem a single-use invite token (minted by
// /api/admin/invites or /api/team/invites) into a real tdg_users row.
//
// SECURITY: agency_id and role are read ONLY from the tdg_invites row, never
// from the request body — a forged {role: 'admin', agency_id: ...} in the
// body is silently ignored. The whole redemption (validate token → check
// email uniqueness → insert user → mark invite used) runs inside one
// transaction with `SELECT ... FOR UPDATE` on the invite row so two
// concurrent redemptions of the same token can never both succeed.
//
// Error messages are intentionally generic for the invite-state branch
// (invalid / expired / already used all return the same message) so a
// prober can't distinguish "wrong token" from "used token" from "expired
// token" — none of that is legitimate information for an unauthenticated
// caller.

const GENERIC_INVITE_ERROR = 'Convite inválido, expirado ou já utilizado.'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    token?:    string
    name?:     string
    email?:    string
    password?: string
  }
  const { token, name, email, password } = body

  if (!token || !name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Preencha nome, email e senha.' }, { status: 400 })
  }
  if (password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Senha deve ter no mínimo ${MIN_SIGNUP_PASSWORD_LENGTH} caracteres.` },
      { status: 400 }
    )
  }

  // NOTE: only trimmed, deliberately NOT lowercased. auth.ts's authorize()
  // does `WHERE email = ${email}` with zero normalization (tdg_users.email
  // is a plain `text` column, case-sensitive), and /api/users inserts the
  // raw email the same way. Lowercasing only on this one entry point would
  // silently break login for anyone whose email has uppercase — stay
  // consistent with the rest of the codebase's (lack of) normalization
  // instead of introducing a mismatch here.
  const normalizedEmail = email.trim()
  // Hashed up front, outside the transaction — bcrypt cost 12 is CPU-bound
  // and holding a row lock for that long is unnecessary/wasteful.
  const passwordHash = await hash(password, 12)

  const client = await db.connect()
  try {
    await client.sql`BEGIN`

    const { rows: inviteRows } = await client.sql`
      SELECT id, agency_id, role, used_at, expires_at
      FROM tdg_invites
      WHERE token = ${token}
      FOR UPDATE
    `
    const invite = inviteRows[0]
    const isValid = Boolean(invite) && !invite.used_at && new Date(invite.expires_at as string) > new Date()

    if (!isValid) {
      await client.sql`ROLLBACK`
      return NextResponse.json({ error: GENERIC_INVITE_ERROR }, { status: 400 })
    }

    const { rows: existingUser } = await client.sql`
      SELECT id FROM tdg_users WHERE email = ${normalizedEmail} LIMIT 1
    `
    if (existingUser.length) {
      await client.sql`ROLLBACK`
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 })
    }

    const { rows: agencyRows } = await client.sql`
      SELECT name FROM tdg_agencies WHERE id = ${invite.agency_id as string} LIMIT 1
    `
    const agencyName = (agencyRows[0]?.name as string | undefined) ?? ''

    const { rows: userRows } = await client.sql`
      INSERT INTO tdg_users (name, email, agency_name, password_hash, role, agency_id, agent_interaction_id)
      VALUES (
        ${name.trim()}, ${normalizedEmail}, ${agencyName}, ${passwordHash},
        ${invite.role as string}, ${invite.agency_id as string},
        UPPER(LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 8))
      )
      RETURNING id, name, email, role
    `
    const newUser = userRows[0]

    await client.sql`
      UPDATE tdg_invites
      SET used_at = NOW(), used_by = ${newUser.id as string}
      WHERE id = ${invite.id as string} AND used_at IS NULL
    `

    await client.sql`COMMIT`
    return NextResponse.json({ ok: true, user: newUser })
  } catch (e: unknown) {
    try { await client.sql`ROLLBACK` } catch { /* ignore rollback error */ }
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 })
  } finally {
    client.release()
  }
}
