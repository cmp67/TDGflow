'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import TdgIconSprite from '@/components/TdgIconSprite'
import {
  SearchResults, EMPTY_RESULTS, ResultGroup,
  TipCard, HotelResultRow, ReviewResultRow, ContactResultRow, OfferResultRow,
} from '@/components/SearchResultRows'

/* Super Busca global (Fase 8d, 02/08) — pedido explícito da Carla: a busca
   cruzada da Fase 8 existia só dentro da tela de Destinos; precisa existir
   no TDG Flow inteiro, acessível de qualquer lugar. Botão fica no header
   (desktop e mobile, ver FlowShell.tsx), abre este overlay por cima de
   qualquer tela — não substitui as buscas locais de cada tela (que têm
   filtros próprios, ex. região/perfil em Hotéis), é o atalho pra achar
   qualquer coisa sem trocar de tela primeiro. */
export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300).trim()
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(false)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    fetch('/api/context').then(r => r.json()).then(ctx => setCurrentUserName(ctx.agent_name ?? null)).catch(() => {})
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const load = useCallback(async (signal: AbortSignal) => {
    if (!debouncedQuery) { setResults(EMPTY_RESULTS); setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?search=${encodeURIComponent(debouncedQuery)}`, { signal })
      setResults(await res.json())
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err
      return
    }
    setLoading(false)
  }, [debouncedQuery])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const total = results.knowledge.total + results.hotels.total + results.reviews.total
    + results.contacts.total + results.offers.total
  const isSearching = debouncedQuery.length > 0
  const noResults = isSearching && !loading && total === 0

  return (
    <>
      <TdgIconSprite />
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(10,7,3,0.55)', zIndex: 100 }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2"
        style={{
          top: '8vh', transform: 'translateX(-50%)', zIndex: 101,
          width: '100%', maxWidth: 560, maxHeight: '80vh',
          background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Search size={16} style={{ color: 'var(--tdgflow-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar hotel, dica, contato, oferta..."
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: '0.9375rem', color: 'var(--tdgflow-text-primary)' }}
          />
          {loading && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={16} style={{ color: 'var(--tdgflow-text-muted)' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {!isSearching && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center', paddingTop: 40 }}>
              Digite pra buscar em hotéis, dicas, conhecimento de destino, contatos e ofertas.
            </p>
          )}

          {noResults && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center', paddingTop: 40 }}>
              Nada encontrado para &ldquo;{debouncedQuery}&rdquo;.
            </p>
          )}

          {isSearching && !noResults && (
            <>
              <ResultGroup title="Ofertas" total={results.offers.total}>
                {results.offers.items.map(o => <OfferResultRow key={o.id} offer={o} onNavigate={onClose} />)}
              </ResultGroup>

              <ResultGroup title="Hotéis" total={results.hotels.total}>
                {results.hotels.items.map(h => <HotelResultRow key={h.id} hotel={h} onNavigate={onClose} />)}
              </ResultGroup>

              <ResultGroup title="Reviews" total={results.reviews.total}>
                {results.reviews.items.map(r => <ReviewResultRow key={r.id} review={r} onNavigate={onClose} currentUserName={currentUserName} onActed={() => load(new AbortController().signal)} />)}
              </ResultGroup>

              <ResultGroup title="Conhecimento" total={results.knowledge.total}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.knowledge.items.map(tip => <TipCard key={tip.id} tip={tip} currentUserName={currentUserName} onActed={() => load(new AbortController().signal)} />)}
                </div>
              </ResultGroup>

              <ResultGroup title="Contatos" total={results.contacts.total}>
                {results.contacts.items.map(c => <ContactResultRow key={c.id} contact={c} onNavigate={onClose} />)}
              </ResultGroup>
            </>
          )}
        </div>
      </div>
    </>
  )
}
