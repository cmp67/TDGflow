import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { sql } from '@vercel/postgres'
import FlowShell from '@/components/FlowShell'

export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/flow/login')

  // Fetch avatar + brand from DB (not stored in JWT to keep token small)
  let avatarUrl: string | null = null
  let brand: { logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null } | null = null
  try {
    await sql`ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`
    const { rows } = await sql`SELECT avatar_url, agency_id FROM tdg_users WHERE email = ${session.user?.email ?? ''} LIMIT 1`
    avatarUrl = rows[0]?.avatar_url ?? null
    const agencyId = rows[0]?.agency_id as string | null | undefined

    if (agencyId) {
      const { rows: brandRows } = await sql`SELECT logo_url, primary_color, secondary_color FROM tdg_brand WHERE agency_id = ${agencyId} LIMIT 1`
      if (brandRows[0]) {
        brand = {
          logoUrl:        brandRows[0].logo_url ?? null,
          primaryColor:   brandRows[0].primary_color ?? null,
          secondaryColor: brandRows[0].secondary_color ?? null,
        }
      }
    }
  } catch { /* non-blocking — sem marca configurada, cai pro padrão TDG Flow */ }

  return (
    <FlowShell user={{
      name: session.user?.name ?? '',
      agency: session.user?.agency ?? '',
      role: session.user?.role ?? 'agent',
      avatar_url: avatarUrl,
    }} brand={brand}>
      {children}
    </FlowShell>
  )
}
