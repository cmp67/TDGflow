import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Protect all /flow/* except /flow/login and /flow/signup/[token] — the
  // latter is the public self-registration entry point (invite redemption),
  // reachable by a signed-out stranger with a valid link.
  matcher: ['/flow/((?!login|signup).*)'],
}
