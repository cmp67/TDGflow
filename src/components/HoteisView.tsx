'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Phone, Mail, ExternalLink,
  Building2, ChevronRight, Globe, ArrowRight,
  MessageCircle, Plus, Loader2, Trash2, UserCircle2,
  Camera, ScanLine, PenLine, CheckCircle2, AlertCircle, History,
} from 'lucide-react'
import { useRef } from 'react'
import Link from 'next/link'
import { readVideoDurationSeconds, MAX_VIDEO_DURATION_SECONDS } from '@/lib/video-upload'
import TdgIconSprite from '@/components/TdgIconSprite'
import CopyLinkButton from '@/components/CopyLinkButton'

/* ── Ícones próprios pra vídeo — traço só, sem emoji/biblioteca genérica
   (regra de personalidade do design system Bemgsy, mesma família visual do
   sprite em DicasView.tsx). ────────────────────────────────────────── */
function IconPlayClip({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M17 10l4-2.5v9L17 14" />
      <path d="M8.5 10.5v3l3-1.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IconHandshake({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.4 2.4 5.6-6.2" />
    </svg>
  )
}

/* ── Ícones de perfil — antes emoji cru (👨‍👩‍👧💑🏖️...), trocado por traço
   próprio (regra de personalidade do design system Bemgsy: nunca emoji em
   componente funcional). Um único wrapper, um path-set por perfil. ────── */
const PROFILE_ICON_PATHS: Record<string, React.ReactNode> = {
  'Família':      <><circle cx="8" cy="7.5" r="2.2" /><path d="M4.2 18c0-3 1.7-4.8 3.8-4.8s3.8 1.8 3.8 4.8" /><circle cx="16.2" cy="8.3" r="1.7" /><path d="M13.3 18c0-2.4 1.3-3.9 2.9-3.9s2.9 1.5 2.9 3.9" /></>,
  'Casais':       <><circle cx="9" cy="12" r="5.2" /><circle cx="15" cy="12" r="5.2" /></>,
  'Praia':        <><path d="M3 17.5c1.4-1.4 2.8-1.4 4.2 0s2.8 1.4 4.2 0 2.8-1.4 4.2 0 2.8 1.4 4.2 0" /><circle cx="12" cy="7.5" r="3" /></>,
  'Urban':        <path d="M4 20V10h4v10M10 20V6h4v14M16 20v-8h4v8" />,
  'Resort':       <><path d="M12 21V12" /><path d="M12 12c-3-.5-5.5-3-5-6 3 .2 5 2.3 5 6z" /><path d="M12 12c3-.5 5.5-3 5-6-3 .2-5 2.3-5 6z" /></>,
  'Boutique':     <><path d="M5 21V10M19 21V10M5 10l7-6 7 6M4.5 10h15" /><path d="M9 21v-6h6v6" /></>,
  'Golf':         <><path d="M6 21V4" /><path d="M6 4.5l8 3-8 3z" /></>,
  'Villas':       <><path d="M4 20V11L12 5l8 6v9" /><path d="M9 20v-6h6v6" /></>,
  'Overwater':    <><path d="M3 20h18" /><path d="M7.5 20v-6l4.5-2.6 4.5 2.6v6" /></>,
  'Ultra Luxury': <><path d="M6 9l6-5 6 5-6 11z" /><path d="M6 9h12M9.5 9L12 4M14.5 9L12 4" /></>,
  'Natureza':     <><path d="M6 19c8 0 12-6 12-14-8 0-12 6-12 14z" /><path d="M6.5 18.5c2-4 5-7 9-9" /></>,
  'Negócios':     <><rect x="4" y="8" width="16" height="11" rx="1.6" /><path d="M9 8V6.2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V8" /></>,
}

function ProfileIcon({ profileKey, size = 12 }: { profileKey: string; size?: number }) {
  const paths = PROFILE_ICON_PATHS[profileKey]
  if (!paths) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths}
    </svg>
  )
}

/* ── Types ──────────────────────────────────────────────────────── */
interface Hotel {
  id: string
  name: string
  entityType: string
  location: string
  country: string
  region: string
  description: string
  contact_email: string
  contact_phone: string
  website_url: string | null
  currency: string
  group: string | null
  image_url: string
  tags: string[]
  profiles: string[]   // advisor-facing filter categories
  gallery: { label: string; url: string }[]
  testedCount: number
  pendingLeadCount: number
  benefits: HotelBenefit[]
  isPrivate: boolean
}

interface HotelBenefit {
  id: string
  category: 'comissao' | 'amenidade' | 'pagamento' | 'outro'
  description: string
  commission_pct: number | null
}

const BENEFIT_CATEGORY_LABELS: Record<HotelBenefit['category'], string> = {
  comissao: 'Comissão diferenciada', amenidade: 'Amenidade exclusiva', pagamento: 'Condição de pagamento', outro: 'Outro',
}

function benefitBadgeText(benefits: HotelBenefit[]): string | null {
  if (benefits.length === 0) return null
  if (benefits.length === 1) {
    const b = benefits[0]
    return b.category === 'comissao' && b.commission_pct != null ? `${b.commission_pct}% TDG` : 'Condição especial TDG'
  }
  return 'Condições especiais TDG'
}

/* Status do fornecedor — antes uma bolinha discreta sem legenda em lugar
   nenhum (achado da Carla: "mal dá pra ver e não tá escrito o significado").
   Vira selo com ícone+texto, reaproveitando os mesmos símbolos e cores já
   usados em "Na prática" (i-verified/dourado = confirmado, i-spark/coral =
   a testar) — e some de vez quando não há nada a dizer, em vez de mostrar
   uma terceira cor "neutra" que ninguém decoraria de qualquer forma. */
