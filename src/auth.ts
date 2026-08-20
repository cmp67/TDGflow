import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { sql } from '@vercel/postgres'
import { authConfig } from './auth.config'
import { verifySsoToken } from '@/lib/flow-sso'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const password = credentials.password as string

        const { rows } = await sql`
          SELECT id, name, email, agency_name, password_hash, role
          FROM tdg_users
          WHERE email = ${email} AND active = true
          LIMIT 1
        `
        const user = rows[0]
        if (!user) return null

        const valid = await compare(password, user.password_hash)
        if (!valid) return null

        // Log de login — achado da Carla, 08/08: não existia NENHUM
        // rastro de quem logou/quando em lugar nenhum. Fire-and-forget,
        // nunca bloqueia nem falha o login por causa do log.
        sql`CREATE TABLE IF NOT EXISTS tdg_login_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`
          .then(() => sql`INSERT INTO tdg_login_events (user_id) VALUES (${user.id})`)
          .catch(() => { /* log não pode nunca quebrar o login */ })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          agency: user.agency_name,
          role: user.role,
        }
      },
    }),
    // Ponte SSO — Gonna Travel GUEST → TDG Flow, sem pedir senha de novo
    // (Carla, 19/08). Provider separado, nunca aceita email/senha — só o
    // token de uso único emitido pelo GUEST. Nunca provisiona conta nova:
    // se o email do token não bate com nenhum tdg_users ativo, falha limpo.
    Credentials({
      id: 'sso',
      name: 'Flow SSO',
      credentials: { token: { label: 'Token', type: 'text' } },
      async authorize(credentials) {
        if (!credentials?.token) return null
        const claims = await verifySsoToken(credentials.token as string)
        if (!claims) return null

        const { rows } = await sql`
          SELECT id, name, email, agency_name, role
          FROM tdg_users
          WHERE email = ${claims.email} AND active = true
          LIMIT 1
        `
        const user = rows[0]
        if (!user) return null

        sql`CREATE TABLE IF NOT EXISTS tdg_login_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`
          .then(() => sql`INSERT INTO tdg_login_events (user_id) VALUES (${user.id})`)
          .catch(() => { /* log não pode nunca quebrar o login */ })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          agency: user.agency_name,
          role: user.role,
        }
      },
    }),
  ],
})

declare module 'next-auth' {
  interface User { agency?: string; role?: string }
  interface Session {
    user: { agency?: string; role?: string } & { name?: string | null; email?: string | null; image?: string | null }
  }
}
