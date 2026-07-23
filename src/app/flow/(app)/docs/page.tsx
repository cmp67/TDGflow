import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DocsView from '@/components/DocsView'

export default async function DocsPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')

  return <DocsView />
}
