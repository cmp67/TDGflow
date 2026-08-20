import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { redirect } from 'next/navigation'
import AgenciaView from '@/components/AgenciaView'

export default async function AgenciaPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  const agency = session.user?.agency ?? ''
  const email  = session.user?.email  ?? ''

  // Fetch user's own profile row (avatar, whatsapp)
  let profile: { avatar_url: string | null; whatsapp: string | null } = { avatar_url: null, whatsapp: null }
  let members: { id: string; name: string; email: string; role: string; created_at: string }[] = []

  try {
    const { rows } = await sql`
      SELECT avatar_url, whatsapp FROM tdg_users WHERE email = ${email} LIMIT 1
    `
    if (rows[0]) profile = { avatar_url: rows[0].avatar_url ?? null, whatsapp: rows[0].whatsapp ?? null }
  } catch { /* non-blocking */ }

  if (agency) {
    try {
      const { rows } = await sql`
        SELECT id, name, email, role, created_at
        FROM tdg_users
        WHERE agency_name = ${agency} AND active = true
        ORDER BY created_at ASC
      `
      members = rows as typeof members
    } catch { /* non-blocking */ }
  }

  return (
    <AgenciaView
      user={{
        name:       session.user?.name   ?? '',
        email,
        agency,
        role:       session.user?.role   ?? 'agent',
        avatar_url: profile.avatar_url,
        whatsapp:   profile.whatsapp,
      }}
      members={members}
    />
  )
}
