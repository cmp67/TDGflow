import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { sql } from '@vercel/postgres'
import SuggestionsView from '@/components/SuggestionsView'

export default async function SugestoesPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  const email = session.user?.email ?? ''
  let role = 'agent'
  try {
    const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
    role = rows[0]?.role ?? 'agent'
  } catch { /* non-blocking */ }

  return <SuggestionsView userRole={role} />
}