function supplierStatus(hotel: Pick<Hotel, 'testedCount' | 'pendingLeadCount'>): {
  variant: 'testado' | 'descoberto'
  icon: string
  label: string
  color: string
  bg: string
  border: string
} | null {
  if (hotel.testedCount > 0) {
    return {
      variant: 'testado', icon: 'i-verified', label: 'Testado',
      color: 'var(--tdgflow-gold-dim)', bg: 'var(--tdgflow-gold-subtle)', border: 'var(--tdgflow-gold-dim)',
    }
  }
  if (hotel.pendingLeadCount > 0) {
    return {
      variant: 'descoberto', icon: 'i-spark', label: 'Aguardando teste',
      color: 'var(--tdgflow-accent-warm)', bg: 'var(--tdgflow-accent-warm-subtle)', border: 'var(--tdgflow-accent-warm)',
    }
  }
  return null
}

/* ── Filter definitions ─────────────────────────────────────────── */
const REGIONS = ['Todos', 'Algarve', 'Lisboa', 'Maldivas']

const PROFILES: { key: string; label: string }[] = [
  { key: 'Família',      label: 'Família' },
  { key: 'Casais',       label: 'Casais' },
  { key: 'Praia',        label: 'Praia' },
  { key: 'Urban',        label: 'Urban' },
  { key: 'Resort',       label: 'Resort' },
  { key: 'Boutique',     label: 'Boutique' },
  { key: 'Golf',         label: 'Golf' },
  { key: 'Villas',       label: 'Villas' },
  { key: 'Overwater',    label: 'Overwater' },
  { key: 'Ultra Luxury', label: 'Ultra Luxury' },
  { key: 'Natureza',     label: 'Natureza' },
  { key: 'Negócios',     label: 'Negócios' },
]

interface HotelContact {
  id: string
  hotel_id: string
  added_by: string
  name: string
  surname: string
  title?: string
  email?: string
  whatsapp?: string
  notes?: string
  created_at: string
}

/* ── Hotel data ─────────────────────────────────────────────────────
   Fase 1 da reorganização de caixinhas: catálogo deixou de ser um array
   fixo aqui e passou a vir de /api/hotels (tabela real tdg_hotels, que já
   existia no banco esperando por isso — ver migration 012). Mapeamento
   abaixo só converte snake_case do banco (group_name) pro nome já usado
   no resto deste arquivo (group). tested_count/pending_lead_count vêm de
   um join com reviews — ver supplierStatus() acima pra como isso vira cor.
──────────────────────────────────────────────────────────────────── */
interface HotelApiRow {
  id: string
  name: string
  entity_type: string
  location: string | null
  country: string | null
  region: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  website_url: string | null
  currency: string | null
  group_name: string | null
  image_url: string | null
  dot_color: string | null
  tags: string[] | null
  profiles: string[] | null
  gallery: { label: string; url: string }[] | null
  tested_count: number
  pending_lead_count: number
  benefits: HotelBenefit[] | null
  is_private: boolean
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel', beach_club: 'Beach Club', transfer: 'Transfer',
  guide: 'Guia', restaurant: 'Restaurante', other: 'Outro',
}

function mapHotelApiRow(row: HotelApiRow): Hotel {
  return {
    id: row.id,
    name: row.name,
    entityType: row.entity_type,
    location: row.location ?? '',
    country: row.country ?? '',
    region: row.region ?? '',
    description: row.description ?? '',
    contact_email: row.contact_email ?? '',
    contact_phone: row.contact_phone ?? '',
    website_url: row.website_url,
    currency: row.currency ?? '',
    group: row.group_name,
    image_url: row.image_url ?? '',
    tags: row.tags ?? [],
    profiles: row.profiles ?? [],
    gallery: row.gallery ?? [],
    testedCount: row.tested_count ?? 0,
    pendingLeadCount: row.pending_lead_count ?? 0,
    benefits: row.benefits ?? [],
    isPrivate: row.is_private ?? false,
  }
}

