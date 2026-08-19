'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Search, Loader2, Lightbulb } from 'lucide-react'
import TdgIconSprite from '@/components/TdgIconSprite'
import PendingConfirmationQueue from '@/components/PendingConfirmationQueue'
import { useDebounce } from '@/hooks/useDebounce'
import {
  KnowledgeTip, SearchResults, EMPTY_RESULTS, ResultGroup,
  TipCard, HotelResultRow, ReviewResultRow, ContactResultRow, OfferResultRow,
} from '@/components/SearchResultRows'

/* ── Main export ────────────────────────────────────────────────────
   Fase 4 da reorganização de caixinhas: "Dicas de Destino" morava dentro
   de Rede/Contatos (achado do arquiteto — conhecimento fragmentado numa
   tela cujo header se chamava "Contatos"). Vira item próprio na navegação.

   Fase 8 (02/08): Super Busca de verdade — quando há termo de busca, cruza
   conhecimento + hotéis + reviews + contatos + ofertas via /api/search
   (componentes de card/linha compartilhados em SearchResultRows.tsx, a
   mesma busca também virou global em GlobalSearch.tsx/FlowShell.tsx —
   Fase 8d). Sem termo de busca, comportamento não muda: lista plana de
   /api/knowledge-tips. */
export default function DestinosView() {
  const searchParams = useSearchParams()
  const highlightTipId = searchParams.get('tipId')
  const [tips, setTips] = useState<KnowledgeTip[]>([])
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300).trim()
  const isSearching = debouncedSearch.length > 0

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    try {
      if (debouncedSearch) {
        const res = await fetch(`/api/search?search=${encodeURIComponent(debouncedSearch)}`, { signal })
        const data: SearchResults = await res.json()
        setResults(data)
      } else {
        const res = await fetch('/api/knowledge-tips', { signal })
        const data = await res.json()
        setTips(data.tips ?? [])
        setTotal(data.total ?? 0)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err
      return
    }
    setLoading(false)
  }, [debouncedSearch])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  useEffect(() => {
    fetch('/api/context').then(r => r.json()).then(ctx => setCurrentUserName(ctx.agent_name ?? null)).catch(() => {})
  }, [])

  const totalResults = results.knowledge.total + results.hotels.total + results.reviews.total
    + results.contacts.total + results.offers.total
  const noResultsFound = isSearching && !loading && totalResults === 0
  const headerCount = isSearching ? totalResults : (total || tips.length)
  const headerLabel = isSearching ? 'resultados' : 'dicas'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TdgIconSprite />

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
          <div>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-navy-dim)', marginBottom: 3 }}>
              <svg style={{ width: 10, height: 10, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <use href="#i-compass" />
              </svg>
              Direto do WhatsApp
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4 }}>
              Acervo TDG
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>
              Conhecimento prático por país e destino: vistos, costumes, avisos
            </p>
          </div>
          {!loading && (
            <div style={{ textAlign: 'right', paddingTop: 4 }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{headerCount}</p>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>{headerLabel}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px 12px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Destino, hotel, contato, oferta, ou tema (ex: golpe, aéreo, pandemia)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, fontSize: '0.8125rem', background: 'var(--tdgflow-bg)' }}
          />
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Fase 6 — 3ª seção condicional, "você disse isso, confirma?" (decisão
            #14). Some sozinha quando não há pendência própria. Só faz sentido
            fora do modo de busca. */}
        {!isSearching && <PendingConfirmationQueue scope="mine" contentType="knowledge" title="Você disse isso — confirma?" />}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, color: 'var(--tdgflow-text-muted)' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.875rem' }}>Carregando...</span>
          </div>
        )}

        {!loading && !isSearching && tips.length === 0 && total === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb size={20} style={{ color: 'var(--tdgflow-text-muted)' }} />
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>Conhecimento da rede em reprocessamento</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--tdgflow-text-muted)', maxWidth: 340, lineHeight: 1.5 }}>
              A base de dicas por destino está passando por uma nova depuração antes de voltar pra cá. Assim que sair, notas e avisos práticos por país aparecem nesta tela.
            </p>
          </div>
        )}

        {noResultsFound && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Search size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nada encontrado para &ldquo;{debouncedSearch}&rdquo;.</p>
            <button onClick={() => setSearch('')}
              style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Limpar filtro
            </button>
          </div>
        )}

        {!loading && isSearching && !noResultsFound && (
          <>
            <ResultGroup title="Ofertas" total={results.offers.total}>
              {results.offers.items.map(o => <OfferResultRow key={o.id} offer={o} />)}
            </ResultGroup>

            <ResultGroup title="Conhecimento" total={results.knowledge.total}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                <AnimatePresence mode="popLayout">
                  {results.knowledge.items.map(tip => <TipCard key={tip.id} tip={tip} highlightId={highlightTipId} currentUserName={currentUserName} onActed={() => load(new AbortController().signal)} />)}
                </AnimatePresence>
              </div>
            </ResultGroup>

            <ResultGroup title="Hotéis" total={results.hotels.total}>
              {results.hotels.items.map(h => <HotelResultRow key={h.id} hotel={h} />)}
            </ResultGroup>

            <ResultGroup title="Reviews" total={results.reviews.total}>
              {results.reviews.items.map(r => <ReviewResultRow key={r.id} review={r} currentUserName={currentUserName} onActed={() => load(new AbortController().signal)} />)}
            </ResultGroup>

            <ResultGroup title="Contatos" total={results.contacts.total}>
              {results.contacts.items.map(c => <ContactResultRow key={c.id} contact={c} />)}
            </ResultGroup>
          </>
        )}

        {!loading && !isSearching && tips.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {tips.map(tip => <TipCard key={tip.id} tip={tip} highlightId={highlightTipId} currentUserName={currentUserName} onActed={() => load(new AbortController().signal)} />)}
            </AnimatePresence>
          </div>
        )}

        {!loading && !isSearching && tips.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', opacity: 0.6, letterSpacing: '0.08em', marginTop: 24, marginBottom: 8 }}>
            FONTE · DIRETO DO WHATSAPP · SET 2024 – MAR 2026
          </p>
        )}
      </div>
    </div>
  )
}
