'use client'

import { MapPin, Calendar } from 'lucide-react'

interface Offer {
  id: string
  hotel: string
  location: string
  type: string
  commission: number
  validity: string
  highlights: string[]
  image: string
  accent: string
}

const PUBLISHED_OFFERS: Offer[] = [
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

export default function OfertasList() {
  const sorted = [...PUBLISHED_OFFERS].sort((a, b) => b.commission - a.commission)

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>

      {/* Header */}
      <div style={{ maxWidth: 560, margin: '0 auto 20px' }}>
        <p className="section-label mb-1">Rede TDG</p>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#112630', letterSpacing: '-0.02em' }}>
          Ofertas ativas
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#4A7580', marginTop: 4 }}>
          {sorted.length} oferta{sorted.length !== 1 ? 's' : ''} disponível{sorted.length !== 1 ? 'is' : ''} · ordenadas por comissão
        </p>
      </div>

      {/* List */}
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map(offer => (
          <div
            key={offer.id}
            style={{
              background: '#fff',
              border: '1px solid #D0E2E5',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(17,38,48,0.06)',
            }}
          >
            {/* Photo + commission overlay */}
            <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
              <img
                src={offer.image}
                alt={offer.hotel}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(17,38,48,0.12) 0%, rgba(17,38,48,0.62) 100%)',
              }} />

              {/* Commission — bottom left */}
              <div style={{ position: 'absolute', bottom: 14, left: 18 }}>
                <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: '0 0 1px' }}>
                  Comissão
                </p>
                <p style={{ fontSize: '2.5rem', fontWeight: 200, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>
                  {offer.commission}%
                </p>
              </div>

              {/* Type badge — top right */}
              <span style={{
                position: 'absolute', top: 14, right: 14,
                fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
              }}>
                {offer.type}
              </span>
            </div>

            {/* Info section */}
            <div style={{ padding: '14px 18px 16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#112630', letterSpacing: '-0.01em', margin: '0 0 8px' }}>
                {offer.hotel}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} style={{ color: '#7BA8B2', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.75rem', color: '#4A7580' }}>{offer.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} style={{ color: '#7BA8B2', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.75rem', color: '#4A7580' }}>{offer.validity}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {offer.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: offer.accent, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', color: '#4A7580', lineHeight: 1.5 }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />
    </div>
  )
}
