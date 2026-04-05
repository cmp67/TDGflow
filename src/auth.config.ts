import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  pages: { signIn: '/flow/login' },
  session: { strategy: 'jwt' as const },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.agency = (user as { agency?: string }).agency
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (token.agency) session.user.agency = token.agency as string
      if (token.role) session.user.role = token.role as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
