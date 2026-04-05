import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { sql } from '@vercel/postgres'
import { authConfig } from './auth.config'

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
