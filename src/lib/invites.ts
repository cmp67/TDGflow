import { randomBytes } from 'node:crypto'
import { sql } from '@vercel/postgres'

// ── Invite tokens ──────────────────────────────────────────────────────────
// Cryptographically random, not sequential/adivinhável (256 bits of entropy).
// This is the credential a stranger uses to create an account — it must not
// be guessable or derivable from anything public (agency id, timestamp, etc).

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export const MIN_SIGNUP_PASSWORD_LENGTH = 8

// ── Caller context ─────────────────────────────────────────────────────────
// Every endpoint that scopes data by agency MUST resolve role/agency_id from
// this DB lookup (by the authenticated session email), never from the JWT
// (agency_id isn't even present there — see auth.config.ts) and never from
// the request body/client. This is the tenant boundary between the 19
// agencies — same pattern already established in api/credits/route.ts.

export interface CallerContext {
  email:    string
  userId:   string | null
  role:     string | null
  agencyId: string | null
}

export async function getCallerContext(email: string): Promise<CallerContext> {
  const { rows } = await sql`
    SELECT id, role, agency_id FROM tdg_users WHERE email = ${email} LIMIT 1
  `
  return {
    email,
    userId:   (rows[0]?.id as string | undefined) ?? null,
    role:     (rows[0]?.role as string | undefined) ?? null,
    agencyId: (rows[0]?.agency_id as string | undefined) ?? null,
  }
}
