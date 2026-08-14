'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader, MessageCircle, Search, Star, ArrowRight } from 'lucide-react'

interface MaxReview {
  id: string
  hotel_name: string
  hotel_id: string | null
  country: string | null
  agent_name: string
  agency_name: string
  overall_rating: number | null
  highlights: string[] | null
  heads_up: string | null
  must_experience: string | null
  created_at: string
}

// Accent-insensitive pra Super Busca — filtra marcas de acento (faixa
// Unicode 0x0300–0x036f) por code point, sem regex de char class (evita
// risco de caractere combinante mal codificado no arquivo fonte).
function foldForSearch(s: string): string {
  return Array.from(s.normalize('NFD'))
    .filter(ch => { const c = ch.codePointAt(0) ?? 0; return c < 0x0300 || c > 0x036f })
    .join('')
    .toLowerCase()
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function MaxInboxView() {
  const [items, setItems] = useState<MaxReview[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/reviews?source=max_whatsapp')
      const data = await res.json()
      if (res.ok) {
        setItems(data.reviews)
      } else {
        setLoadError(data.error ?? 'Erro ao carregar.')
      }
    })()
  }, [])

  const q = foldForSearch(query.trim())
  const filtered = (items ?? []).filter(r =>
    !q ||
    foldForSearch(r.hotel_name).includes(q) ||
    foldForSearch(r.agent_name ?? '').includes(q) ||
    foldForSearch(r.agency_name ?? '').includes(q) ||
    foldForSearch(r.country ?? '').includes(q)
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>

      <div className="mb-5">
        <p className="section-label mb-1">O que o Max capturou pela rede</p>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
          <MessageCircle size={19} style={{ color: 'var(--tdgflow-gold)' }} />
          Max — dicas via WhatsApp
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Toda dica que o Max registrou a partir de uma conversa de WhatsApp, mais recente primeiro.
        </p>
      </div>

      <div className="relative mb-5">
        <Search size={13} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--tdgflow-text-muted)' }} />
        <input
          className="input"
          placeholder="Fornecedor, TD, agência, destino…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 30, fontSize: '0.8125rem' }}
        />
      </div>

      {loadError && <p className="text-xs" style={{ color: 'var(--tdgflow-error)' }}>{loadError}</p>}

      {items === null && !loadError && (
        <div className="flex items-center justify-center py-10">
          <Loader size={18} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
        </div>
      )}

      {items && items.length === 0 && (
        <div className="card text-sm" style={{ color: 'var(--tdgflow-text-muted)' }}>
          O Max ainda não registrou nenhuma dica pelo WhatsApp. Assim que alguém mencionar &quot;@Max&quot; num grupo e pedir pra registrar algo, aparece aqui.
        </div>
      )}

      {items && items.length > 0 && filtered.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>Nada encontrado pra &quot;{query}&quot;.</p>
      )}

      <div className="space-y-3">
        {filtered.map(r => {
          const snippet = r.heads_up || r.must_experience || (r.highlights && r.highlights[0]) || null
          return (
            <div key={r.id} className="card" style={{ padding: '16px 18px' }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  {r.hotel_id ? (
                    <Link
                      href={`/flow/rede?tab=fornecedores&hotelId=${r.hotel_id}`}
                      className="text-sm font-semibold"
                      style={{ color: 'var(--tdgflow-text-primary)', textDecoration: 'none' }}
                    >
                      {r.hotel_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>{r.hotel_name}</span>
                  )}
                  {r.country && (
                    <span className="text-xs" style={{ color: 'var(--tdgflow-text-muted)', marginLeft: 6 }}>{r.country}</span>
                  )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--tdgflow-text-muted)' }}>{relativeTime(r.created_at)}</span>
              </div>

              <p className="text-xs mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
                {r.agent_name}{r.agency_name ? ` · ${r.agency_name}` : ''}
              </p>

              {snippet && (
                <p className="text-sm mt-2" style={{ color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>
                  {snippet}
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                {r.overall_rating != null ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tdgflow-gold)' }}>
                    <Star size={11} fill="var(--tdgflow-gold)" /> {r.overall_rating}
                  </span>
                ) : <span />}
                {r.hotel_id && (
                  <Link
                    href={`/flow/rede?tab=fornecedores&hotelId=${r.hotel_id}`}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--tdgflow-text-muted)', textDecoration: 'none' }}
                  >
                    Ver ficha <ArrowRight size={10} />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
