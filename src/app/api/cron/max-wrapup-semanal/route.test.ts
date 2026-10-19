import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/events-db', async (orig) => ({ ...(await orig<typeof import('@/lib/events-db')>()), networkEventsOnDays: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/weekly-digest', () => ({ buildWeeklyDigest: vi.fn() }))
vi.mock('@/lib/max/broadcast', async (orig) => ({ ...(await orig<typeof import('@/lib/max/broadcast')>()), postToGroup: vi.fn(), postImageToGroup: vi.fn() }))

import { GET } from './route'
import { buildWeeklyDigest } from '@/lib/weekly-digest'
import { postToGroup, postImageToGroup } from '@/lib/max/broadcast'

const m = <T,>(f: T) => f as unknown as ReturnType<typeof vi.fn>
const digest = { issueNumber: 10, reviewCount: 2, reviewsByAgency: [{ agency_name: 'A', count: 2 }], recentReviews: [{ hotel_name: 'H', agent_name: 'X', agency_name: 'A', country: null, source: null }], openDiscoveries: 0, importedCount: 0, upcomingEvents: [], featuredReview: null, networkInsight: null, activeOfferHotels: [], expiringOfferHotels: [], changelog: [] }
const req = () => new NextRequest('https://x/api/cron/max-wrapup-semanal', { headers: { authorization: 'Bearer cs' } })

describe('wrap-up de domingo no grupo (arte, 19/10/2026)', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = 'cs'; m(buildWeeklyDigest).mockResolvedValue(digest) })
  it('posta a arte com link assinado e não manda texto', async () => {
    m(postImageToGroup).mockResolvedValue({ ok: true, messageId: 'I1' })
    const body = await (await GET(req())).json()
    expect(body).toMatchObject({ sent: true, format: 'arte' })
    expect(m(postImageToGroup).mock.calls[0][0]).toMatch(/^https:\/\/traveldesignersgroup\.com\.br\/api\/wrapup\/card\?d=\d{4}-\d{2}-\d{2}&t=[0-9a-f]{32}$/)
    expect(postToGroup).not.toHaveBeenCalled()
  })
  it('se a arte falhar, vai o texto', async () => {
    m(postImageToGroup).mockResolvedValue({ ok: false, error: 'x' })
    m(postToGroup).mockResolvedValue({ ok: true, messageId: 'T1' })
    expect(await (await GET(req())).json()).toMatchObject({ sent: true, format: 'texto' })
    expect(postToGroup).toHaveBeenCalled()
  })
})