/* ── Hotel card ─────────────────────────────────────────────────── */
function HotelCard({ hotel, onClick }: { hotel: Hotel; onClick: () => void }) {
  const status = supplierStatus(hotel)
  const benefitText = benefitBadgeText(hotel.benefits)
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden group"
      style={{ background: 'var(--tdgflow-surface)', cursor: 'pointer' }}
      whileHover={{ scale: 1.015, boxShadow: '0 6px 20px rgba(90,60,30,0.12)' }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.16 }}
    >
      {/* Cover photo — compact height */}
      <div style={{ width: '100%', height: 118, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        <img
          src={hotel.image_url}
          alt={hotel.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          className="group-hover:scale-105"
          loading="lazy"
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(10,7,3,0.70) 0%, rgba(10,7,3,0.08) 55%, transparent 100%)',
        }} />
        {/* Name overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px 10px' }}>
          {hotel.group && (
            <p style={{ fontSize: '0.525rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>
              {hotel.group}
            </p>
          )}
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tdgflow-surface)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {hotel.name}
          </h3>
        </div>
        {benefitText && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 999,
            background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.02em',
          }}>
            <svg style={{ width: 9, height: 9, stroke: 'currentColor', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <use href="#i-percent" />
            </svg>
            {benefitText}
          </span>
        )}
        {status && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px 3px 6px', borderRadius: 999,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
            border: `1px solid ${status.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.02em', color: status.color,
          }}>
            <svg style={{ width: 9, height: 9, fill: status.icon === 'i-verified' ? 'none' : status.color, stroke: status.color, strokeWidth: 1.8 }}>
              <use href={`#${status.icon}`} />
            </svg>
            {status.label}
          </span>
        )}
      </div>

      {/* Card body — tight */}
      <div style={{ padding: '10px 12px 12px', borderTop: `2px solid ${status ? status.color : 'var(--tdgflow-border)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <svg style={{ width: 10, height: 10, stroke: 'var(--tdgflow-text-muted)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
            <use href="#i-pin" />
          </svg>
          <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hotel.location}</span>
          {hotel.isPrivate && (
            <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', flexShrink: 0 }}>· Só a sua agência vê</span>
          )}
        </div>
        {/* Profile pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {hotel.profiles.slice(0, 3).map(p => (
            <span key={p} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '0.5625rem', fontWeight: 500, letterSpacing: '0.04em',
              padding: '2px 7px', borderRadius: 999,
              background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
              color: 'var(--tdgflow-text-muted)',
            }}>
              <ProfileIcon profileKey={p} size={9} /> {p}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  )
}

/* ── Contact avatar ──────────────────────────────────────────────── */
function contactInitials(c: HotelContact) {
  return `${c.name[0] ?? ''}${c.surname[0] ?? ''}`.toUpperCase()
}

/* ── Add contact form ────────────────────────────────────────────── */
type AddMode = 'choose' | 'manual' | 'scan'

function AddContactForm({ hotelId, onSaved }: { hotelId: string; onSaved: (c: HotelContact) => void }) {
  const [mode, setMode] = useState<AddMode>('choose')
  const [form, setForm] = useState({ name: '', surname: '', title: '', email: '', whatsapp: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Scan state
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanDone, setScanDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

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
        setForm({
          name:     data.card.name     ?? '',
          surname:  data.card.surname  ?? '',
          title:    data.card.title    ?? '',
          email:    data.card.email    ?? '',
          whatsapp: data.card.whatsapp ?? '',
          notes:    [data.card.company, data.card.notes].filter(Boolean).join(' · '),
        })
        setScanDone(true)
        setMode('manual') // show form pre-filled
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

  async function save() {
    if (!form.name.trim() || !form.surname.trim()) { setError('Nome e sobrenome são obrigatórios.'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/hotel-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, ...form }),
      })
      const data = await res.json()
      if (data.contact) {
        onSaved(data.contact)
        setForm({ name: '', surname: '', title: '', email: '', whatsapp: '', notes: '' })
        setScanPreview(null)
        setScanDone(false)
        setMode('choose')
      }
    } catch { setError('Erro ao salvar. Tente novamente.') }
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>

      {/* Mode chooser */}
      {mode === 'choose' && (
        <>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Como deseja adicionar?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => setMode('scan')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '18px 12px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-navy-subtle)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface)' }}
            >
              <Camera size={22} style={{ color: 'var(--tdgflow-navy)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>Fotografar cartão</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>Preenche os dados automaticamente</span>
            </button>
            <button
              onClick={() => setMode('manual')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '18px 12px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-navy-subtle)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface)' }}
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
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Fotografar cartão
            </p>
            <button onClick={() => setMode('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 2 }}>
              <X size={14} />
            </button>
          </div>

          {scanning ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              {scanPreview && (
                <img src={scanPreview} alt="cartão" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, marginBottom: 14, opacity: 0.7 }} />
              )}
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
              {/* Upload zone */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--tdgflow-border-light)', borderRadius: 12, padding: '32px 20px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 150ms',
                  background: 'var(--tdgflow-surface)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-navy-subtle)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border-light)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface)' }}
              >
                <ScanLine size={28} style={{ color: 'var(--tdgflow-navy)', margin: '0 auto 10px' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', marginBottom: 4 }}>
                  Tirar foto ou escolher imagem
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>
                  Nome, cargo, e-mail e WhatsApp preenchidos automaticamente
                </p>
              </div>
              <button onClick={() => setMode('manual')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', fontSize: '0.75rem', padding: '6px 0' }}>
                Preferir inserir manualmente
              </button>
            </>
          )}
        </>
      )}

      {/* Manual form (also shown after scan with pre-fill) */}
      {mode === 'manual' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {scanDone ? 'Dados extraídos — revise e salve' : 'Novo contato'}
              </p>
              {scanDone && <CheckCircle2 size={13} style={{ color: 'var(--tdgflow-success)' }} />}
            </div>
            <button onClick={() => { setMode('choose'); setScanPreview(null); setScanDone(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 2 }}>
              <X size={14} />
            </button>
          </div>

          {/* Card thumbnail if scanned */}
          {scanPreview && (
            <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--tdgflow-border)', maxHeight: 100 }}>
              <img src={scanPreview} alt="cartão escaneado" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)' }}>
              <AlertCircle size={13} style={{ color: 'var(--tdgflow-error)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)' }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Nome *" style={{ fontSize: '0.8125rem', padding: '8px 12px' }} value={form.name} onChange={e => setField('name', e.target.value)} />
            <input className="input" placeholder="Sobrenome *" style={{ fontSize: '0.8125rem', padding: '8px 12px' }} value={form.surname} onChange={e => setField('surname', e.target.value)} />
          </div>
          <input className="input" placeholder="Cargo / Título" style={{ fontSize: '0.8125rem', padding: '8px 12px', marginBottom: 8 }} value={form.title} onChange={e => setField('title', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Email" type="email" style={{ fontSize: '0.8125rem', padding: '8px 12px' }} value={form.email} onChange={e => setField('email', e.target.value)} />
            <input className="input" placeholder="WhatsApp" style={{ fontSize: '0.8125rem', padding: '8px 12px' }} value={form.whatsapp} onChange={e => setField('whatsapp', e.target.value)} />
          </div>
          <input className="input" placeholder="Notas (empresa, como conheceu…)" style={{ fontSize: '0.8125rem', padding: '8px 12px', marginBottom: 10 }} value={form.notes} onChange={e => setField('notes', e.target.value)} />
          <button
            onClick={save}
            disabled={saving}
            className="btn-gold"
            style={{ width: '100%', justifyContent: 'center', padding: '9px 16px' }}
          >
            {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : 'Salvar contato'}
          </button>
        </>
      )}
    </div>
  )
}

/* ── Vídeos da rede ─────────────────────────────────────────────────────
   Nasce dentro da ficha do hotel, mesmo padrão de nesting dos contatos —
   nunca uma galeria solta no menu. tdg_knowledge já suportava type=video
   via Vercel Blob, mas era admin-only (KnowledgeAdmin.tsx); aqui abre pro
   membro comum, com o limite de 30s por clipe e o aceite explícito do
   hotel antes do vídeo circular além da rede interna. ─────────────────── */
interface KnowledgeVideo {
  id: string
  hotel_id: string
  title: string
  url: string
  duration_seconds: number | null
  agreed_with_hotel: boolean
  source_date: string | null   // filmado em
  source_author: string | null // quem filmou
  created_at: string
}

function fmtVideoDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function AddVideoForm({ hotelId, onSaved, onCancel }: {
  hotelId: string
  onSaved: (v: KnowledgeVideo) => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [filmedAt, setFilmedAt] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setError('')
    setFile(f)
    setDuration(null)
    try {
      const d = await readVideoDurationSeconds(f)
      setDuration(d)
      if (d > MAX_VIDEO_DURATION_SECONDS) {
        setError(`Esse vídeo tem ${Math.round(d)}s — o limite é ${MAX_VIDEO_DURATION_SECONDS}s por clipe. Escolha um trecho mais curto.`)
      }
    } catch {
      setError('Não foi possível ler a duração do vídeo. Tente outro arquivo.')
    }
  }

  const canSave = !!file && duration !== null && duration <= MAX_VIDEO_DURATION_SECONDS
    && title.trim() && filmedAt && agreed

  async function save() {
    if (!canSave || !file) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('hotel_id', hotelId)
      fd.append('title', title.trim())
      fd.append('file', file)
      fd.append('duration_seconds', String(duration))
      fd.append('agreed_with_hotel', 'true')
      fd.append('filmed_at', filmedAt)
      const res = await fetch('/api/knowledge', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao enviar o vídeo.'); setSaving(false); return }
      onSaved(data.item)
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    }
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Novo vídeo — até {MAX_VIDEO_DURATION_SECONDS}s
        </p>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed var(--tdgflow-border)', borderRadius: 10, padding: '16px', textAlign: 'center',
          cursor: 'pointer', marginBottom: 10, background: 'var(--tdgflow-surface)',
        }}
      >
        <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {file
          ? <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-primary)', fontWeight: 500 }}>
              {file.name}{duration !== null && ` · ${Math.round(duration)}s`}
            </p>
          : <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>Toque pra escolher um vídeo curto</p>
        }
      </div>

      <input
        className="input"
        placeholder="Título (ex: Vista da suíte master, Tour pelo restaurante...)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: '100%', marginBottom: 8, fontSize: '0.8125rem' }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'block', marginBottom: 3 }}>Filmado em</label>
          <input className="input" type="date" value={filmedAt} onChange={e => setFilmedAt(e.target.value)} style={{ width: '100%', fontSize: '0.8125rem' }} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>
          Combinei com o hotel — esse vídeo pode circular além da rede interna e aparecer pro cliente final.
        </span>
      </label>

      {error && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)', marginBottom: 10 }}>{error}</p>}

      <button
        onClick={save}
        disabled={!canSave || saving}
        className="btn-gold"
        style={{ width: '100%', justifyContent: 'center', padding: '9px 16px', opacity: canSave ? 1 : 0.5 }}
      >
        {saving ? <><Loader2 size={13} className="animate-spin" /> Enviando…</> : 'Publicar vídeo'}
      </button>
    </div>
  )
}

function HotelVideos({ hotelId }: { hotelId: string }) {
  const [videos, setVideos] = useState<KnowledgeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge?hotel_id=${hotelId}&type=video`)
      const data = await res.json()
      setVideos(data.items ?? [])
    } catch { /* silent */ }
    setLoading(false)
  }, [hotelId])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  async function deleteVideo(id: string) {
    setDeletingId(id)
    await fetch('/api/knowledge', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setVideos(prev => prev.filter(v => v.id !== id))
    setDeletingId(null)
  }

  function onVideoSaved(v: KnowledgeVideo) {
    setVideos(prev => [v, ...prev])
    setShowAddForm(false)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: '0.5875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlayClip size={11} />
          Vídeos da rede
        </p>
        <button onClick={() => setShowAddForm(s => !s)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 4 }}>
          <Plus size={12} /> {showAddForm ? 'Cancelar' : 'Adicionar'}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto' }} />
        </div>
      )}

      {!loading && videos.length === 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%', textAlign: 'center', padding: '16px',
            border: '1px dashed var(--tdgflow-border)', borderRadius: 12,
            background: 'transparent', cursor: 'pointer', color: 'var(--tdgflow-text-muted)',
            fontSize: '0.8125rem',
          }}
        >
          <IconPlayClip size={20} style={{ margin: '0 auto 6px', color: 'var(--tdgflow-border-light)' }} />
          <p>Nenhum vídeo ainda.</p>
          <p style={{ fontSize: '0.75rem', marginTop: 2 }}>Suba um clipe de até {MAX_VIDEO_DURATION_SECONDS}s de uma visita real.</p>
        </button>
      )}

      <AnimatePresence>
        {videos.map(v => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface-high)',
              marginBottom: 8,
            }}
          >
            <a
              href={v.url} target="_blank" rel="noreferrer"
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconPlayClip size={18} style={{ color: 'var(--tdgflow-navy)' }} />
            </a>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.2 }}>{v.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                {v.duration_seconds !== null && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>{Math.round(v.duration_seconds)}s</span>
                )}
                {v.source_date && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>· filmado {fmtVideoDate(v.source_date)}</span>
                )}
                {v.agreed_with_hotel && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6875rem', color: 'var(--tdgflow-success)' }}>
                    <IconHandshake size={10} /> combinado com o hotel
                  </span>
                )}
              </div>
              {v.source_author && (
                <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', marginTop: 5, letterSpacing: '0.02em' }}>
                  Filmado por {v.source_author}
                </p>
              )}
            </div>
            <button
              onClick={() => deleteVideo(v.id)}
              disabled={deletingId === v.id}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
            >
              {deletingId === v.id
                ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
                : <Trash2 size={13} style={{ color: 'var(--tdgflow-border-light)' }} />
              }
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {showAddForm && <AddVideoForm hotelId={hotelId} onSaved={onVideoSaved} onCancel={() => setShowAddForm(false)} />}
    </div>
  )
}

