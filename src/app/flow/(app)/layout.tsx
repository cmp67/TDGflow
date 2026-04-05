import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import FlowShell from '@/components/FlowShell'

export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/flow/login')

  return (
    <FlowShell user={{ name: session.user?.name ?? '', agency: session.user?.agency ?? '', role: session.user?.role ?? 'agent' }}>
      {children}
    </FlowShell>
  )
}
