import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AnalyticsView from '@/components/AnalyticsView'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session) redirect('/flow/login')
  return <AnalyticsView />
}
