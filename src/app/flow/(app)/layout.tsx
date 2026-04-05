import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { sql } from '@vercel/postgres'
import FlowShell from '@/components/FlowShell'

export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/flow/login')

  // Fetch avatar from DB (not stored in JWT to keep token small)
  let avatarUrl: string | null = null
  try {
    await sql`ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`
    const { rows } = await sql`SELECT avatar_url FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1`
    avatarUrl = rows[0]?.avatar_url ?? null
  } catch { /* non-blocking */ }

  return (
    <FlowShell user={{
      name: session.user?.name ?? '',
      agency: session.user?.agency ?? '',
      role: session.user?.role ?? 'agent',
      avatar_url: avatarUrl,
    }}>
      {children}
    </FlowShell>
  )
}
