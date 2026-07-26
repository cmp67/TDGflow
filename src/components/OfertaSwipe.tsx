'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { MapPin, Calendar, Check, Bookmark, X, RotateCcw, ChevronRight } from 'lucide-react'

/* ── Mock data ─────────────────────────────────────────────────── */
interface Offer {
  id: string
  hotel: string
  location: string
  type: string
  commission: number
  validity: string
  highlights: string[]
  image: string   // Unsplash photo URL
  accent: string  // subtle tint for dots
}

const OFFERS: Offer[] = [
  {
    id: '1',
    hotel: 'Velaa Private Island',
    location: 'Maldivas',
    type: 'Tarifa Preferencial',
    commission: 15,
    validity: 'Abr – Jun 2026',
    highlights: ['Mínimo 5 noites', 'Butler privativo incluso', 'Transfer aéreo gratuito'],
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=700&auto=format&fit=crop&q=80',
    accent: '#4a9bbe',
  },
  {
    id: '2',
    hotel: 'Martinhal Sagres',
    location: 'Algarve, Portugal',
    type: 'Comissão Especial',
    commission: 22,
    validity: 'Mai – Set 2026',
    highlights: ['Família, mínimo 3 noites', 'Kids club incluso', 'Upgrade sujeito a disponibilidade'],
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=700&auto=format&fit=crop&q=80',
    accent: '#7aaa5a',
  },
  {
    id: '3',
    hotel: 'Martinhal Quinta do Lago',
    location: 'Algarve, Portugal',
    type: 'Oferta Golf',
    commission: 18,
    validity: 'Mar – Jul 2026',
    highlights: ['Greens fees inclusos', 'Transfer para 3 campos', 'Spa como cortesia'],
    image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=700&auto=format&fit=crop&q=80',
    accent: '#c8a060',
  },
  {
    id: '4',
    hotel: 'Martinhal Lisboa Chiado',
    location: 'Lisboa, Portugal',
    type: 'Early Booking',
    commission: 20,
    validity: 'Jun – Ago 2026',
    highlights: ['Reserva com 90 dias de antecedência', 'Late checkout garantido', 'Café da manhã incluso'],
    image: 'https://images.unsplash.com/photo-1513735492246-483525079686?w=700&auto=format&fit=crop&q=80',
    accent: '#8080c8',
  },
  {
    id: '5',
    hotel: 'Six Senses Douro Valley',
    location: 'Douro, Portugal',
    type: 'Wellness Package',
    commission: 17,
    validity: 'Set – Nov 2026',
    highlights: ['Spa de 60 min por pessoa/dia', 'Vinhos locais no jantar', 'Mínimo 2 noites'],
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=700&auto=format&fit=crop&q=80',
    accent: '#c07840',
  },
]

type SwipeResult = { id: string; action: 'saved' | 'maybe' | 'skipped' }

