import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import OfertaSwipe from '@/components/OfertaSwipe'
import OfertasList from '@/components/OfertasList'

export default async function OfertasPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  const isAdmin = session.user?.role === 'admin'

  return isAdmin ? <OfertaSwipe /> : <OfertasList />
}
