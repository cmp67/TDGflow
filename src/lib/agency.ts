import { sql } from '@vercel/postgres'

// Returns the real agency uuid (tdg_agencies.id) assigned to this user via
// tdg_users.agency_id, or null when the user has no agency assigned yet
// (e.g. internal/demo accounts predating the tdg_agencies rollout) or on
// lookup failure. Callers MUST treat null as "no agency" and fail closed —
// there is no longer a fallback pseudo-agency id.
export async function getAgencyId(email: string): Promise<string | null> {
  try {
    const { rows } = await sql`
      SELECT agency_id FROM tdg_users WHERE email = ${email} LIMIT 1
    `
    return (rows[0]?.agency_id as string | undefined) ?? null
  } catch {
    return null
  }
}
