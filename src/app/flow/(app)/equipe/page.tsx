import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import EquipeView from '@/components/EquipeView'

// "Minha Equipe" — scope decision: this page is for 'agency_admin' only.
// Global admin already has a cross-agency tool at /flow/gestao (all 19
// agencies); building a second, narrower "pick one agency" view here would
// duplicate that feature for no real benefit, so an admin landing here is
// redirected straight to /flow/gestao instead.
export default async function EquipePage() {
  const session = await auth()
  if (!session) redirect('/flow/login')
  if (session.user?.role === 'admin') redirect('/flow/gestao')
  if (session.user?.role !== 'agency_admin') redirect('/flow/chat')

  return <EquipeView agencyName={session.user?.agency ?? ''} />
}
