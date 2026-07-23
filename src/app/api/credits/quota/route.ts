import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getQuotaStatus, returnQuotaToPool } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await getAgencyId(session.user.email)
  if (!agencyId) return NextResponse.json({ error: 'NO_AGENCY' }, { status: 403 })

  const quota = await getQuotaStatus(agencyId)
  return NextResponse.json(quota)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await req.json()
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }

  const agencyId = await getAgencyId(session.user.email)
  if (!agencyId) return NextResponse.json({ error: 'NO_AGENCY' }, { status: 403 })

  const result = await returnQuotaToPool({
    agencyId,
    amount,
    adminEmail: session.user.email,
  })

  return NextResponse.json({ ok: true, returned: result.returned })
}
