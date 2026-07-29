import { auth } from '@/auth'
import { getOffers } from '@/lib/offers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const offers = await getOffers()
  return NextResponse.json({ offers })
}
