'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Phone, Users, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import TdgIconSprite from '@/components/TdgIconSprite'

/* ── Types ──────────────────────────────────────────────────────── */
interface NetworkContact {
  id: string
  name: string
  surname: string
  whatsapp: string
  email: string
  category: string
  organization: string
  context_trigger: string
  source_author: string
  source_date: string
  notes: string
}

/* ── Category config ────────────────────────────────────────────── */
const CATEGORIES: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'all',        label: 'Todos',      color: 'var(--tdgflow-text-primary)', bg: 'var(--tdgflow-surface-high)' },
  { key: 'hotel',      label: 'Hotel',      color: '#005F63', bg: '#E0F4F5' },
  { key: 'guia',       label: 'Guia / DMC', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'operadora',  label: 'Operadora',  color: '#6d28d9', bg: '#ede9fe' },
  { key: 'transfer',   label: 'Transfer',   color: '#b45309', bg: '#fef3c7' },
  { key: 'aérea',      label: 'Aérea',      color: '#0e7490', bg: '#cffafe' },
  { key: 'serviço',    label: 'Serviço',    color: '#047857', bg: '#d1fae5' },
  { key: 'hospedagem', label: 'Hospedagem', color: '#15803d', bg: '#dcfce7' },
  { key: 'fornecedor', label: 'Fornecedor', color: '#475569', bg: '#f1f5f9' },
  { key: 'jurídico',   label: 'Jurídico',   color: '#b91c1c', bg: '#fee2e2' },
  { key: 'tradução',   label: 'Tradução',   color: '#92400e', bg: '#fef3c7' },
  { key: 'médico',     label: 'Médico',     color: '#9d174d', bg: '#fce7f3' },
]

function getCat(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
}

/* ── Ícones de categoria — traço próprio, nunca emoji (regra de
   personalidade do design system Bemgsy). Um glifo de linha por
   categoria, mesmo estilo em toda a rede (stroke só, pontas
   arredondadas). ──────────────────────────────────────────────── */