/* ── Reviews reais dentro da ficha ────────────────────────────────
   Fase 2: review não tem seção própria, vive dentro do anúncio (mesmo
   princípio Airbnb já aplicado ao entity_type). Antes disso a ficha
   terminava num link morto pro feed inteiro de "Na prática", sem filtro. */
interface HotelReviewRow {
  id: string
  agent_name: string
  agency_name: string
  visit_date: string | null
  overall_rating: number
  highlights: string[] | null
  client_profile: string | null
}

function fmtReviewDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function HotelReviews({ hotelId, hotelName }: { hotelId: string; hotelName: string }) {
  const [reviews, setReviews] = useState<HotelReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/reviews?hotelId=${hotelId}`)
      .then(res => res.json())
      .then(data => { if (!cancelled) setReviews(data.reviews ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hotelId])

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: '0.5875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 12 }}>
        O que a rede achou
      </p>

      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto' }} />
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', padding: '4px 0' }}>
          Ninguém da rede visitou ainda.
        </p>
      )}

      {!loading && reviews.map(r => (
        <div key={r.id} style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 8,
          border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface-high)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>
              {r.agent_name} <span style={{ fontWeight: 400, color: 'var(--tdgflow-text-muted)' }}>· {r.agency_name}</span>
            </span>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              color: 'var(--tdgflow-navy-dim)', background: 'var(--tdgflow-navy-subtle)',
            }}>
              {r.overall_rating > 0 ? `+${r.overall_rating}` : r.overall_rating}
            </span>
          </div>
          {r.highlights && r.highlights.length > 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5 }}>
              {r.highlights[0]}
            </p>
          )}
          {fmtReviewDate(r.visit_date) && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 5 }}>{fmtReviewDate(r.visit_date)}</p>
          )}
        </div>
      ))}

      <Link href={`/flow/dicas?hotel=${encodeURIComponent(hotelName)}`} className="no-underline" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 12, marginTop: 4,
        background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={15} style={{ color: 'var(--tdgflow-navy)' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--tdgflow-navy)', fontWeight: 400 }}>
            Registrar nova visita
          </span>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--tdgflow-navy)' }} />
      </Link>
    </div>
  )
}

/* ── Condições negociadas — comissão diferenciada, amenidade exclusiva,
   condição de pagamento. Editável só por admin (informação comercial
   sensível), mas visível e com histórico auditável pra qualquer um da
   rede — combinado com a Carla ao propor o Contact Hub. ────────────── */
interface AuditEntry {
  id: string
  summary: string
  changed_by_name: string | null
  changed_by: string
  created_at: string
}

function formatAuditDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function AddBenefitForm({ hotelId, onSaved, onClose }: { hotelId: string; onSaved: (b: HotelBenefit) => void; onClose: () => void }) {
  const [category, setCategory] = useState<HotelBenefit['category']>('comissao')
  const [description, setDescription] = useState('')
  const [commissionPct, setCommissionPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!description.trim()) { setError('Descreva a condição.'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/hotel-benefits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId, category, description: description.trim(),
        commissionPct: category === 'comissao' && commissionPct ? Number(commissionPct) : null,
      }),
    })
    const data = await res.json()
    if (data.benefit) {
      onSaved(data.benefit)
    } else {
      setError(data.error ?? 'Erro ao salvar.')
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <select className="input" value={category} onChange={e => setCategory(e.target.value as HotelBenefit['category'])} style={{ fontSize: '0.75rem' }}>
        {Object.entries(BENEFIT_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {category === 'comissao' && (
        <input className="input" type="number" step="0.1" placeholder="% de comissão (opcional)" value={commissionPct} onChange={e => setCommissionPct(e.target.value)} style={{ fontSize: '0.75rem' }} />
      )}
      <textarea className="input" placeholder="Descrição (ex: reservas diretas, mínimo 3 noites)" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ fontSize: '0.75rem', resize: 'vertical' }} />
      {error && <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-error)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} disabled={saving} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Salvar
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Cancelar</button>
      </div>
    </div>
  )
}

function BenefitsSection({ hotelId, initialBenefits }: { hotelId: string; initialBenefits: HotelBenefit[] }) {
  const [benefits, setBenefits] = useState(initialBenefits)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetch('/api/context').then(r => r.json()).then(d => setIsAdmin(!!d.is_admin)).catch(() => {})
  }, [])

  async function loadHistory() {
    if (showHistory) { setShowHistory(false); return }
    setShowHistory(true)
    setLoadingHistory(true)
    const res = await fetch(`/api/audit-log?entityType=hotel_benefit&entityId=${hotelId}`)
    const data = await res.json()
    setHistory(data.entries ?? [])
    setLoadingHistory(false)
  }

  async function removeBenefit(id: string) {
    setBenefits(prev => prev.filter(b => b.id !== id))
    await fetch(`/api/hotel-benefits?id=${id}`, { method: 'DELETE' })
  }

  if (benefits.length === 0 && !isAdmin) return null

  return (
    <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: benefits.length > 0 ? 8 : 0 }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tdgflow-navy)' }}>
          Condições negociadas pela rede TDG
        </p>
        {benefits.length > 0 && (
          <button onClick={loadHistory} title="Histórico" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-navy)', display: 'flex' }}>
            <History size={13} />
          </button>
        )}
      </div>

      {benefits.map(b => (
        <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-navy)' }}>
              {BENEFIT_CATEGORY_LABELS[b.category]}{b.commission_pct != null ? ` — ${b.commission_pct}%` : ''}
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>{b.description}</p>
          </div>
          {isAdmin && (
            <button onClick={() => removeBenefit(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-faint)', flexShrink: 0 }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}

      {showHistory && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--tdgflow-navy-ring)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loadingHistory && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--tdgflow-navy)' }} />}
          {!loadingHistory && history.length === 0 && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>Sem histórico ainda.</p>
          )}
          {!loadingHistory && history.map(h => (
            <p key={h.id} style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--tdgflow-text-secondary)' }}>{h.changed_by_name ?? h.changed_by}</strong> {h.summary} · {formatAuditDate(h.created_at)}
            </p>
          ))}
        </div>
      )}

      {isAdmin && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} /> Adicionar condição
        </button>
      )}
      {isAdmin && showAddForm && (
        <AddBenefitForm
          hotelId={hotelId}
          onSaved={b => { setBenefits(prev => [b, ...prev]); setShowAddForm(false) }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

/* ── Hotel detail sheet ─────────────────────────────────────────── */
function HotelDetail({ hotel, onClose }: { hotel: Hotel; onClose: () => void }) {
  const [contacts, setContacts] = useState<HotelContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const res = await fetch(`/api/hotel-contacts?hotelId=${hotel.id}`)
      const data = await res.json()
      setContacts(data.contacts ?? [])
    } catch { /* silent */ }
    setLoadingContacts(false)
  }, [hotel.id])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  async function deleteContact(id: string) {
    setDeletingId(id)
    await fetch(`/api/hotel-contacts?id=${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  function onContactSaved(c: HotelContact) {
    setContacts(prev => [c, ...prev])
    setShowAddForm(false)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="fixed bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:bottom-0 z-50 flex flex-col"
        style={{
          background: 'var(--tdgflow-surface)',
          border: '1px solid var(--tdgflow-border)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh',
          overflow: 'hidden',
          width: '100%',
          maxWidth: 480,
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex md:hidden justify-center pt-3 pb-0 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--tdgflow-border)' }} />
        </div>

        {/* Hero photo */}
        <div className="relative flex-shrink-0" style={{ height: 180, overflow: 'hidden' }}>
          <img
            src={hotel.image_url}
            alt={hotel.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,7,3,0.72) 0%, rgba(10,7,3,0.15) 60%, transparent 100%)',
          }} />
          <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
            <CopyLinkButton path={`/flow/rede?tab=fornecedores&hotelId=${hotel.id}`} label={`Fornecedor: ${hotel.name}`} size={14} dark />
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} style={{ color: 'var(--tdgflow-surface)' }} />
            </button>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 16px' }}>
            {hotel.group && (
              <p style={{ fontSize: '0.575rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>
                {hotel.group}
              </p>
            )}
            <h2 style={{ fontSize: 'clamp(1.2rem,5vw,1.6rem)', fontWeight: 500, color: 'var(--tdgflow-surface)', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 6 }}>
              {hotel.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg style={{ width: 12, height: 12, stroke: 'rgba(255,255,255,0.7)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <use href="#i-pin" />
              </svg>
              <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>{hotel.location}</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>

          <BenefitsSection hotelId={hotel.id} initialBenefits={hotel.benefits} />

          {/* Descoberto pela rede, ainda sem teste real — a review não é
              pública (status a_testar), mas o interesse já existe e merece
              aparecer aqui, não só escondido em "Na prática". */}
          {hotel.testedCount === 0 && hotel.pendingLeadCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--tdgflow-accent-warm-subtle)',
              border: '1px solid var(--tdgflow-accent-warm)',
            }}>
              <svg style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0, fill: 'var(--tdgflow-accent-warm)' }}>
                <use href="#i-spark" />
              </svg>
              <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                <strong style={{ color: 'var(--tdgflow-accent-warm)' }}>Descoberto pela rede</strong> — alguém já indicou este fornecedor numa feira ou reunião, mas ninguém foi lá pessoalmente ainda. Veja em &quot;Na prática&quot;.
              </p>
            </div>
          )}

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {hotel.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.06em',
                padding: '4px 10px', borderRadius: 999,
                background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
                color: 'var(--tdgflow-text-secondary)',
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.7, fontWeight: 400, marginBottom: 20 }}>
            {hotel.description}
          </p>

          {/* Contact info */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.5875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 10 }}>
              Contato do hotel
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <a href={`mailto:${hotel.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={13} style={{ color: 'var(--tdgflow-navy)' }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>{hotel.contact_email}</span>
              </a>
              <a href={`tel:${hotel.contact_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={13} style={{ color: 'var(--tdgflow-navy)' }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>{hotel.contact_phone}</span>
              </a>
              {hotel.website_url && (
                <a href={hotel.website_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Globe size={13} style={{ color: 'var(--tdgflow-navy)' }} />
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>{hotel.website_url.replace('https://', '')}</span>
                  <ExternalLink size={10} style={{ color: 'var(--tdgflow-text-muted)' }} />
                </a>
              )}
            </div>
          </div>

          {/* ── Contacts from advisors ──────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: '0.5875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>
                Contatos dos advisors
              </p>
              <button
                onClick={() => setShowAddForm(s => !s)}
                className="btn-ghost"
                style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 4 }}
              >
                <Plus size={12} /> {showAddForm ? 'Cancelar' : 'Adicionar'}
              </button>
            </div>

            {loadingContacts && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto' }} />
              </div>
            )}

            {!loadingContacts && contacts.length === 0 && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  width: '100%', textAlign: 'center', padding: '16px',
                  border: '1px dashed var(--tdgflow-border)', borderRadius: 12,
                  background: 'transparent', cursor: 'pointer', color: 'var(--tdgflow-text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <UserCircle2 size={20} style={{ margin: '0 auto 6px', color: 'var(--tdgflow-border-light)' }} />
                <p>Nenhum contato ainda.</p>
                <p style={{ fontSize: '0.75rem', marginTop: 2 }}>Adicione o contato da feira ou da visita.</p>
              </button>
            )}

            <AnimatePresence>
              {contacts.map(c => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 12,
                    border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface-high)',
                    marginBottom: 8,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6875rem', fontWeight: 700, color: 'var(--tdgflow-navy-dim)',
                    letterSpacing: '0.02em',
                  }}>
                    {contactInitials(c)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.2 }}>
                      {c.name} {c.surname}
                    </p>
                    {c.title && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>{c.title}</p>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
                      {c.email && (
                        <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <Mail size={11} style={{ color: 'var(--tdgflow-navy)' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)' }}>{c.email}</span>
                        </a>
                      )}
                      {c.whatsapp && (
                        <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <MessageCircle size={11} style={{ color: '#25D366' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)' }}>{c.whatsapp}</span>
                        </a>
                      )}
                    </div>
                    {c.notes && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginTop: 5, fontStyle: 'italic' }}>{c.notes}</p>
                    )}
                    <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', marginTop: 5, letterSpacing: '0.02em' }}>
                      Adicionado por {c.added_by}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteContact(c.id)}
                    disabled={deletingId === c.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  >
                    {deletingId === c.id
                      ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
                      : <Trash2 size={13} style={{ color: 'var(--tdgflow-border-light)' }} />
                    }
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {showAddForm && (
              <AddContactForm hotelId={hotel.id} onSaved={onContactSaved} />
            )}
          </div>

          {/* ── Vídeos da rede ──────────────────────────────────────── */}
          <HotelVideos hotelId={hotel.id} />

          {/* Gallery links */}
          {hotel.gallery.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.5875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 10 }}>
                Materiais
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hotel.gallery.map(g => (
                  <div key={g.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
                  }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>{g.label}</span>
                    <ExternalLink size={12} style={{ color: 'var(--tdgflow-text-muted)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews reais desta ficha — Fase 2 */}
          <HotelReviews hotelId={hotel.id} hotelName={hotel.name} />
        </div>
      </motion.div>
    </>
  )
}

/* ── Adicionar fornecedor ao acervo privado ──────────────────────────
   Diferente do find-or-create em POST /api/reviews (que sempre nasce
   compartilhado com a rede, é o espírito de "Na prática"), este formulário
   é o ponto de entrada deliberado da agência pro próprio acervo privado —
   sempre nasce só-sua-agência (achado 2026-08-02, migration 021). */
function AddSupplierForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [entityType, setEntityType] = useState('hotel')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          entity_type: entityType,
          location: location.trim() || undefined,
          country: country.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Erro ao salvar fornecedor.'); setSaving(false); return }
      onSaved()
    } catch {
      setError('Serviço indisponível.')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>Adicionar ao meu acervo privado</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>Só a sua agência vai ver este fornecedor.</p>
        </div>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}>
          <X size={14} />
        </button>
      </div>

      <select className="input" value={entityType} onChange={e => setEntityType(e.target.value)} style={{ fontSize: '0.8125rem' }}>
        {Object.entries(ENTITY_TYPE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <input className="input" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: '0.8125rem' }} />
      <input className="input" placeholder="Localização (opcional)" value={location} onChange={e => setLocation(e.target.value)} style={{ fontSize: '0.8125rem' }} />
      <input className="input" placeholder="País (opcional)" value={country} onChange={e => setCountry(e.target.value)} style={{ fontSize: '0.8125rem' }} />
      <textarea className="input" placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }} />

      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--tdgflow-error)' }}>
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <button type="button" onClick={save} disabled={saving} className="btn-gold" style={{ fontSize: '0.8125rem', padding: '8px 12px' }}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        {saving ? 'Salvando...' : 'Salvar fornecedor'}
      </button>
    </div>
  )
}

