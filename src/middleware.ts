import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Protect all /flow/* except /flow/login
  matcher: ['/flow/((?!login).*)'],
}
