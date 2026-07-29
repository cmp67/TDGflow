'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Search, Phone, Users, MessageCircle, CheckCircle2, Loader2, Plus, X, AlertCircle, Camera, PenLine, ScanLine } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

/* ── Types ──────────────────────────────────────────────────────── */
interface NetworkContact {
  id: string
  hotel_id: string | null
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

// Categorias que uma pessoa avulsa pode escolher ao se cadastrar. "Hotel/
// transfer/hospedagem/fornecedor" só existem quando o contato vem vinculado
// a um fornecedor (categoria automática, nunca escolhida manualmente) —
// achado do arquiteto: não deixar duplicar o que entity_type já tipifica.
const PERSON_CATEGORIES = CATEGORIES.filter(c =>
  !['all', 'hotel', 'transfer', 'hospedagem', 'fornecedor'].includes(c.key)
)

function getCat(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
}

/* ── Ícones de categoria — traço próprio, nunca emoji ─────────────── */
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

function initials(name: string, surname: string) {
  return `${name?.[0] ?? ''}${surname?.[0] ?? ''}`.toUpperCase()
}

/* ── Contact Card — avatar circular + chip, nunca foto (é o que
   diferencia visualmente "pessoa" de "propriedade" na lente Fornecedores;
   ver revisão Tesla do Contact Hub) ──────────────────────────────── */
function ContactCard({ contact, copiedId, onCopy, highlightId }: {
  contact: NetworkContact
  copiedId: string | null
  onCopy: (id: string, phone: string) => void
  highlightId?: string | null
}) {
  const isHighlighted = !!highlightId && contact.id === highlightId
  const [expanded, setExpanded] = useState(isHighlighted)
  const cat = getCat(contact.category)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isHighlighted) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        border: isHighlighted ? '1.5px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
        boxShadow: isHighlighted ? '0 0 0 3px var(--tdgflow-navy-subtle)' : 'none',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={e => { if (!isHighlighted) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { if (!isHighlighted) e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
          background: cat.bg, color: cat.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6875rem', fontWeight: 700,
        }}>
          {initials(contact.name, contact.surname)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.2, marginBottom: 2 }}>
            {contact.name} {contact.surname}
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999,
            color: cat.color, background: cat.bg,
          }}>
            <CategoryIcon categoryKey={contact.category} size={10} />
            {cat.label}
          </span>
          {contact.hotel_id && contact.organization && (
            <Link
              href={`/flow/rede?tab=fornecedores&hotelId=${contact.hotel_id}`}
              onClick={e => e.stopPropagation()}
              style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--tdgflow-navy)', marginTop: 3, textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              vinculado a {contact.organization}
            </Link>
          )}
          {!contact.hotel_id && contact.organization && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 3 }}>{contact.organization}</p>
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

      {(contact.source_author || contact.context_trigger) && (
        <div style={{
          background: 'var(--tdgflow-bg)', borderRadius: 7,
          padding: '9px 11px', borderLeft: `3px solid ${cat.color}`,
        }}>
          {contact.source_author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Users size={10} style={{ color: 'var(--tdgflow-text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.05em' }}>
                indicado por{' '}
                <strong style={{ color: 'var(--tdgflow-text-primary)', fontWeight: 600 }}>
                  {contact.source_author?.startsWith('+55') ? contact.source_author.replace(/^\+55\s?/, '') : contact.source_author}
                </strong>
                {contact.source_date && <span style={{ opacity: 0.7 }}> · {formatDate(contact.source_date)}</span>}
              </span>
            </div>
          )}
          {contact.context_trigger && (
            <div style={{ display: 'flex', gap: 5 }}>
              <MessageCircle size={10} style={{ color: 'var(--tdgflow-text-muted)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.45, fontStyle: 'italic' }}>{contact.context_trigger}</p>
            </div>
          )}
        </div>
      )}

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
                <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5 }}>{contact.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Add person form ──────────────────────────────────────────────── */
type AddMode = 'choose' | 'manual' | 'scan'

function AddPersonForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [mode, setMode] = useState<AddMode>('choose')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [category, setCategory] = useState(PERSON_CATEGORIES[0].key)
  const [organization, setOrganization] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Scan state — mesmo mecanismo (/api/scan-card) já usado no contato de
  // fornecedor (HoteisView.tsx), reaproveitado aqui pra não duplicar.
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanDone, setScanDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageCapture(file: File) {
    setScanPreview(URL.createObjectURL(file))
    setScanning(true)
    setScanDone(false)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/scan-card', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.card) {
        setName(data.card.name ?? '')
        setSurname(data.card.surname ?? '')
        setOrganization(data.card.company ?? '')
        setEmail(data.card.email ?? '')
        setWhatsapp(data.card.whatsapp ?? '')
        setNotes([data.card.title, data.card.notes].filter(Boolean).join(' · '))
        setScanDone(true)
        setMode('manual')
      } else {
        setError('Não foi possível ler o cartão. Preencha manualmente.')
        setMode('manual')
      }
    } catch {
      setError('Erro ao processar a imagem.')
      setMode('manual')
    }
    setScanning(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !surname.trim()) { setError('Nome e sobrenome são obrigatórios.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/hotel-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), surname: surname.trim(), category,
        organization: organization.trim() || null,
        whatsapp: whatsapp.trim() || null, email: email.trim() || null, notes: notes.trim() || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erro ao salvar contato.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', marginBottom: 16 }}>

      {/* Mode chooser */}
      {mode === 'choose' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>Nova pessoa</p>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              onClick={() => setMode('scan')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 12px', borderRadius: 10, cursor: 'pointer', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)' }}
            >
              <Camera size={22} style={{ color: 'var(--tdgflow-navy)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>Fotografar cartão</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>Preenche os dados automaticamente</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 12px', borderRadius: 10, cursor: 'pointer', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)' }}
            >
              <PenLine size={22} style={{ color: 'var(--tdgflow-navy)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>Inserir manualmente</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>Preencher os campos</span>
            </button>
          </div>
        </>
      )}

      {/* Scan mode */}
      {mode === 'scan' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fotografar cartão</p>
            <button type="button" onClick={() => setMode('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 2 }}><X size={14} /></button>
          </div>
          {scanning ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              {scanPreview && <img src={scanPreview} alt="cartão" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, marginBottom: 14, opacity: 0.7 }} />}
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tdgflow-navy)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>Lendo o cartão…</p>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageCapture(f) }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--tdgflow-border-light)', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--tdgflow-bg)' }}
              >
                <ScanLine size={28} style={{ color: 'var(--tdgflow-navy)', margin: '0 auto 10px' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', marginBottom: 4 }}>Tirar foto ou escolher imagem</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>A IA extrai nome, cargo, email e WhatsApp automaticamente</p>
              </div>
              <button type="button" onClick={() => setMode('manual')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', fontSize: '0.75rem', padding: '6px 0' }}>
                Preferir inserir manualmente
              </button>
            </>
          )}
        </>
      )}

      {/* Manual form — também aparece depois do scan, pré-preenchido */}
      {mode === 'manual' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>
                {scanDone ? 'Dados extraídos — revise e salve' : 'Nova pessoa'}
              </p>
              {scanDone && <CheckCircle2 size={13} style={{ color: 'var(--tdgflow-success)' }} />}
            </div>
            <button type="button" onClick={() => { setMode('choose'); setScanPreview(null); setScanDone(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          {scanPreview && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--tdgflow-border)', maxHeight: 100 }}>
              <img src={scanPreview} alt="cartão escaneado" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
            <input className="input" placeholder="Sobrenome" value={surname} onChange={e => setSurname(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
          </div>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ fontSize: '0.8125rem' }}>
            {PERSON_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input className="input" placeholder="Organização (opcional — ex: escritório, empresa)" value={organization} onChange={e => setOrganization(e.target.value)} style={{ fontSize: '0.8125rem' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
            <input className="input" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} />
          </div>
          <textarea className="input" placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }} />
          {error && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--tdgflow-error)' }}>
              <AlertCircle size={13} /> {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-gold" style={{ fontSize: '0.8125rem', padding: '8px 12px' }}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {submitting ? 'Salvando...' : 'Salvar contato'}
          </button>
        </form>
      )}
    </div>
  )
}

/* ── Main export ───────────────────────────────────────────────────── */
export default function ContatosLensView() {
  const searchParams = useSearchParams()
  const highlightContactId = searchParams.get('contactId')
  const [contacts, setContacts] = useState<NetworkContact[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [totalContacts, setTotalContacts] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeCategory !== 'all') params.set('category', activeCategory)
    if (search.trim()) params.set('search', search.trim())

    const res = await fetch(`/api/hotel-contacts?${params}`)
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
      <div style={{ flexShrink: 0, padding: '0 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
            <input
              className="input"
              placeholder="Nome, organização, contexto, quem indicou..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, fontSize: '0.8125rem', background: 'var(--tdgflow-bg)' }}
            />
          </div>
          <button onClick={() => setShowAddForm(v => !v)} className="btn-gold" style={{ padding: '6px 12px', fontSize: '0.75rem', flexShrink: 0 }}>
            <Plus size={13} /> Nova pessoa
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
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
                {count > 0 && <span style={{ opacity: active ? 0.8 : 0.6, fontSize: '0.625rem' }}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 14px' }}>
        {showAddForm && <AddPersonForm onSaved={load} onClose={() => setShowAddForm(false)} />}

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
                <ContactCard key={contact.id} contact={contact} copiedId={copiedId} onCopy={handleCopy} highlightId={highlightContactId} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