/* ── Single draggable card ─────────────────────────────────────── */
function SwipeCard({
  offer,
  isTop,
  stackIndex,
  onSwipe,
}: {
  offer: Offer
  isTop: boolean
  stackIndex: number
  onSwipe: (action: 'saved' | 'maybe' | 'skipped') => void
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-18, 18])

  const savedOpacity   = useTransform(x, [20, 120],   [0, 1])
  const maybeOpacity   = useTransform(x, [-120, -20], [1, 0])
  const skippedOpacity = useTransform(y, [-120, -20], [1, 0])

  const scale   = 1 - stackIndex * 0.045
  const yOffset = stackIndex * 14
  const zIndex  = 10 - stackIndex

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number } }) {
    const { x: ox, y: oy } = info.offset
    const absX = Math.abs(ox), absY = Math.abs(oy)
    if (absY > absX && oy < -90) { onSwipe('skipped'); return }
    if (absX > 90 && ox > 0)     { onSwipe('saved');   return }
    if (absX > 90 && ox < 0)     { onSwipe('maybe');   return }
  }

  if (!isTop) {
    return (
      <motion.div
        style={{
          position: 'absolute', inset: 0, scale, y: yOffset, zIndex,
          borderRadius: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          pointerEvents: 'none',
          transformOrigin: 'bottom center',
          overflow: 'hidden',
        }}
        initial={false}
        animate={{ scale, y: yOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Blurred image preview for stacked cards */}
        <img
          src={offer.image}
          alt=""
          style={{ width: '100%', height: '55%', objectFit: 'cover', filter: 'blur(2px)', transform: 'scale(1.05)' }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      style={{ x, y, rotate, position: 'absolute', inset: 0, zIndex: 20, borderRadius: 20, cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Card shell */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(17,38,48,0.10)',
        }}
      >
        {/* ── Image section (top 55%) ── */}
        <div style={{ position: 'relative', height: '55%', overflow: 'hidden' }}>
          <img
            src={offer.image}
            alt={offer.hotel}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Gradient overlay for readability */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(17,38,48,0.18) 0%, rgba(17,38,48,0.55) 100%)',
            }}
          />
          {/* Commission — overlaid on image */}
          <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>
              Comissão
            </p>
            <p style={{ fontSize: 'clamp(2.5rem, 9vw, 3.5rem)', fontWeight: 200, color: 'var(--surface)', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {offer.commission}%
            </p>
          </div>
          {/* Type badge — top right */}
          <span
            style={{
              position: 'absolute', top: 14, right: 14,
              fontSize: '0.575rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: 'var(--surface)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {offer.type}
          </span>

          {/* SAVED overlay */}
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(46,125,79,0.25)',
              opacity: savedOpacity,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              padding: '18px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--success)', color: 'var(--surface)', padding: '5px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Check size={12} /> Salvar
            </div>
          </motion.div>

          {/* MAYBE overlay */}
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(182,65,15,0.20)',
              opacity: maybeOpacity,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
              padding: '18px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--warning)', color: 'var(--surface)', padding: '5px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Bookmark size={12} /> Talvez
            </div>
          </motion.div>

          {/* SKIP overlay */}
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(192,57,43,0.18)',
              opacity: skippedOpacity,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              padding: '18px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--error)', color: 'var(--surface)', padding: '5px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <X size={12} /> Pular
            </div>
          </motion.div>
        </div>

        {/* ── Info section (bottom 45%) ── */}
        <div style={{ padding: '16px 20px 20px', height: '45%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.35rem)', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
              {offer.hotel}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
              <MapPin size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{offer.location}</span>
              <span style={{ color: 'var(--border)', margin: '0 4px' }}>·</span>
              <Calendar size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{offer.validity}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {offer.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: offer.accent, marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 400 }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main component ────────────────────────────────────────────── */
export default function OfertaSwipe() {
  const [deck, setDeck]           = useState(OFFERS)
  const [results, setResults]     = useState<SwipeResult[]>([])
  const [lastAction, setLastAction] = useState<SwipeResult | null>(null)
  const [exiting, setExiting]     = useState<{ id: string; action: 'saved' | 'maybe' | 'skipped' } | null>(null)

  const saved    = results.filter(r => r.action === 'saved').length
  const maybe    = results.filter(r => r.action === 'maybe').length
  const total    = OFFERS.length
  const reviewed = results.length

  function handleSwipe(action: 'saved' | 'maybe' | 'skipped') {
    if (!deck[0]) return
    const top = deck[0]
    setExiting({ id: top.id, action })
    setTimeout(() => {
      setResults(prev => [...prev, { id: top.id, action }])
      setLastAction({ id: top.id, action })
      setDeck(prev => prev.slice(1))
      setExiting(null)
    }, 320)
  }

  function handleUndo() {
    if (!lastAction) return
    const last = results[results.length - 1]
    const offer = OFFERS.find(o => o.id === last.id)
    if (!offer) return
    setResults(prev => prev.slice(0, -1))
    setDeck(prev => [offer, ...prev])
    setLastAction(results.length > 1 ? results[results.length - 2] : null)
  }

  const exitVariants: Record<string, object> = {
    saved:   { x: 400,  y: -80, rotate: 20,  opacity: 0, transition: { duration: 0.32 } },
    maybe:   { x: -400, y: -80, rotate: -20, opacity: 0, transition: { duration: 0.32 } },
    skipped: { y: -500, rotate: 0, opacity: 0, transition: { duration: 0.32 } },
  }

  if (deck.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OfertaHeader reviewed={reviewed} total={total} saved={saved} maybe={maybe} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface-high)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={24} style={{ color: 'var(--gold)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Todas as ofertas revisadas</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{saved} salvas · {maybe} para considerar</p>
          </div>
          <button
            onClick={() => { setDeck(OFFERS); setResults([]); setLastAction(null) }}
            className="btn-ghost"
            style={{ gap: 6, fontSize: '0.8125rem' }}
          >
            <RotateCcw size={13} /> Recomeçar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none', background: 'var(--bg)' }}>
      <OfertaHeader reviewed={reviewed} total={total} saved={saved} maybe={maybe} />

      {/* Card area */}
      <div style={{ flex: 1, position: 'relative', padding: '12px 20px 8px' }}>
        <div style={{ position: 'relative', height: '100%', maxWidth: 420, margin: '0 auto' }}>
          <AnimatePresence>
            {deck.slice(0, 3).map((offer, index) => (
              <motion.div
                key={offer.id}
                style={{ position: 'absolute', inset: 0 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                exit={exiting?.id === offer.id ? exitVariants[exiting.action] as any : undefined}
              >
                <SwipeCard
                  offer={offer}
                  isTop={index === 0}
                  stackIndex={index}
                  onSwipe={index === 0 ? handleSwipe : () => {}}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ flexShrink: 0, padding: '8px 20px 20px', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.04em' }}>
          ← talvez &nbsp;·&nbsp; ↑ pular &nbsp;·&nbsp; salvar →
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <button
            onClick={() => handleSwipe('maybe')}
            style={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px solid rgba(182,65,15,0.3)', background: 'rgba(182,65,15,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(182,65,15,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(182,65,15,0.06)' }}
          >
            <Bookmark size={20} style={{ color: 'var(--warning)' }} />
          </button>

          <button
            onClick={() => handleSwipe('skipped')}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid rgba(192,57,43,0.25)', background: 'rgba(192,57,43,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(192,57,43,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(192,57,43,0.05)' }}
          >
            <X size={18} style={{ color: 'var(--error)' }} />
          </button>

          <button
            onClick={() => handleSwipe('saved')}
            style={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px solid rgba(0,140,148,0.35)', background: 'rgba(0,140,148,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,140,148,0.16)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,140,148,0.08)' }}
          >
            <Check size={20} style={{ color: 'var(--gold)' }} />
          </button>
        </div>

        {lastAction && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              onClick={handleUndo}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <RotateCcw size={11} /> Desfazer
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/* ── Header ────────────────────────────────────────────────────── */
function OfertaHeader({ reviewed, total, saved, maybe }: { reviewed: number; total: number; saved: number; maybe: number }) {
  const progress = (reviewed / total) * 100
  return (
    <div style={{ flexShrink: 0, padding: '16px 20px 0', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, maxWidth: 420, margin: '0 auto 10px' }}>
        <div>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Ofertas</h2>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 1 }}>{reviewed} de {total} revisadas</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saved > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{saved}</span>
            </div>
          )}
          {maybe > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{maybe}</span>
            </div>
          )}
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
      <div style={{ maxWidth: 420, margin: '0 auto', height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          style={{ height: '100%', background: 'var(--gold)', borderRadius: 2 }}
        />
      </div>
      <div style={{ height: 12 }} />
    </div>
  )
}