function CategoryIcon({ categoryKey, size = 12 }: { categoryKey: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (categoryKey) {
    case 'hotel':
      return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="1.2" /><path d="M9.5 20v-4h5v4M9 9h.01M9 12.5h.01M15 9h.01M15 12.5h.01" /></svg>
    case 'guia':
      return <svg {...common}><path d="M4 20c4-8 4-8 8-8s4 8 8 8" /><circle cx="12" cy="6" r="2.2" /></svg>
    case 'operadora':
      return <svg {...common}><rect x="3" y="8" width="18" height="12" rx="1.5" /><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M3 13h18" /></svg>
    case 'transfer':
      return <svg {...common}><path d="M3.5 15.5l1.3-3.5A2 2 0 0 1 6.7 10.7h10.6a2 2 0 0 1 1.9 1.3l1.3 3.5" /><rect x="2.5" y="15.5" width="19" height="3" rx="1" /><circle cx="7" cy="18.7" r="1" /><circle cx="17" cy="18.7" r="1" /></svg>
    case 'aérea':
      return <svg {...common}><path d="M21 3L3 10.5l7 2.5M21 3l-7.5 18-2.5-7.5M21 3L10.5 12.5" /></svg>
    case 'serviço':
      return <svg {...common}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z" /></svg>
    case 'hospedagem':
      return <svg {...common}><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-6h4v6" /></svg>
    case 'fornecedor':
      return <svg {...common}><path d="M12 3a6 6 0 0 0-6 6v3l-2 4h16l-2-4V9a6 6 0 0 0-6-6z" /><path d="M9.5 20a2.5 2.5 0 0 0 5 0" /></svg>
    case 'jurídico':
      return <svg {...common}><path d="M12 3v18M8 21h8M5 7h14M5 7l-3 6a3 3 0 0 0 6 0l-3-6zM19 7l-3 6a3 3 0 0 0 6 0l-3-6z" /></svg>
    case 'tradução':
      return <svg {...common}><path d="M7 15c-2 0-3.5-1.4-3.5-3.5S5 8 7 8h4c2 0 3.5 1.4 3.5 3.5S13 15 11 15l-2 2.3V15H7z" /><path d="M17 9c1.7 0 3 1.3 3 3s-1.3 3-3 3h-.5l-1 1.5V15H13" /></svg>
    case 'médico':
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /></svg>
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function formatPhone(phone: string) {
  if (!phone) return ''
  return phone.replace(/^\+55\s?/, '')
}

/* ── Contact Card ───────────────────────────────────────────────── */
function ContactCard({ contact, copiedId, onCopy }: {
  contact: NetworkContact
  copiedId: string | null
  onCopy: (id: string, phone: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cat = getCat(contact.category)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: 'var(--tdgflow-surface)',
        border: '1px solid var(--tdgflow-border)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Top row: category badge + name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999,
          color: cat.color, background: cat.bg,
        }}>
          <CategoryIcon categoryKey={contact.category} size={11} />
          {cat.label}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.2, marginBottom: 1 }}>
            {contact.name}
          </p>
          {contact.organization && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.3 }}>{contact.organization}</p>
          )}
        </div>
        {contact.whatsapp && (
          <button
            onClick={e => { e.stopPropagation(); onCopy(contact.id, contact.whatsapp) }}
            title="Copiar número"
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 9px', borderRadius: 6,
              background: copiedId === contact.id ? '#E0F4F5' : 'var(--tdgflow-bg)',
              border: '1px solid var(--tdgflow-border)',
              color: copiedId === contact.id ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
              fontSize: '0.6875rem', cursor: 'pointer', transition: 'all 120ms',
            }}
          >
            {copiedId === contact.id
              ? <><CheckCircle2 size={11} /><span>{formatPhone(contact.whatsapp)}</span></>
              : <><Phone size={11} /><span>{formatPhone(contact.whatsapp)}</span></>
            }
          </button>
        )}
      </div>

      {/* Source triangle — always visible */}
      <div style={{
        background: 'var(--tdgflow-bg)', borderRadius: 7,
        padding: '9px 11px', borderLeft: `3px solid ${cat.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <Users size={10} style={{ color: 'var(--tdgflow-text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.05em' }}>
            indicado por{' '}
            <strong style={{ color: 'var(--tdgflow-text-primary)', fontWeight: 600 }}>
              {contact.source_author?.startsWith('+55')
                ? contact.source_author.replace(/^\+55\s?/, '')
                : contact.source_author}
            </strong>
            {contact.source_date && (
              <span style={{ opacity: 0.7 }}> · {formatDate(contact.source_date)}</span>
            )}
          </span>
        </div>
        {contact.context_trigger && (
          <div style={{ display: 'flex', gap: 5 }}>
            <MessageCircle size={10} style={{ color: 'var(--tdgflow-text-muted)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.45, fontStyle: 'italic' }}>
              {contact.context_trigger}
            </p>
          </div>
        )}
      </div>

      {/* Expanded: extra details */}
      <AnimatePresence>
        {expanded && (contact.notes || contact.email) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', marginTop: 8 }}
          >
            <div style={{ padding: '8px 0', borderTop: '1px solid var(--tdgflow-border)' }}>
              {contact.email && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 3 }}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3.5 6.5L12 13l8.5-6.5" />
                  </svg>
                  {contact.email}
                </p>
              )}
              {contact.notes && (
                <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5 }}>
                  {contact.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Main export ────────────────────────────────────────────────── */
export default function RedeView() {
  // Contacts state
  const [contacts, setContacts] = useState<NetworkContact[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [totalContacts, setTotalContacts] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab: 'contacts' })
    if (activeCategory !== 'all') params.set('category', activeCategory)
    if (search.trim()) params.set('search', search.trim())

    const res = await fetch(`/api/network-contacts?${params}`)
    const data = await res.json()
    setContacts(data.contacts ?? [])
    setCounts(data.counts ?? {})
    setTotalContacts(data.total ?? 0)
    setLoading(false)
  }, [activeCategory, search])

  useEffect(() => { load() }, [load])

  function handleCopy(id: string, phone: string) {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedId(id)
      toast('Número copiado!', 'success')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const visibleCategories = CATEGORIES.filter(c =>
    c.key === 'all' || (counts[c.key] ?? 0) > 0
  )

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
              Galera do Turismo
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4 }}>
              Contatos
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>
              Quem ligar: reps, DMCs, direto na fonte
            </p>
          </div>
          {!loading && (
            <div style={{ textAlign: 'right', paddingTop: 4 }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{totalContacts}</p>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>contatos</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px 10px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Nome, hotel, contexto, quem indicou..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, fontSize: '0.8125rem', background: 'var(--tdgflow-bg)' }}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, padding: '0 20px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {visibleCategories.map(cat => {
            const count = cat.key === 'all' ? totalContacts : (counts[cat.key] ?? 0)
            const active = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 999,
                  fontSize: '0.6875rem', fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  background: active ? cat.color : 'var(--tdgflow-surface-high)',
                  color: active ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-muted)',
                  border: active ? 'none' : '1px solid var(--tdgflow-border)',
                  transition: 'all 150ms',
                }}
              >
                {cat.key !== 'all' && <CategoryIcon categoryKey={cat.key} size={11} />}
                {cat.label}
                {count > 0 && (
                  <span style={{ opacity: active ? 0.8 : 0.6, fontSize: '0.625rem' }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, color: 'var(--tdgflow-text-muted)' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.875rem' }}>Carregando...</span>
          </div>
        )}

        {!loading && contacts.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Search size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nenhum contato encontrado.</p>
            {(search || activeCategory !== 'all') && (
              <button onClick={() => { setSearch(''); setActiveCategory('all') }}
                style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!loading && contacts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {contacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} copiedId={copiedId} onCopy={handleCopy} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Attribution footer */}
        {!loading && contacts.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', opacity: 0.6, letterSpacing: '0.08em', marginTop: 24, marginBottom: 8 }}>
            FONTE · GRUPO GALERA DO TURISMO · SET 2024 – MAR 2026
          </p>
        )}
      </div>
    </div>
  )
}
