import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import OfertasList from '@/components/OfertasList'

export default async function OfertasPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  return <OfertasList />
}
