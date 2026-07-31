import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkTravelRequirements } from '@/lib/travel-docs'
import { logUsage } from '@/lib/usage-log'
import { checkAndDeductCredits, INSUFFICIENT_BALANCE, NO_AGENCY } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const destination = req.nextUrl.searchParams.get('q')?.trim()
  if (!destination) return NextResponse.json({ error: 'Destination required' }, { status: 400 })

  const passport = (req.nextUrl.searchParams.get('passport') ?? 'BR').toUpperCase().slice(0, 2)
  const userEmail = session.user?.email ?? 'unknown'

  const agencyId = await getAgencyId(userEmail)
  const credit = await checkAndDeductCredits({ agencyId, action: 'travel_docs', userEmail, isBemgsyAdmin: session.user?.role === 'admin' })
  if (!credit.ok) {
    if (credit.reason === NO_AGENCY) return NextResponse.json({ error: NO_AGENCY }, { status: 403 })
    return NextResponse.json({ error: INSUFFICIENT_BALANCE }, { status: 402 })
  }

  try {
    const result = await checkTravelRequirements(destination, passport)
    logUsage({ event_type: 'travel_docs', user_email: userEmail, meta: { destination, passport } })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
