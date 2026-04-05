import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { redirect } from 'next/navigation'
import AgenciaView from '@/components/AgenciaView'

export default async function AgenciaPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  const agency = session.user?.agency ?? ''
  const { rows: members } = await sql`
    SELECT id, name, email, role, created_at
    FROM tdg_users
    WHERE agency_name = ${agency} AND active = true
    ORDER BY created_at ASC
  `

  return (
    <AgenciaView
      user={{ name: session.user?.name ?? '', agency, role: session.user?.role ?? 'agent' }}
      members={members as { id: string; name: string; email: string; role: string; created_at: string }[]}
    />
  )
}
