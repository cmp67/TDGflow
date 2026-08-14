import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import WikiView from '@/components/WikiView'

export default async function WikiPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  return <WikiView />
}
