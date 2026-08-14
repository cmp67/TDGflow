import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import MaxInboxView from '@/components/MaxInboxView'

export default async function MaxPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  return <MaxInboxView />
}
