'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Phone, Users, MessageCircle, CheckCircle2, Loader2, Lightbulb, AlertTriangle } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

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

interface KnowledgeTip {
  id: string
  title: string
  content: string
  source_author: string
  source_date: string
}

/* ── Category config ────────────────────────────────────────────── */
const CATEGORIES: { key: string; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'all',        label: 'Todos',      emoji: '',   color: 'var(--tdgflow-text-primary)', bg: 'var(--tdgflow-surface-high)' },
  { key: 'hotel',      label: 'Hotel',      emoji: '🏨', color: '#005F63', bg: '#E0F4F5' },
  { key: 'guia',       label: 'Guia / DMC', emoji: '🗺️', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'operadora',  label: 'Operadora',  emoji: '🧳', color: '#6d28d9', bg: '#ede9fe' },
  { key: 'transfer',   label: 'Transfer',   emoji: '🚗', color: '#b45309', bg: '#fef3c7' },
  { key: 'aérea',      label: 'Aérea',      emoji: '✈️', color: '#0e7490', bg: '#cffafe' },
  { key: 'serviço',    label: 'Serviço',    emoji: '🔧', color: '#047857', bg: '#d1fae5' },
  { key: 'hospedagem', label: 'Hospedagem', emoji: '🏡', color: '#15803d', bg: '#dcfce7' },
  { key: 'fornecedor', label: 'Fornecedor', emoji: '🛎️', color: '#475569', bg: '#f1f5f9' },
  { key: 'jurídico',   label: 'Jurídico',   emoji: '⚖️', color: '#b91c1c', bg: '#fee2e2' },
  { key: 'tradução',   label: 'Tradução',   emoji: '🔤', color: '#92400e', bg: '#fef3c7' },
  { key: 'médico',     label: 'Médico',     emoji: '🏥', color: '#9d174d', bg: '#fce7f3' },
]

function getCat(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
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
          flexShrink: 0,
          fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999,
          color: cat.color, background: cat.bg,
        }}>
          {cat.emoji} {cat.label}
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
                <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 3 }}>
                  📧 {contact.email}
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

/* ── Tip Card ───────────────────────────────────────────────────── */
function TipCard({ tip }: { tip: KnowledgeTip }) {
  const [expanded, setExpanded] = useState(false)

  // Detect if tip is a warning/critical tip
  const isAlert = /⚠️|NÃO|exige|proibido|impede|risco|atenção|jurídico|greve/i.test(tip.content ?? '')

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
        border: `1px solid ${isAlert ? '#fca5a5' : 'var(--tdgflow-border)'}`,
        borderLeft: `3px solid ${isAlert ? '#dc2626' : 'var(--tdgflow-navy-dim)'}`,
        borderRadius: 10,
        padding: '13px 15px',
        cursor: 'pointer',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {isAlert
          ? <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          : <Lightbulb size={14} style={{ color: 'var(--tdgflow-navy-dim)', flexShrink: 0, marginTop: 1 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3, marginBottom: 5 }}>
            {tip.title}
          </p>
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
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Users size={9} style={{ color: 'var(--tdgflow-text-muted)' }} />
        <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.04em' }}>
          {tip.source_author ?? 'Galera do Turismo'}
          {tip.source_date && <span style={{ opacity: 0.7 }}> · {formatDate(tip.source_date)}</span>}
        </span>
      </div>
    </motion.div>
  )
}

/* ── Main export ────────────────────────────────────────────────── */
export default function RedeView() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'tips'>('contacts')

  // Contacts state
  const [contacts, setContacts] = useState<NetworkContact[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [totalContacts, setTotalContacts] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')

  // Tips state
  const [tips, setTips] = useState<KnowledgeTip[]>([])
  const [totalTips, setTotalTips] = useState(0)

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab: activeTab })
    if (activeTab === 'contacts' && activeCategory !== 'all') params.set('category', activeCategory)
    if (search.trim()) params.set('search', search.trim())

    const res = await fetch(`/api/network-contacts?${params}`)
    const data = await res.json()

    if (activeTab === 'tips') {
      setTips(data.tips ?? [])
      setTotalTips(data.total ?? 0)
    } else {
      setContacts(data.contacts ?? [])
      setCounts(data.counts ?? {})
      setTotalContacts(data.total ?? 0)
    }
    setLoading(false)
  }, [activeTab, activeCategory, search])

  useEffect(() => { load() }, [load])

  // Reset category filter when switching tabs
  const switchTab = (tab: 'contacts' | 'tips') => {
    setActiveTab(tab)
    setSearch('')
    setActiveCategory('all')
  }

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

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
          <div>
            <p style={{ fontSize: '0.5625rem', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-navy-dim)', marginBottom: 3 }}>
              Galera do Turismo
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: activeTab === 'contacts' ? 4 : 0 }}>
              Inteligência Coletiva
            </h2>
            {activeTab === 'contacts' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>
                Quem ligar: reps, DMCs, direto na fonte
              </p>
            )}
          </div>
          {!loading && (
            <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{totalContacts}</p>
                <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>contatos</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{totalTips || 22}</p>
                <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>dicas</p>
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 0, padding: '0 20px 0', borderBottom: '1px solid var(--tdgflow-border)' }}>
          {([
            { key: 'contacts', label: 'Contatos' },
            { key: 'tips',     label: 'Dicas de Destino' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                padding: '8px 16px', fontSize: '0.75rem', fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid var(--tdgflow-navy-dim)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 150ms',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px 10px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder={activeTab === 'contacts' ? 'Nome, hotel, contexto, quem indicou...' : 'Destino, país, palavra-chave...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, fontSize: '0.8125rem', background: 'var(--tdgflow-bg)' }}
          />
        </div>

        {/* Category chips — contacts only */}
        {activeTab === 'contacts' && (
          <div style={{ display: 'flex', gap: 6, padding: '0 20px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {visibleCategories.map(cat => {
              const count = cat.key === 'all' ? totalContacts : (counts[cat.key] ?? 0)
              const active = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    flexShrink: 0, padding: '4px 12px', borderRadius: 999,
                    fontSize: '0.6875rem', fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    background: active ? cat.color : 'var(--tdgflow-surface-high)',
                    color: active ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-muted)',
                    border: active ? 'none' : '1px solid var(--tdgflow-border)',
                    transition: 'all 150ms',
                  }}
                >
                  {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
                  {count > 0 && (
                    <span style={{ marginLeft: 5, opacity: active ? 0.8 : 0.6, fontSize: '0.625rem' }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, color: 'var(--tdgflow-text-muted)' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.875rem' }}>Carregando...</span>
          </div>
        )}

        {/* Contacts grid */}
        {!loading && activeTab === 'contacts' && (
          <>
            {contacts.length === 0 ? (
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
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                <AnimatePresence mode="popLayout">
                  {contacts.map(contact => (
                    <ContactCard key={contact.id} contact={contact} copiedId={copiedId} onCopy={handleCopy} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Tips grid */}
        {!loading && activeTab === 'tips' && (
          <>
            {tips.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 60 }}>
                <Search size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nenhuma dica encontrada.</p>
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Limpar filtro
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                <AnimatePresence mode="popLayout">
                  {tips.map(tip => <TipCard key={tip.id} tip={tip} />)}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Attribution footer */}
        {!loading && (contacts.length > 0 || tips.length > 0) && (
          <p style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', opacity: 0.6, letterSpacing: '0.08em', marginTop: 24, marginBottom: 8 }}>
            FONTE · GRUPO GALERA DO TURISMO · SET 2024 – MAR 2026
          </p>
        )}
      </div>
    </div>
  )
}
