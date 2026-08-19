'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Lightbulb, AlertTriangle, Building2, Star, UserCircle2, MapPin, Tag, Clock } from 'lucide-react'
import CopyLinkButton from '@/components/CopyLinkButton'
import { QueueCard, type PendingItem } from '@/components/PendingConfirmationQueue'
import { isAuthorMatch } from '@/lib/author-match'

/* ── Types compartilhados da Super Busca (Fase 8/8d) ──────────────
   Extraído de DestinosView.tsx pra ser reaproveitado pela busca global
   (GlobalSearch.tsx, acessível em qualquer tela) sem duplicar. */
export interface KnowledgeTip {
  id: string
  title: string
  content: string
  source_author: string
  source_date: string
  import_approval?: string | null
}

export interface HotelResult {
  id: string
  name: string
  entity_type: string
  country: string | null
  location: string | null
  image_url: string | null
  // Fase 8d — "inteligência": o resultado de hotel já diz se é testado e se
  // tem oferta correndo, pra guiar a recomendação sem precisar abrir a ficha.
  tested_count?: number
  active_offers_count?: number
  soonest_offer_days?: number | null
}

export interface ReviewResult {
  id: string
  hotel_id: string | null
  hotel_name: string
  country: string | null
  must_experience: string | null
  heads_up: string | null
  overall_rating: number | null
  import_approval?: string | null
  source_author?: string | null
  source_date?: string | null
}

export interface ContactResult {
  id: string
  hotel_id: string | null
  name: string
  surname: string
  organization: string | null
  category: string | null
  hotel_name: string | null
}

export interface OfferResult {
  id: string
  hotel_id: string | null
  hotel_name: string
  offer_type: string | null
  commission: number
  valid_until: string | null
  days_until_expiry: number | null
}

export interface SearchResults {
  knowledge: { items: KnowledgeTip[]; total: number }
  hotels: { items: HotelResult[]; total: number }
  reviews: { items: ReviewResult[]; total: number }
  contacts: { items: ContactResult[]; total: number }
  offers: { items: OfferResult[]; total: number }
}

export const EMPTY_RESULTS: SearchResults = {
  knowledge: { items: [], total: 0 },
  hotels: { items: [], total: 0 },
  reviews: { items: [], total: 0 },
  contacts: { items: [], total: 0 },
  offers: { items: [], total: 0 },
}

export function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

/* Selo cinza — mesma convenção da fila de confirmação (Fase 6): conteúdo
   importado que ainda não foi confirmado pelo autor/admin aparece, mas
   marcado, nunca como se já fosse conteúdo confirmado. */
export function PendingBadge() {
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

/* Selo dourado "Testado" — mesmo ícone/cor de HoteisView.tsx (supplierStatus),
   requer TdgIconSprite montado na página que usar isto. */
function TestedBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.5625rem', fontWeight: 700, color: 'var(--tdgflow-gold-dim)',
      background: 'var(--tdgflow-gold-subtle)', border: `1px solid var(--tdgflow-gold-dim)`,
      borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap',
    }}>
      <svg style={{ width: 9, height: 9, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <use href="#i-verified" />
      </svg>
      Testado
    </span>
  )
}

/* Selo de urgência — oferta expirando. Cor "atenção" (accent-warm), mesma
   semântica já usada pro selo "Aguardando teste" e alertas de conteúdo. */
function ExpiringBadge({ days }: { days: number }) {
  const label = days <= 0 ? 'Expira hoje' : days === 1 ? 'Expira amanhã' : `Expira em ${days}d`
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.5625rem', fontWeight: 700, color: 'var(--tdgflow-accent-warm)',
      background: 'var(--tdgflow-accent-warm-subtle)', border: '1px solid var(--tdgflow-accent-warm)',
      borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap',
    }}>
      <Clock size={9} />
      {label}
    </span>
  )
}

