import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { redirect } from 'next/navigation'
import GestaoView from '@/components/GestaoView'

export default async function GestaoPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')
  if (session.user?.role !== 'admin') redirect('/flow/chat')

  const { rows: users } = await sql`
    SELECT id, name, email, agency_name, role, active, created_at
    FROM tdg_users
    ORDER BY agency_name, name ASC
  `

  return <GestaoView users={users as { id: string; name: string; email: string; agency_name: string; role: string; active: boolean; created_at: string }[]} />
}
