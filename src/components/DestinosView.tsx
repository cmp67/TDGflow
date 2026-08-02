'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Loader2, Lightbulb, AlertTriangle,
  Building2, Star, UserCircle2, MapPin,
} from 'lucide-react'
import TdgIconSprite from '@/components/TdgIconSprite'
import CopyLinkButton from '@/components/CopyLinkButton'
import PendingConfirmationQueue from '@/components/PendingConfirmationQueue'
import { useDebounce } from '@/hooks/useDebounce'

/* ── Types ──────────────────────────────────────────────────────── */
interface KnowledgeTip {
  id: string
  title: string
  content: string
  source_author: string
  source_date: string
  import_approval?: string | null
}

interface HotelResult {
  id: string
  name: string
  entity_type: string
  country: string | null
  location: string | null
  image_url: string | null
}

interface ReviewResult {
  id: string
  hotel_id: string | null
  hotel_name: string
  country: string | null
  must_experience: string | null
  heads_up: string | null
  overall_rating: number | null
  import_approval?: string | null
}

interface ContactResult {
  id: string
  hotel_id: string | null
  name: string
  surname: string
  organization: string | null
  category: string | null
  hotel_name: string | null
}

interface SearchResults {
  knowledge: { items: KnowledgeTip[]; total: number }
  hotels: { items: HotelResult[]; total: number }
  reviews: { items: ReviewResult[]; total: number }
  contacts: { items: ContactResult[]; total: number }
}

const EMPTY_RESULTS: SearchResults = {
  knowledge: { items: [], total: 0 },
  hotels: { items: [], total: 0 },
  reviews: { items: [], total: 0 },
  contacts: { items: [], total: 0 },
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

/* Selo cinza — mesma convenção da fila de confirmação (Fase 6): conteúdo
   importado que ainda não foi confirmado pelo autor/admin aparece, mas
   marcado, nunca como se já fosse conteúdo confirmado. */
function PendingBadge() {
  return (
    <span style={{
      fontSize: '0.5625rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)',
      background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
      borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap',
    }}>
      Aguardando confirmação
    </span>
  )
}

/* ── Tip card (grupo Conhecimento) ─────────────────────────────── */
function TipCard({ tip, highlightId }: { tip: KnowledgeTip; highlightId?: string | null }) {
  const isHighlighted = !!highlightId && tip.id === highlightId
  const [expanded, setExpanded] = useState(isHighlighted)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isHighlighted) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAlert = /⚠️|NÃO|exige|proibido|impede|risco|atenção|jurídico|greve/i.test(tip.content ?? '')

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: 'var(--tdgflow-surface)',
        border: isHighlighted ? '1.5px solid var(--tdgflow-navy)' : `1px solid ${isAlert ? '#fca5a5' : 'var(--tdgflow-border)'}`,
        borderLeft: `3px solid ${isAlert ? '#dc2626' : 'var(--tdgflow-navy-dim)'}`,
        boxShadow: isHighlighted ? '0 0 0 3px var(--tdgflow-navy-subtle)' : 'none',
        borderRadius: 10,
        padding: '13px 15px',
        cursor: 'pointer',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={e => { if (!isHighlighted) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { if (!isHighlighted) e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {isAlert
          ? <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          : <Lightbulb size={14} style={{ color: 'var(--tdgflow-navy-dim)', flexShrink: 0, marginTop: 1 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3, marginBottom: 5 }}>
              {tip.title}
            </p>
            {tip.import_approval === 'pending' && <PendingBadge />}
          </div>
          <p style={{
            fontSize: '0.75rem', color: '#2d4a52', lineHeight: 1.5,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: expanded ? 'visible' : 'hidden',
          }}>
            {tip.content}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={9} style={{ color: 'var(--tdgflow-text-muted)' }} />
          <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.04em' }}>
            {tip.source_author ?? 'TDG Knowledge Base'}
            {tip.source_date && <span style={{ opacity: 0.7 }}> · {formatDate(tip.source_date)}</span>}
          </span>
        </div>
        <CopyLinkButton path={`/flow/destinos?tipId=${tip.id}`} label={`Dica: ${tip.title}`} size={12} />
      </div>
    </motion.div>
  )
}

/* ── Result rows compactas (grupos Hotéis / Reviews / Contatos) ─── */
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)',
  borderRadius: 10, padding: '10px 12px', textDecoration: 'none', cursor: 'pointer',
}

function HotelResultRow({ hotel }: { hotel: HotelResult }) {
  return (
    <Link href={`/flow/rede?tab=fornecedores&hotelId=${hotel.id}`} style={rowStyle}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hotel.image_url ? undefined : 'linear-gradient(135deg, var(--tdgflow-navy-subtle), var(--tdgflow-surface-high))',
      }}>
        {hotel.image_url
          ? <img src={hotel.image_url} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Building2 size={15} style={{ color: 'var(--tdgflow-navy-dim)', opacity: 0.6 }} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3 }}>{hotel.name}</p>
        {(hotel.location || hotel.country) && (
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <MapPin size={9} />
            {[hotel.location, hotel.country].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  )
}

function ReviewResultRow({ review }: { review: ReviewResult }) {
  const snippet = review.must_experience || review.heads_up || ''
  return (
    <Link href={`/flow/dicas?reviewId=${review.id}`} style={rowStyle}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--tdgflow-surface-high)',
      }}>
        <Star size={14} style={{ color: 'var(--tdgflow-navy-dim)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3 }}>{review.hotel_name}</p>
          {review.import_approval === 'pending' && <PendingBadge />}
        </div>
        {snippet && (
          <p style={{
            fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {snippet}
          </p>
        )}
      </div>
    </Link>
  )
}

function ContactResultRow({ contact }: { contact: ContactResult }) {
  const linkPath = contact.hotel_id
    ? `/flow/rede?tab=fornecedores&hotelId=${contact.hotel_id}`
    : `/flow/rede?tab=contatos&contactId=${contact.id}`
  return (
    <Link href={linkPath} style={rowStyle}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--tdgflow-surface-high)',
      }}>
        <UserCircle2 size={16} style={{ color: 'var(--tdgflow-navy-dim)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3 }}>
          {contact.name} {contact.surname}
        </p>
        {(contact.hotel_name || contact.organization) && (
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>
            {contact.hotel_name || contact.organization}
          </p>
        )}
      </div>
    </Link>
  )
}

/* ── Grupo de resultados ────────────────────────────────────────── */
function ResultGroup({ title, total, children }: { title: string; total: number; children: React.ReactNode }) {
  if (total === 0) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{
        fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--tdgflow-text-muted)', marginBottom: 8,
      }}>
        {title} · {total}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

