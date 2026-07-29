'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Search, Loader2, AlertCircle, X, ExternalLink } from 'lucide-react'
import TdgIconSprite from '@/components/TdgIconSprite'

interface Offer {
  id: string
  hotel_id: string | null
  hotel_name: string
  location: string | null
  offer_type: string | null
  commission: number
  valid_until: string | null
  highlights: string[]
  full_description: string | null
  image_url: string | null
  accent: string
}

/* Super Busca (padrão obrigatório em todo campo de busca Bemgsy) —
   case-insensitive, accent-insensitive, parcial, multi-campo. Sem
   biblioteca externa: normaliza removendo diacríticos via NFD. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function matchesSearch(offer: Offer, query: string): boolean {
  if (!query) return true
  const q = normalize(query)
  const haystack = normalize([
    offer.hotel_name,
    offer.location ?? '',
    offer.offer_type ?? '',
    ...offer.highlights,
  ].join(' '))
  return haystack.includes(q)
}

function formatValidity(validUntil: string | null): string {
  if (!validUntil) return ''
  const d = new Date(validUntil)
  return `Até ${d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
}

export default function OfertasList() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)

  const loadOffers = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch('/api/offers')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOffers(data.offers ?? [])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOffers() }, [loadOffers])

  const filtered = useMemo(() => {
    return [...offers]
      .filter(o => matchesSearch(o, search))
      .sort((a, b) => b.commission - a.commission)
  }, [offers, search])

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
      <TdgIconSprite />

      {/* Header — mesmo padrão de "Na prática": marca discreta + título +
          definição fixa da seção. */}
      <div style={{ maxWidth: 1320, margin: '0 auto 20px' }}>
        <p style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--tdgflow-accent-warm)', marginBottom: 4,
        }}>
          <svg style={{ width: 10, height: 10, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <use href="#i-compass" />
          </svg>
          Rede TDG
        </p>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
          Ofertas ativas
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>
          Tarifas e comissões negociadas, com prazo de validade
        </p>
        {!loading && !loadError && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>
            {filtered.length} de {offers.length} oferta{offers.length !== 1 ? 's' : ''} · ordenadas por comissão
          </p>
        )}

        {/* Super Busca */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, fontSize: '0.8125rem', maxWidth: 420 }}
            placeholder="Buscar hotel, destino, tipo de oferta…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60, color: 'var(--tdgflow-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" />
          <span style={{ fontSize: '0.875rem' }}>Carregando ofertas…</span>
        </div>
      )}

      {!loading && loadError && (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <AlertCircle size={28} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Não foi possível carregar as ofertas.</p>
          <button onClick={loadOffers} className="btn-ghost" style={{ fontSize: '0.75rem' }}>Tentar novamente</button>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <Search size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>
            {offers.length === 0 ? 'Nenhuma oferta ativa no momento.' : 'Nenhuma oferta encontrada.'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost" style={{ marginTop: 8, fontSize: '0.75rem' }}>
              Limpar busca
            </button>
          )}
        </div>
      )}

      {/* Grid — sem borda/sombra empilhadas: a foto e o espaço em branco entre
          cards fazem a separação, não uma moldura (benchmark Airbnb, ver
          skill bemgsy-design § Benchmarks Externos). */}
      {!loading && !loadError && filtered.length > 0 && (
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {filtered.map(offer => (
            <div
              key={offer.id}
              onClick={() => setSelectedOffer(offer)}
              style={{
                background: 'var(--tdgflow-surface)',
                borderRadius: 20,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {/* Photo + commission overlay */}
              <div style={{ position: 'relative', height: 160, overflow: 'hidden', background: 'var(--tdgflow-surface-high)' }}>
                {offer.image_url && (
                  <img
                    src={offer.image_url}
                    alt={offer.hotel_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, rgba(17,38,48,0.12) 0%, rgba(17,38,48,0.62) 100%)',
                }} />

                {/* Commission — bottom left */}
                <div style={{ position: 'absolute', bottom: 14, left: 18 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: '0 0 1px' }}>
                    <svg style={{ width: 9, height: 9, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      <use href="#i-percent" />
                    </svg>
                    Comissão
                  </p>
                  <p style={{ fontSize: '2.5rem', fontWeight: 200, color: 'var(--tdgflow-surface)', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>
                    {offer.commission}%
                  </p>
                </div>

                {/* Type badge — top right */}
                {offer.offer_type && (
                  <span style={{
                    position: 'absolute', top: 14, right: 14,
                    fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'var(--tdgflow-surface)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {offer.offer_type}
                  </span>
                )}
              </div>

              {/* Info section */}
              <div style={{ padding: '14px 18px 16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em', margin: '0 0 8px' }}>
                  {offer.hotel_name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
                  {offer.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg style={{ width: 11, height: 11, stroke: 'var(--tdgflow-text-faint)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
                        <use href="#i-pin" />
                      </svg>
                      <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>{offer.location}</span>
                    </div>
                  )}
                  {offer.valid_until && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg style={{ width: 11, height: 11, stroke: 'var(--tdgflow-text-faint)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
                        <use href="#i-calendar" />
                      </svg>
                      <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>{formatValidity(offer.valid_until)}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {offer.highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: offer.accent, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5 }}>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 24 }} />

      {/* Detalhe da oferta — a oferta tem prazo e é conteúdo próprio, não
          um atalho pra ficha do fornecedor; a ficha aparece como link
          secundário aqui dentro, não como destino do clique no card. */}
      <AnimatePresence>
        {selectedOffer && (
          <div
            onClick={() => setSelectedOffer(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              style={{
                position: 'relative',
                background: 'var(--tdgflow-surface)', borderRadius: '20px 20px 0 0',
                border: '1px solid var(--tdgflow-border)', borderBottom: 'none',
                width: '100%', maxWidth: 560, maxHeight: '88vh',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--tdgflow-border)' }} />
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}
              >
                <X size={14} color="#fff" />
              </button>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {selectedOffer.image_url && (
                  <div style={{ height: 200, overflow: 'hidden' }}>
                    <img src={selectedOffer.image_url} alt={selectedOffer.hotel_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}

                <div style={{ padding: '18px 22px 24px' }}>
                  {selectedOffer.offer_type && (
                    <p style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: selectedOffer.accent, marginBottom: 6 }}>
                      {selectedOffer.offer_type}
                    </p>
                  )}
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {selectedOffer.hotel_name}
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '10px 0 16px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', margin: 0 }}>Comissão</p>
                      <p style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>{selectedOffer.commission}%</p>
                    </div>
                    {selectedOffer.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg style={{ width: 12, height: 12, stroke: 'var(--tdgflow-text-faint)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}><use href="#i-pin" /></svg>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>{selectedOffer.location}</span>
                      </div>
                    )}
                    {selectedOffer.valid_until && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg style={{ width: 12, height: 12, stroke: 'var(--tdgflow-text-faint)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}><use href="#i-calendar" /></svg>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>{formatValidity(selectedOffer.valid_until)}</span>
                      </div>
                    )}
                  </div>

                  {selectedOffer.full_description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
                      {selectedOffer.full_description}
                    </p>
                  )}

                  {selectedOffer.highlights.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                      {selectedOffer.highlights.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: selectedOffer.accent, marginTop: 6, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5 }}>{h}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedOffer.hotel_id && (
                    <Link
                      href={`/flow/rede?tab=fornecedores&hotelId=${selectedOffer.hotel_id}`}
                      className="no-underline"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 10, marginTop: 4,
                        background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-navy)' }}>Ver ficha do fornecedor</span>
                      <ExternalLink size={13} style={{ color: 'var(--tdgflow-navy)' }} />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
