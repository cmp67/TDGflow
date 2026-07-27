'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, MapPin, Phone, Mail, ExternalLink,
  Building2, ChevronRight, Globe, Users, ArrowRight,
  MessageCircle, Plus, Loader2, Trash2, UserCircle2,
  Camera, ScanLine, PenLine, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { useRef } from 'react'
import Link from 'next/link'

/* ── Types ──────────────────────────────────────────────────────── */
interface Hotel {
  id: string
  name: string
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
  dot: string
  tags: string[]
  profiles: string[]   // advisor-facing filter categories
  gallery: { label: string; url: string }[]
}

/* ── Filter definitions ─────────────────────────────────────────── */
const REGIONS = ['Todos', 'Algarve', 'Lisboa', 'Maldivas']

const PROFILES: { key: string; label: string; emoji: string }[] = [
  { key: 'Família',     label: 'Família',     emoji: '👨‍👩‍👧' },
  { key: 'Casais',      label: 'Casais',       emoji: '💑' },
  { key: 'Praia',       label: 'Praia',        emoji: '🏖️' },
  { key: 'Urban',       label: 'Urban',        emoji: '🏙️' },
  { key: 'Resort',      label: 'Resort',       emoji: '🌴' },
  { key: 'Boutique',    label: 'Boutique',     emoji: '🏛️' },
  { key: 'Golf',        label: 'Golf',         emoji: '⛳' },
  { key: 'Villas',      label: 'Villas',       emoji: '🏡' },
  { key: 'Overwater',   label: 'Overwater',    emoji: '🏝️' },
  { key: 'Ultra Luxury',label: 'Ultra Luxury', emoji: '💎' },
  { key: 'Natureza',    label: 'Natureza',     emoji: '🌿' },
  { key: 'Negócios',    label: 'Negócios',     emoji: '💼' },
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

/* ── Hotel data ─────────────────────────────────────────────────── */
const HOTELS: Hotel[] = [
  {
    id: 'dd3cfd92-ab2e-465d-a49b-dc8de1b5a402',
    name: 'Martinhal Sagres',
    location: 'Sagres, Algarve, Portugal',
    country: 'Portugal',
    region: 'Algarve',
    description: 'Resort 5 estrelas para famílias com quartos e villas de luxo no Parque Natural da Costa Vicentina, junto à praia do Martinhal. Baby concierge, atividades familiares e restaurantes premiados.',
    contact_email: 'res@martinhal.com',
    contact_phone: '+351 282 240 200',
    website_url: 'https://www.martinhal.com/sagres',
    currency: 'EUR',
    group: 'Martinhal',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80&auto=format&fit=crop',
    dot: '#7aaa5a',
    tags: ['Beach Resort', 'Família', '5 Estrelas', 'Villas'],
    profiles: ['Família', 'Resort', 'Praia', 'Villas', 'Natureza'],
    gallery: [
      { label: 'Acomodações', url: '#' },
      { label: 'Atividades Família', url: '#' },
      { label: 'Praia do Martinhal', url: '#' },
    ],
  },
  {
    id: 'c626c5ce-f740-445b-ba3e-d746f30a7a5a',
    name: 'Martinhal Lisboa Chiado',
    location: 'Chiado, Lisboa, Portugal',
    country: 'Portugal',
    region: 'Lisboa',
    description: 'Apartamentos de luxo com serviços 5 estrelas num edifício histórico de 1855 no Chiado/Bairro Alto. Kids Club, Baby Concierge, Bar 1855 Gin Garden.',
    contact_email: 'res@martinhal.com',
    contact_phone: '+351 218 507 788',
    website_url: 'https://www.martinhal.com/lisbon',
    currency: 'EUR',
    group: 'Martinhal',
    image_url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80&auto=format&fit=crop',
    dot: '#8080c8',
    tags: ['Urban Luxury', 'Família', 'Apartamentos', 'Histórico'],
    profiles: ['Família', 'Urban', 'Boutique', 'Casais', 'Negócios'],
    gallery: [
      { label: 'Acomodações', url: '#' },
      { label: 'Bar 1855', url: '#' },
      { label: 'Kids Club', url: '#' },
    ],
  },
  {
    id: '91a653bd-88ec-4c50-9968-345662a09388',
    name: 'Martinhal Lisboa Oriente',
    location: 'Parque das Nações, Lisboa, Portugal',
    country: 'Portugal',
    region: 'Lisboa',
    description: 'Apartamentos e residências de luxo junto ao Rio Tejo. Piscina, spa, restaurante terraço e espaço kids.',
    contact_email: 'res@martinhal.com',
    contact_phone: '+351 210 029 600',
    website_url: 'https://www.martinhal.com/lisbon-oriente',
    currency: 'EUR',
    group: 'Martinhal',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80&auto=format&fit=crop',
    dot: '#4a8abe',
    tags: ['Urban Luxury', 'Apartamentos', 'Riverside', 'Moderno'],
    profiles: ['Família', 'Urban', 'Casais', 'Negócios'],
    gallery: [
      { label: 'Acomodações', url: '#' },
      { label: 'Spa & Piscina', url: '#' },
      { label: 'Restaurante Terraço', url: '#' },
    ],
  },
  {
    id: '223dd537-61ee-45a3-8d00-22cf893a7c12',
    name: 'Martinhal Quinta do Lago',
    location: 'Quinta do Lago, Algarve, Portugal',
    country: 'Portugal',
    region: 'Algarve',
    description: 'Resort familiar de luxo com villas privadas e piscinas próprias. Localizado na exclusiva Quinta do Lago, a poucos minutos dos melhores campos de golfe de Portugal.',
    contact_email: 'res@martinhal.com',
    contact_phone: '+351 289 008 300',
    website_url: 'https://www.martinhal.com/quinta',
    currency: 'EUR',
    group: 'Martinhal',
    image_url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=900&q=80&auto=format&fit=crop',
    dot: '#c8a060',
    tags: ['Golf', 'Família', 'Villas', 'Quinta do Lago'],
    profiles: ['Família', 'Golf', 'Resort', 'Villas', 'Casais'],
    gallery: [
      { label: 'Villas', url: '#' },
      { label: 'Atividades Família', url: '#' },
      { label: 'Piscina & Hangout', url: '#' },
    ],
  },
  {
    id: '3791765b-3358-4ed2-beea-a6668dba16fc',
    name: 'Velaa Private Island',
    location: 'Noonu Atoll, Maldivas',
    country: 'Maldivas',
    region: 'Maldivas',
    description: 'Resort ultra-luxo em ilha privativa nas Maldivas com villas exclusivas, gastronomia de autor e serviço excepcional. Uma das experiências mais exclusivas do Índico.',
    contact_email: 'reservations@velaaprivateisland.com',
    contact_phone: '+960 656 1111',
    website_url: 'https://www.velaaprivateisland.com',
    currency: 'USD',
    group: null,
    image_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=900&q=80&auto=format&fit=crop',
    dot: '#4a9bbe',
    tags: ['Private Island', 'Ultra Luxury', 'Overwater', 'Maldivas'],
    profiles: ['Casais', 'Ultra Luxury', 'Overwater', 'Resort', 'Natureza'],
    gallery: [
      { label: 'Acomodações', url: '#' },
      { label: 'Aragu Restaurant', url: '#' },
      { label: 'Wellbeing Village', url: '#' },
    ],
  },
]

/* ── Hotel card ─────────────────────────────────────────────────── */
function HotelCard({ hotel, onClick }: { hotel: Hotel; onClick: () => void }) {
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
        <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: hotel.dot, boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }} />
      </div>

      {/* Card body — tight */}
      <div style={{ padding: '10px 12px 12px', borderTop: `2px solid ${hotel.dot}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <MapPin size={10} style={{ color: hotel.dot, flexShrink: 0 }} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hotel.location}</span>
        </div>
        {/* Profile pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {hotel.profiles.slice(0, 3).map(p => {
            const def = PROFILES.find(x => x.key === p)
            return (
              <span key={p} style={{
                fontSize: '0.5625rem', fontWeight: 500, letterSpacing: '0.04em',
                padding: '2px 7px', borderRadius: 999,
                background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
                color: 'var(--tdgflow-text-muted)',
              }}>
                {def?.emoji} {p}
              </span>
            )
          })}
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
                  A IA extrai nome, cargo, email e WhatsApp automaticamente
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
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} style={{ color: 'var(--tdgflow-surface)' }} />
          </button>
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
              <MapPin size={12} style={{ color: hotel.dot }} />
              <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>{hotel.location}</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>

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

          {/* Link to Dicas */}
          <Link href="/flow/dicas" className="no-underline" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: 12,
            background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} style={{ color: 'var(--tdgflow-navy)' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--tdgflow-navy)', fontWeight: 400 }}>
                Ver dicas da rede sobre este hotel
              </span>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--tdgflow-navy)' }} />
          </Link>
        </div>
      </motion.div>
    </>
  )
}

/* ── Main view ──────────────────────────────────────────────────── */
export default function HoteisView() {
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('Todos')
  const [activeProfiles, setActiveProfiles] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Hotel | null>(null)

  function toggleProfile(key: string) {
    setActiveProfiles(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filtered = useMemo(() => {
    return HOTELS.filter(h => {
      const q = search.toLowerCase()
      const matchSearch = !search || h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q)
      const matchRegion = region === 'Todos' || h.region === region
      const matchProfile = activeProfiles.size === 0 || [...activeProfiles].some(p => h.profiles.includes(p))
      return matchSearch && matchRegion && matchProfile
    })
  }, [search, region, activeProfiles])

  const activeCount = (region !== 'Todos' ? 1 : 0) + activeProfiles.size

  function clearAll() {
    setRegion('Todos')
    setActiveProfiles(new Set())
    setSearch('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Filter header ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '14px 16px 0', borderBottom: '1px solid var(--tdgflow-border)' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>Hotéis Parceiros</h2>
            <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>
              {filtered.length} de {HOTELS.length} propriedades
            </p>
          </div>
          {activeCount > 0 && (
            <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--tdgflow-navy)', padding: '4px 0' }}>
              <X size={11} /> Limpar ({activeCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 32, fontSize: '0.8125rem', padding: '8px 32px 8px 32px' }}
            placeholder="Buscar hotel ou destino…"
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
          {PROFILES.map(({ key, label, emoji }) => {
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
                <span style={{ fontSize: '0.7rem' }}>{emoji}</span> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden auto', padding: '14px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Building2 size={28} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Nenhum hotel encontrado.</p>
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
