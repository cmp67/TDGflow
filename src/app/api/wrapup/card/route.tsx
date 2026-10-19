import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { buildWeeklyDigest } from '@/lib/weekly-digest'
import { wrapupCardModel, cardHeight, verifyCard, type CardSection } from '@/lib/max/wrapup-card'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* Arte do wrap-up pro grupo (Carla, 19/10/2026): mesma cara do e-mail —
   cabeçalho navy com TDG | Flow, seções com título dourado, corpo branco,
   "Powered by Bemgsy" discreto no fim. Abre só com o link assinado do dia. */

const APP_URL = 'https://traveldesignersgroup.com.br'
const C = { navy: '#1A2B4C', navyDim: '#0D1826', gold: '#D4AF37', bg: '#F3F7F8', border: '#D0E2E5', text: '#104C64', muted: '#4A7580', head: '#7E93A3' }
const W = 1080

function Title({ children }: { children: string }) {
  return <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.gold, marginBottom: 22 }}>{children}</div>
}

function Section({ s, first }: { s: CardSection; first: boolean }) {
  const wrap = { display: 'flex', flexDirection: 'column' as const, padding: '0 64px', marginTop: first ? 0 : 56, ...(first ? {} : { borderTop: `2px solid ${C.border}`, paddingTop: 48 }) }
  if (s.kind === 'stats') {
    return (
      <div style={wrap}>
        <Title>Essa semana na rede</Title>
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `6px solid ${C.gold}`, background: C.bg, borderRadius: '0 16px 16px 0', padding: '28px 36px' }}>
          {s.reviews > 0 && <div style={{ display: 'flex', fontSize: 34, color: C.text }}><span style={{ fontWeight: 700, color: C.navy, marginRight: 12 }}>{String(s.reviews)}</span>{`${s.reviews === 1 ? 'avaliação registrada' : 'avaliações registradas'} por ${s.agencies} agência${s.agencies === 1 ? '' : 's'}`}</div>}
          {s.imported > 0 && <div style={{ display: 'flex', fontSize: 30, color: C.text, marginTop: s.reviews > 0 ? 14 : 0 }}><span style={{ fontWeight: 700, color: C.navy, marginRight: 10 }}>{String(s.imported)}</span>relatos do grupo agora estão no Flow</div>}
        </div>
      </div>
    )
  }
  if (s.kind === 'people') {
    return (
      <div style={wrap}>
        <Title>Quem foi pra onde</Title>
        {s.rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '16px 0', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: C.navy }}>{r.who}</div>
            <div style={{ display: 'flex', fontSize: 28, color: C.text }}>{r.where}</div>
          </div>
        ))}
      </div>
    )
  }
  if (s.kind === 'featured') {
    return (
      <div style={wrap}>
        <Title>Fornecedor em destaque</Title>
        {s.photo && <img src={s.photo} width={W - 128} height={400} style={{ objectFit: 'cover', borderRadius: 20, marginBottom: 24 }} />}
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: C.navy }}>{s.hotel}</div>
        <div style={{ display: 'flex', fontSize: 26, color: C.muted, marginTop: 6 }}>{[s.place, `por ${s.by}`, s.rating ? `nota ${s.rating}/5` : ''].filter(Boolean).join(' · ')}</div>
        {s.quote && <div style={{ display: 'flex', fontSize: 30, fontStyle: 'italic', color: C.text, marginTop: 20, lineHeight: 1.45 }}>{`“${s.quote.length > 170 ? `${s.quote.slice(0, 167)}…` : s.quote}”`}</div>}
      </div>
    )
  }
  const lines = s.kind === 'news' ? s.titles : s.lines
  return (
    <div style={wrap}>
      <Title>{s.kind === 'agenda' ? 'Agenda da semana' : s.kind === 'max' ? 'Fale com o Max' : 'Novidades no Flow e no Max'}</Title>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: s.kind === 'agenda' ? 22 : 14 }}>
          <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 6, background: C.gold, marginTop: 15, marginRight: 20, flexShrink: 0 }} />
          <div style={{ display: 'flex', fontSize: 30, color: C.text, lineHeight: 1.35 }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

async function straightenPhoto(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(W - 128, 400, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
    return `data:image/jpeg;base64,${jpg.toString('base64')}`
  } catch (err) {
    console.warn('[wrapup-card] foto do destaque indisponível', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const day = url.searchParams.get('d') ?? ''
  const secret = (process.env.WRAPUP_CARD_SECRET ?? process.env.CRON_SECRET ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !verifyCard(day, url.searchParams.get('t') ?? '', secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let model
  try {
    model = wrapupCardModel(await buildWeeklyDigest())
  } catch (err) {
    console.error('[wrapup-card] digest falhou', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'digest indisponível' }, { status: 503 })
  }
  if (!model) return NextResponse.json({ error: 'semana sem novidade' }, { status: 404 })

  // Foto de celular vem com orientação no EXIF, que o gerador ignora (saía
  // deitada): endireita, recorta no tamanho da arte e embute. Falhou → sem foto.
  model = { ...model, sections: await Promise.all(model.sections.map(async s => s.kind === 'featured' && s.photo ? { ...s, photo: await straightenPhoto(s.photo) } : s)) }

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: '100%', background: '#FFFFFF', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.navyDim, padding: '64px 0 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={`${APP_URL}/brand/tdg-mark.png`} height={52} style={{ height: 52 }} />
            <div style={{ display: 'flex', width: 2, height: 44, background: 'rgba(234,241,245,0.25)', margin: '0 28px' }} />
            <div style={{ display: 'flex', fontSize: 60, fontStyle: 'italic', color: C.gold }}>Flow</div>
          </div>
          <div style={{ display: 'flex', width: 110, height: 4, background: C.gold, opacity: 0.6, margin: '30px 0 26px', borderRadius: 2 }} />
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 5, textTransform: 'uppercase', color: C.head }}>{`Weekly Wrap-up · Edição #${model.issue}`}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontStyle: 'italic', color: C.gold, padding: '44px 64px 40px' }}>o que a rede fez essa semana</div>
        {model.sections.map((s, i) => <Section key={i} s={s} first={i === 0} />)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', padding: '48px 0 40px' }}>
          <div style={{ display: 'flex', fontSize: 28, color: C.text }}>Tudo no TDG Flow · traveldesignersgroup.com.br/flow</div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, color: C.muted, opacity: 0.5, marginTop: 22 }}>Powered by<img src={`${APP_URL}/brand/bemgsy-mark.png`} height={16} style={{ height: 16, marginLeft: 8 }} /></div>
        </div>
      </div>
    ),
    { width: W, height: cardHeight(model), headers: { 'cache-control': 'private, no-store' } },
  )
}