/* ── Main export ────────────────────────────────────────────────────
   Fase 4 da reorganização de caixinhas: "Dicas de Destino" morava dentro
   de Rede/Contatos (achado do arquiteto — conhecimento fragmentado numa
   tela cujo header se chamava "Contatos"). Vira item próprio na navegação.

   Fase 8 (02/08): Super Busca de verdade — quando há termo de busca, cruza
   conhecimento + hotéis + reviews + contatos via /api/search, agrupados por
   tipo. Sem termo de busca, comportamento não muda: lista plana de
   /api/knowledge-tips. */
export default function DestinosView() {
  const searchParams = useSearchParams()
  const highlightTipId = searchParams.get('tipId')
  const [tips, setTips] = useState<KnowledgeTip[]>([])
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  const totalResults = results.knowledge.total + results.hotels.total + results.reviews.total + results.contacts.total
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
              TDG Knowledge Base
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
            placeholder="Destino, hotel, contato, ou tema (ex: golpe, aéreo, pandemia)..."
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
            <ResultGroup title="Conhecimento" total={results.knowledge.total}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                <AnimatePresence mode="popLayout">
                  {results.knowledge.items.map(tip => <TipCard key={tip.id} tip={tip} highlightId={highlightTipId} />)}
                </AnimatePresence>
              </div>
            </ResultGroup>

            <ResultGroup title="Hotéis" total={results.hotels.total}>
              {results.hotels.items.map(h => <HotelResultRow key={h.id} hotel={h} />)}
            </ResultGroup>

            <ResultGroup title="Reviews" total={results.reviews.total}>
              {results.reviews.items.map(r => <ReviewResultRow key={r.id} review={r} />)}
            </ResultGroup>

            <ResultGroup title="Contatos" total={results.contacts.total}>
              {results.contacts.items.map(c => <ContactResultRow key={c.id} contact={c} />)}
            </ResultGroup>
          </>
        )}

        {!loading && !isSearching && tips.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {tips.map(tip => <TipCard key={tip.id} tip={tip} highlightId={highlightTipId} />)}
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
