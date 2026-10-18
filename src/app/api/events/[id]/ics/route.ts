import { NextRequest, NextResponse } from 'next/server'
import { getEvent } from '@/lib/events-db'
import { buildIcs } from '@/lib/events'
import { APP_URL } from '@/lib/email'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* GET — arquivo .ics do evento (Apple Calendar, Outlook). Sem login, porque o
   link vai no e-mail e o app de calendário abre fora do navegador logado; só
   eventos da rede (nunca os "só minha agência") e nunca cancelados. O id é um
   UUID aleatório, não enumerável. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  const e = await getEvent(id, null)
  if (!e || e.cancelled_at || e.visibility !== 'rede') return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  return new NextResponse(buildIcs(e, APP_URL), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="tdg-${id.slice(0, 8)}.ics"` },
  })
}
