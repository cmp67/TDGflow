import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { listNetworkPeople } from '@/lib/events-db'

export const dynamic = 'force-dynamic'

/* GET — pessoas da rede que podem ser convidadas (nome e agência; sem e-mail nem telefone). */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ people: await listNetworkPeople() })
}