/* ── Tip card (grupo Conhecimento) ─────────────────────────────── */
// Achado da Carla, 10/08: o selo "Aguardando confirmação" era só decorativo
// — o autor via a própria nota marcada assim no meio do feed de todo mundo,
// mas não tinha nenhuma ação ali (só existia num painel separado, "Você
// disse isso — confirma?", que a pessoa podia nem associar à nota
// específica). Quando é do autor logado (isAuthorMatch), vira QueueCard de
// verdade — aprovar/editar/excluir ali mesmo, sem precisar caçar em outro lugar.
export function TipCard({ tip, highlightId, currentUserName, onActed }: {
  tip: KnowledgeTip
  highlightId?: string | null
  currentUserName?: string | null
  onActed?: () => void
}) {
  const isHighlighted = !!highlightId && tip.id === highlightId
  const [expanded, setExpanded] = useState(isHighlighted)
  const [handled, setHandled] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Hooks sempre correm na mesma ordem todo render — o return condicional
  // pro QueueCard (achado real, 10/08: React error #300, página quebrava)
  // precisa vir DEPOIS de todos os hooks, nunca antes.
  useEffect(() => {
    if (isHighlighted) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isMinePending = tip.import_approval === 'pending' && isAuthorMatch(tip.source_author, currentUserName)
  if (isMinePending && !handled) {
    return (
      <QueueCard
        item={{ id: tip.id, content_type: 'knowledge', title: tip.title, content: tip.content, source_author: tip.source_author, source_date: tip.source_date }}
        onActed={() => { setHandled(true); onActed?.() }}
      />
    )
  }

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
            {tip.source_author ?? 'Acervo TDG'}
            {tip.source_date && <span style={{ opacity: 0.7 }}> · {formatDate(tip.source_date)}</span>}
          </span>
        </div>
        <CopyLinkButton path={`/flow/destinos?tipId=${tip.id}`} label={`Dica: ${tip.title}`} size={12} />
      </div>
    </motion.div>
  )
}

/* ── Result rows compactas (grupos Hotéis / Reviews / Contatos / Ofertas) ── */
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)',
  borderRadius: 10, padding: '10px 12px', textDecoration: 'none', cursor: 'pointer',
}

export function HotelResultRow({ hotel, onNavigate }: { hotel: HotelResult; onNavigate?: () => void }) {
  return (
    <Link href={`/flow/rede?tab=fornecedores&hotelId=${hotel.id}`} onClick={onNavigate} style={rowStyle}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3 }}>{hotel.name}</p>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {!!hotel.tested_count && <TestedBadge />}
            {hotel.soonest_offer_days != null && <ExpiringBadge days={hotel.soonest_offer_days} />}
          </div>
        </div>
        {(hotel.location || hotel.country) && (
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <MapPin size={9} />
            {[hotel.location, hotel.country].filter(Boolean).join(' · ')}
            {!!hotel.active_offers_count && <span> · {hotel.active_offers_count} oferta{hotel.active_offers_count > 1 ? 's' : ''} ativa{hotel.active_offers_count > 1 ? 's' : ''}</span>}
          </p>
        )}
      </div>
    </Link>
  )
}

export function ReviewResultRow({ review, onNavigate, currentUserName, onActed }: {
  review: ReviewResult
  onNavigate?: () => void
  currentUserName?: string | null
  onActed?: () => void
}) {
  const [handled, setHandled] = useState(false)
  const isMinePending = review.import_approval === 'pending' && isAuthorMatch(review.source_author, currentUserName)
  if (isMinePending && !handled) {
    return (
      <QueueCard
        item={{
          id: review.id, content_type: 'review', title: review.hotel_name,
          heads_up: review.heads_up, must_experience: review.must_experience,
          source_author: review.source_author ?? '', source_date: review.source_date ?? '',
        }}
        onActed={() => { setHandled(true); onActed?.() }}
      />
    )
  }

  const snippet = review.must_experience || review.heads_up || ''
  return (
    <Link href={`/flow/dicas?reviewId=${review.id}`} onClick={onNavigate} style={rowStyle}>
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

export function ContactResultRow({ contact, onNavigate }: { contact: ContactResult; onNavigate?: () => void }) {
  const linkPath = contact.hotel_id
    ? `/flow/rede?tab=fornecedores&hotelId=${contact.hotel_id}`
    : `/flow/rede?tab=contatos&contactId=${contact.id}`
  return (
    <Link href={linkPath} onClick={onNavigate} style={rowStyle}>
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

export function OfferResultRow({ offer, onNavigate }: { offer: OfferResult; onNavigate?: () => void }) {
  return (
    <Link href={`/flow/ofertas?hotelId=${offer.hotel_id ?? ''}`} onClick={onNavigate} style={rowStyle}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--tdgflow-surface-high)',
      }}>
        <Tag size={14} style={{ color: 'var(--tdgflow-navy-dim)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3 }}>{offer.hotel_name}</p>
          {offer.days_until_expiry != null && <ExpiringBadge days={offer.days_until_expiry} />}
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>
          {offer.commission}% comissão{offer.offer_type ? ` · ${offer.offer_type}` : ''}
        </p>
      </div>
    </Link>
  )
}

/* ── Grupo de resultados ────────────────────────────────────────── */
export function ResultGroup({ title, total, children }: { title: string; total: number; children: React.ReactNode }) {
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