/* ── Main view ──────────────────────────────────────────────────── */
export default function HoteisView() {
  const searchParams = useSearchParams()
  const deepLinkHotelId = searchParams.get('hotelId')

  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('Todos')
  const [activeProfiles, setActiveProfiles] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Hotel | null>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const loadHotels = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch('/api/hotels')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHotels((data.hotels as HotelApiRow[]).map(mapHotelApiRow))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHotels() }, [loadHotels])

  // Deep link vindo de uma review em "Na prática" ("Ver ficha do hotel") —
  // abre a ficha certa assim que o catálogo carregar, sem precisar buscar.
  useEffect(() => {
    if (!deepLinkHotelId || hotels.length === 0) return
    const match = hotels.find(h => h.id === deepLinkHotelId)
    if (match) setSelected(match)
  }, [deepLinkHotelId, hotels])

  function toggleProfile(key: string) {
    setActiveProfiles(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filtered = useMemo(() => {
    return hotels.filter(h => {
      const q = search.toLowerCase()
      const matchSearch = !search || h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q)
      const matchRegion = region === 'Todos' || h.region === region
      const matchProfile = activeProfiles.size === 0 || [...activeProfiles].some(p => h.profiles.includes(p))
      return matchSearch && matchRegion && matchProfile
    })
  }, [hotels, search, region, activeProfiles])

  const activeCount = (region !== 'Todos' ? 1 : 0) + activeProfiles.size

  function clearAll() {
    setRegion('Todos')
    setActiveProfiles(new Set())
    setSearch('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TdgIconSprite />

      {/* ── Filter header ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '14px 16px 0', borderBottom: '1px solid var(--tdgflow-border)' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--tdgflow-accent-warm)', marginBottom: 3,
            }}>
              <svg style={{ width: 9, height: 9, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <use href="#i-compass" />
              </svg>
              Rede TDG
            </p>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>Fornecedores Parceiros</h2>
            <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>
              Ficha do fornecedor: rede, perfil, contratos permanentes
            </p>
            <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>
              {filtered.length} de {hotels.length} fornecedores
            </p>
            {/* Legenda do selo — achado da Carla: sem isso, ninguém decora o
                que a cor do card significa. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.625rem', color: 'var(--tdgflow-gold-dim)' }}>
                <svg style={{ width: 8, height: 8, stroke: 'var(--tdgflow-gold-dim)', strokeWidth: 1.8, fill: 'none' }}><use href="#i-verified" /></svg>
                Testado pela rede
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.625rem', color: 'var(--tdgflow-accent-warm)' }}>
                <svg style={{ width: 8, height: 8, fill: 'var(--tdgflow-accent-warm)' }}><use href="#i-spark" /></svg>
                Aguardando teste
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="btn-gold"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              <Plus size={13} /> Meu acervo privado
            </button>
            {activeCount > 0 && (
              <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--tdgflow-navy)', padding: '4px 0' }}>
                <X size={11} /> Limpar ({activeCount})
              </button>
            )}
          </div>
        </div>

        {showAddForm && (
          <AddSupplierForm
            onCancel={() => setShowAddForm(false)}
            onSaved={() => { setShowAddForm(false); loadHotels() }}
          />
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 32, fontSize: '0.8125rem', padding: '8px 32px 8px 32px' }}
            placeholder="Buscar fornecedor ou destino…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={11} style={{ color: 'var(--tdgflow-text-muted)' }} />
            </button>
          )}
        </div>

        {/* Destino chips */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)} style={{
              padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
              fontSize: '0.6875rem', fontWeight: region === r ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
              background: region === r ? 'var(--tdgflow-navy-subtle)' : 'transparent',
              border: `1px solid ${region === r ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border)'}`,
              color: region === r ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
            }}>
              {r}
            </button>
          ))}
        </div>

        {/* Perfil chips */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {PROFILES.map(({ key, label }) => {
            const on = activeProfiles.has(key)
            return (
              <button key={key} onClick={() => toggleProfile(key)} style={{
                padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
                fontSize: '0.6875rem', fontWeight: on ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                background: on ? 'var(--tdgflow-navy-subtle)' : 'transparent',
                border: `1px solid ${on ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border)'}`,
                color: on ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ProfileIcon profileKey={key} size={11} /> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden auto', padding: '14px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>Carregando fornecedores…</p>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <AlertCircle size={28} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Não foi possível carregar o catálogo de fornecedores.</p>
            <button onClick={loadHotels} className="btn-ghost" style={{ fontSize: '0.75rem' }}>Tentar novamente</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Building2 size={28} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Nenhum fornecedor encontrado.</p>
            <button onClick={clearAll} className="btn-ghost" style={{ fontSize: '0.75rem' }}>Limpar filtros</button>
          </div>
        ) : (
          <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {filtered.map(h => <HotelCard key={h.id} hotel={h} onClick={() => setSelected(h)} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <HotelDetail hotel={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
