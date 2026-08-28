'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Heart, ChevronDown, ChevronUp,
  Building2, X, Mic, Square, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, AlertCircle, Search, SlidersHorizontal, MapPin, Eye, Pencil, FileText, Download,
  MessageCircle,
} from 'lucide-react'
import { sounds } from '@/lib/sounds'
import { useToast } from '@/contexts/ToastContext'
import { getQuestions, isLeadSubmission } from '@/lib/review-questions'
import TdgIconSprite, { ENTITY_SCENE_ID } from '@/components/TdgIconSprite'
import ResponsiveSheet from '@/components/ResponsiveSheet'
import CopyLinkButton from '@/components/CopyLinkButton'
import AudioRecord from '@/components/AudioRecord'
import AudioQueue, { type AudioItem as AudioQueueItem } from '@/components/AudioQueue'
import PendingConfirmationQueue from '@/components/PendingConfirmationQueue'
import Toggle from '@/components/ui/Toggle'

/* Fase 6: "Da mesa" saiu da navegação — seu próprio texto já dizia "não é
   conteúdo pra navegar direto" (só 2 botões abrindo modal, nenhum conteúdo
   pra rolar). Vira ação "Gravar" aqui dentro, coerente com o que ela sempre
   foi de fato. */
function IconQueue({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}

/* ── Types ─────────────────────────────────────────────────────── */
interface AspectEntry { score: number | null; note: string }
type SentimentMapValue = Record<string, AspectEntry>

interface Review {
  id: string
  hotel_name: string
  hotel_id: string | null
  entity_type: string
  country: string | null
  agent_name: string
  agency_name: string
  visit_date: string | null
  visit_type: string | null
  overall_rating: number
  rooms_rating: number | null
  service_rating: number | null
  food_rating: number | null
  location_rating: number | null
  highlights: string[]
  client_profile: string | null
  must_experience: string | null
  heads_up: string | null
  status: string
  photo_url: string | null
  photo_urls: string[] | null
  document_url: string | null
  media_usage_authorized?: boolean
  sentiment_map: SentimentMapValue | null
  created_at: string
  is_favorite: boolean
  is_own?: boolean
  source?: string | null
  view_count?: number
  favorite_count?: number
  visit_count?: number
  avg_rating?: number
}

// Fila de áudio → questionário pré-preenchido (achado da Carla, 15/08:
// transcrever um áudio nunca virava registro de verdade — a pessoa tinha
// que digitar tudo de novo). audio.visit_type usa um enum próprio da
// gravação (SITE_INSPECTION/MEETING/DEBRIEF); DEBRIEF fica sem mapa —
// ambíguo demais (pode ser fam trip ou estadia pessoal) pra arriscar
// adivinhar, melhor deixar a pessoa escolher.
const AUDIO_VISIT_TYPE_MAP: Record<string, string> = {
  SITE_INSPECTION: 'site_inspection',
  MEETING: 'commercial_meeting',
}

function audioAnswersFrom(item: AudioQueueItem): Record<string, unknown> {
  const s = item.summary ?? {}
  const impressions = [s.notes, ...(Array.isArray(s.highlights) ? s.highlights : [])]
    .filter(Boolean)
    .join(' — ')
  return {
    entity_type: 'hotel',
    hotel_name: s.hotel_name ?? undefined,
    country: s.location ?? undefined,
    visit_type: AUDIO_VISIT_TYPE_MAP[item.visit_type] ?? undefined,
    impressions: impressions || undefined,
  }
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  fam_trip: 'FAM Trip',
  site_inspection: 'Site Inspection',
  personal_stay: 'Hospedagem pessoal',
  commercial_meeting: 'Por testar',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  beach_club: 'Beach Club',
  transfer: 'Transfer',
  guide: 'Guia',
  restaurant: 'Restaurante',
  roteiro: 'Roteiro',
  other: 'Outro',
}

// Usado no questionário — cada pergunta select busca aqui a label da própria opção.
const OPTION_LABELS: Record<string, string> = { ...VISIT_TYPE_LABELS, ...ENTITY_TYPE_LABELS }

// Sprite de ícones movido pra src/components/TdgIconSprite.tsx (compartilhado
// com outras telas, ex. OfertasList.tsx) — importado abaixo.

/* ── Sentiment badge — shows +3 / −2 / 0 ────────────────────────── */
// Selo sutil pra dica capturada pelo Max via WhatsApp — pedido da Carla,
// 26/08: "todos os registros feitos pelo max precisam indicar sutilmente
// no card". Só ícone pequeno + tooltip, sem texto/cor de destaque — não
// compete com a atribuição real (quem escreveu continua sendo o dado
// principal do card).
function MaxSourceBadge() {
  return (
    <span title="Registrada via WhatsApp (Max)" style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <MessageCircle size={11} style={{ color: 'var(--tdgflow-text-muted)', opacity: 0.6 }} />
    </span>
  )
}

function SentimentBadge({ value }: { value: number }) {
  // Legacy data: 5=positive(old thumbs), 1=negative(old thumbs), 4-5=seed stars
  const isLegacyPositive = value >= 4 && value <= 5
  const isLegacyNegative = value === 1

  const display = isLegacyPositive ? 'Positivo'
    : isLegacyNegative ? 'Negativo'
    : value > 0 ? `+${value}`
    : value < 0 ? `${value}`
    : '0'

  const isPos = value > 0 || isLegacyPositive
  const isNeg = value < 0 || isLegacyNegative
  if (!isPos && !isNeg && value === 0) return null

  const color = isPos ? 'var(--tdgflow-navy)' : 'var(--tdgflow-error)'
  const bg    = isPos ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-error-subtle)'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, background: bg }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color }}>{display}</span>
    </span>
  )
}

/* ── Sub-sentiment — score –5…+5 com label descritivo + barra ───── */
const SCORE_LABEL: Record<number, { label: string; color: string; bg: string }> = {
  5:  { label: 'Excepcional',        color: '#005F63', bg: '#D0F0F1' },
  4:  { label: 'Excelente',          color: '#007A7F', bg: '#E0F4F5' },
  3:  { label: 'Muito bom',          color: 'var(--tdgflow-success)', bg: 'var(--tdgflow-success-subtle)' },
  2:  { label: 'Bom',                color: '#388E3C', bg: '#F1F8E9' },
  1:  { label: 'Satisfatório',       color: '#558B2F', bg: '#F9FBE7' },
  0:  { label: 'Neutro',             color: 'var(--tdgflow-text-muted)', bg: 'var(--tdgflow-border-subtle)' },
  '-1': { label: 'Regular',          color: '#7B5800', bg: '#FFF8E1' },
  '-2': { label: 'Abaixo do esperado', color: '#BF360C', bg: '#FBE9E7' },
  '-3': { label: 'Fraco',            color: 'var(--tdgflow-error)', bg: 'var(--tdgflow-error-subtle)' },
  '-4': { label: 'Ruim',             color: '#B71C1C', bg: '#FFCDD2' },
  '-5': { label: 'Péssimo',          color: '#7F0000', bg: '#FFCDD2' },
}

function SubSentimentRow({
  label, value, note,
}: { label: string; value: number | null; note?: string }) {
  if (value === null || value === undefined) return null
  const conf = (SCORE_LABEL as Record<string, typeof SCORE_LABEL[5]>)[String(value)] ?? SCORE_LABEL[0]
  // bar: 0–100% where center=0, left=neg, right=pos
  const pct = Math.round(((value + 5) / 10) * 100)
  const barColor = value >= 3 ? 'var(--tdgflow-navy)' : value >= 1 ? 'var(--tdgflow-success)' : value === 0 ? '#B8CDD2' : value >= -2 ? 'var(--tdgflow-accent-warm)' : 'var(--tdgflow-error)'

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: '0.5625rem', fontWeight: 700, color: conf.color,
          background: conf.bg, borderRadius: 10, padding: '2px 7px',
        }}>{conf.label}</span>
      </div>
      {/* Mini bar –5…+5 */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--tdgflow-surface-high)', position: 'relative', overflow: 'visible' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s',
        }} />
        {/* center marker */}
        <div style={{ position: 'absolute', left: '50%', top: -1, width: 1, height: 5, background: 'var(--tdgflow-border)', transform: 'translateX(-50%)' }} />
      </div>
      {note && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-secondary)', margin: '4px 0 0', lineHeight: 1.45, fontStyle: 'italic' }}>
          &ldquo;{note}&rdquo;
        </p>
      )}
    </div>
  )
}

/* ── Accent color ────────────────────────────────────────────────── */
function ratingAccent(r: number) {
  if (r > 0 || r >= 4) return 'var(--tdgflow-navy)'
  if (r < 0 || r === 1) return 'var(--tdgflow-error)'
  return 'var(--tdgflow-text-muted)'
}

/* ── Sentiment chips — Fase 3 ─────────────────────────────────────
   Substitui os 11 dots de -5 a +5. Achado do parecer de design: o produto
   já precisava de SCORE_LABEL pra traduzir número em palavra — prova de
   que o número sozinho não comunica. Um chip com palavra já é a resposta
   decodificada, sem precisar mapear posição+polaridade+cor e checar
   legenda. Escala positiva em intensidade de navy, negativo é a única cor
   de alerta (exceção, não polo simétrico) — nunca vermelho/teal como par. */
const SENTIMENT_CHIPS = [
  { value: 5,  label: 'Excepcional' },
  { value: 3,  label: 'Muito bom' },
  { value: 0,  label: 'Neutro' },
  { value: -3, label: 'Ficou devendo' },
  { value: -5, label: 'Decepcionou' },
] as const

function sentimentChipTone(value: number) {
  if (value >= 5) return { color: 'var(--tdgflow-surface)', bg: 'var(--tdgflow-navy)', border: 'var(--tdgflow-navy)' }
  if (value > 0)  return { color: 'var(--tdgflow-navy)', bg: 'var(--tdgflow-navy-subtle)', border: 'var(--tdgflow-navy-ring)' }
  if (value === 0) return { color: 'var(--tdgflow-text-muted)', bg: 'var(--tdgflow-surface-high)', border: 'var(--tdgflow-border)' }
  if (value <= -5) return { color: 'var(--tdgflow-surface)', bg: 'var(--tdgflow-error)', border: 'var(--tdgflow-error)' }
  return { color: 'var(--tdgflow-error)', bg: 'var(--tdgflow-error-subtle)', border: 'var(--tdgflow-error)' }
}

function SentimentChips({
  value, onChange, size = 'large',
}: {
  value: number | null
  onChange: (v: number) => void
  size?: 'large' | 'small'
}) {
  function select(v: number) {
    if (v === value) return
    sounds.tick(v)
    try { navigator.vibrate?.(40) } catch { /* not supported */ }
    onChange(v)
  }

  const padding = size === 'large' ? '10px 16px' : '6px 11px'
  const fontSize = size === 'large' ? '0.8125rem' : '0.6875rem'

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: size === 'large' ? 8 : 6, padding: `${size === 'large' ? 4 : 0}px 0` }}>
      {SENTIMENT_CHIPS.map(({ value: v, label }) => {
        const selected = value === v
        const tone = sentimentChipTone(v)
        return (
          <motion.button
            key={v}
            onClick={() => select(v)}
            whileTap={{ scale: 0.96 }}
            style={{
              padding, borderRadius: 999, fontSize, fontWeight: selected ? 700 : 500,
              border: `1.5px solid ${selected ? tone.border : 'var(--tdgflow-border)'}`,
              background: selected ? tone.bg : 'var(--tdgflow-surface-high)',
              color: selected ? tone.color : 'var(--tdgflow-text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {label}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ── Sentiment map step ─────────────────────────────────────────── */
const PRESET_ASPECTS = [
  'Check-in', 'Quarto', 'Cama', 'Restaurante', 'Spa',
  'Piscina', 'Bar', 'Café da manhã', 'Staff', 'Vista',
  'Localização', 'Academia', 'Transfer', 'Praia',
]

function SentimentMapStep({ value, onChange }: {
  value: SentimentMapValue
  onChange: (v: SentimentMapValue) => void
}) {
  const [custom, setCustom] = useState('')
  const [recording, setRecording] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const selectedAspects = Object.keys(value)

  function toggleAspect(name: string) {
    if (value[name] !== undefined) {
      const next = { ...value }
      delete next[name]
      onChange(next)
    } else {
      onChange({ ...value, [name]: { score: null, note: '' } })
    }
  }

  function updateEntry(name: string, patch: Partial<AspectEntry>) {
    onChange({ ...value, [name]: { ...value[name], ...patch } })
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (!trimmed || value[trimmed] !== undefined) return
    onChange({ ...value, [trimmed]: { score: null, note: '' } })
    setCustom('')
  }

  async function startVoice(aspect: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size < 500) { setRecording(null); return }
        setTranscribing(aspect)
        setRecording(null)
        const fd = new FormData()
        fd.append('audio', new File([blob], 'note.webm', { type: 'audio/webm' }))
        try {
          const r = await fetch('/api/transcribe-note', { method: 'POST', body: fd })
          const d = await r.json()
          if (d.text) updateEntry(aspect, { note: d.text })
        } finally { setTranscribing(null) }
      }
      mr.start()
      mediaRef.current = mr
      setRecording(aspect)
      sounds.recordStart()
    } catch { sounds.error() }
  }

  function stopVoice() {
    mediaRef.current?.stop()
    sounds.recordStop()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Preset chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {PRESET_ASPECTS.map(name => {
          const active = value[name] !== undefined
          return (
            <button
              key={name}
              onClick={() => toggleAspect(name)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: '0.75rem',
                background: active ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface-high)',
                border: `1px solid ${active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border)'}`,
                color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {name}
            </button>
          )
        })}
      </div>

      {/* Custom aspect input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="Outro aspecto..."
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          style={{ flex: 1, fontSize: '0.8125rem' }}
        />
        <button
          onClick={addCustom}
          disabled={!custom.trim()}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: custom.trim() ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border)',
            color: 'var(--tdgflow-surface)', cursor: custom.trim() ? 'pointer' : 'default',
            fontSize: '0.875rem', fontWeight: 700,
          }}
        >+</button>
      </div>

      {/* Selected entries */}
      {selectedAspects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selectedAspects.map(name => {
            const entry = value[name]
            const isRec = recording === name
            const isTransc = transcribing === name
            return (
              <div key={name} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{name}</span>
                  <button onClick={() => toggleAspect(name)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <X size={12} style={{ color: 'var(--tdgflow-text-faint)' }} />
                  </button>
                </div>
                <SentimentChips
                  value={entry.score}
                  onChange={v => updateEntry(name, { score: v })}
                  size="small"
                />
                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Nota opcional..."
                    value={entry.note}
                    onChange={e => updateEntry(name, { note: e.target.value })}
                    style={{ flex: 1, resize: 'none', fontSize: '0.75rem', lineHeight: 1.5 }}
                  />
                  <button
                    onClick={isRec ? stopVoice : () => startVoice(name)}
                    style={{
                      padding: '6px 10px', borderRadius: 8, flexShrink: 0,
                      background: isRec ? 'var(--tdgflow-error)' : 'var(--tdgflow-surface)',
                      border: `1px solid ${isRec ? 'transparent' : 'var(--tdgflow-border)'}`,
                      color: isRec ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {isTransc
                      ? <Loader2 size={11} className="animate-spin" />
                      : isRec
                        ? <Square size={10} className="fill-current" />
                        : <Mic size={11} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedAspects.length === 0 && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', textAlign: 'center', padding: '4px 0' }}>
          Toque nos aspectos acima para mapear sentimentos
        </p>
      )}

      <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', textAlign: 'center' }}>
        Opcional — pule se preferir
      </p>
    </div>
  )
}

/* ── Hotel card ─────────────────────────────────────────────────── */
function HotelCard({ review, onToggleFavorite, onViewHistory, onConfirmLead, onUpdated, highlightId }: {
  review: Review
  onToggleFavorite: (id: string, current: boolean) => void
  onViewHistory: (hotelName: string) => void
  onConfirmLead: (review: Review) => void
  onUpdated: () => void
  highlightId?: string | null
}) {
  const isHighlighted = !!highlightId && review.id === highlightId
  const [expanded, setExpanded] = useState(isHighlighted)
  const [showEdit, setShowEdit] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const galleryPhotos = review.photo_urls?.length ? review.photo_urls : (review.photo_url ? [review.photo_url] : [])

  useEffect(() => {
    if (isHighlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      fetch('/api/reviews', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id, action: 'view' }),
      }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const isLead = review.status === 'a_testar'
  const visitCount = Number(review.visit_count ?? 1)
  const avgRating = Number(review.avg_rating ?? review.overall_rating)
  const accent = isLead ? 'var(--tdgflow-accent-warm)' : ratingAccent(Math.round(avgRating))
  const sceneId = ENTITY_SCENE_ID[review.entity_type] ?? 'scene-hotel'

  function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  }

  function toggleExpanded() {
    setExpanded(e => {
      if (!e) fetch('/api/reviews', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id, action: 'view' }),
      }).catch(() => {})
      return !e
    })
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--tdgflow-surface)',
        borderRadius: 16,
        border: isHighlighted ? '1.5px solid var(--tdgflow-navy)' : isLead ? '1.5px dashed var(--tdgflow-border-light)' : '1px solid var(--tdgflow-border)',
        boxShadow: isHighlighted ? '0 0 0 3px var(--tdgflow-navy-subtle)' : 'none',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Card art — foto real de quem confirmou (published), ou traço próprio
          quando ainda não há foto anexada, ou lead (ninguém foi lá ainda —
          por isso é traço, nunca finge ser foto). A cor da tinta conta a
          história: dourado = confirmado pela rede, coral = ainda a testar.
          Clique na foto: card fechado → expande o review (mesmo efeito de
          "Ver detalhes"), nunca pula direto pra lightbox — achado da Carla,
          19/08: abrir a foto de cara escondia o review em si. Card já
          aberto → aí sim clicar na foto abre o carrossel. */}
      <div
        onClick={review.photo_url && !isLead ? (expanded ? () => setGalleryIndex(0) : toggleExpanded) : undefined}
        style={{
          height: 128, position: 'relative', display: 'flex', alignItems: isLead || !review.photo_url ? 'center' : 'flex-end',
          justifyContent: isLead || !review.photo_url ? 'center' : 'flex-start',
          padding: isLead || !review.photo_url ? 0 : '10px 12px',
          cursor: review.photo_url && !isLead ? 'pointer' : 'default',
          background: review.photo_url && !isLead
            ? `linear-gradient(0deg, rgba(20,12,6,0.6) 0%, rgba(20,12,6,0.02) 55%, transparent 75%), url(${review.photo_url}) center/cover`
            : 'var(--tdgflow-surface-high)',
        }}>
        {isLead && (
          <>
            <span style={{
              position: 'absolute', top: 10, left: 12,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: accent,
            }}>
              <svg style={{ width: 11, height: 11, fill: 'currentColor' }}><use href="#i-spark" /></svg>
              Recém-descoberto
            </span>
            <svg style={{ width: 62, height: 62, stroke: accent, strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <use href={`#${sceneId}`} />
            </svg>
          </>
        )}
        {!isLead && !review.photo_url && (
          <svg style={{ width: 62, height: 62, stroke: 'var(--tdgflow-gold-dim, #8C6436)', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <use href={`#${sceneId}`} />
          </svg>
        )}
        {!isLead && review.photo_url && (
          <span style={{
            position: 'relative', zIndex: 1,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '3px 9px 3px 7px', borderRadius: 999,
            background: 'rgba(255,255,255,0.18)', color: '#fff', backdropFilter: 'blur(6px)',
          }}>
            <svg style={{ width: 10, height: 10, fill: 'currentColor' }}><use href="#i-verified" /></svg>
            {review.visit_type ? (VISIT_TYPE_LABELS[review.visit_type] ?? review.visit_type) : 'Confirmado'}
          </span>
        )}
      </div>

      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 128, bottom: 0, width: 3, background: accent }} />

      {/* Main content */}
      <div style={{ padding: '18px 18px 14px 22px' }}>

        {/* Top row: name + rating + heart */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {/* Monogram */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${accent}12`,
            border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 600, color: accent,
            letterSpacing: '-0.01em',
          }}>
            {review.hotel_name.slice(0, 2).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: '0.9375rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)',
              letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 2,
            }}>
              {review.hotel_name}
            </h3>
            {review.country && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginBottom: 2, letterSpacing: '0.01em' }}>
                {review.country}
              </p>
            )}
            {/* Atribuição ao advisor — autoridade vem da pessoa nomeada, não de
                engajamento/curtidas (lição Pinterest/AFAR/Fora Travel, skill
                bemgsy-design § Benchmarks Externos). Dado já existia
                (agent_name) mas não aparecia em lugar nenhum do card. */}
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-secondary)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              por {review.agent_name}
              {review.source === 'max_whatsapp' && <MaxSourceBadge />}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {!isLead && <SentimentBadge value={Math.round(avgRating)} />}
              {!isLead && <span style={{ color: 'var(--tdgflow-border-light)' }}>·</span>}
              {!isLead && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>
                  {visitCount} {visitCount === 1 ? 'visita' : 'visitas'}
                </span>
              )}
              {review.visit_type && (
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '2px 7px', borderRadius: 999,
                  background: `${accent}10`, color: accent,
                }}>
                  {VISIT_TYPE_LABELS[review.visit_type] ?? review.visit_type}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onToggleFavorite(review.id, review.is_favorite)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <Heart size={16} style={{
              color: review.is_favorite ? '#f87171' : 'var(--tdgflow-border-light)',
              fill: review.is_favorite ? '#f87171' : 'transparent',
              transition: 'all 0.15s',
            }} />
            {(review.favorite_count ?? 0) > 0 && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#f87171' }}>{review.favorite_count}</span>
            )}
          </button>
        </div>

        {/* Lead — o "porquê" é o conteúdo principal, sempre visível (não
            escondido atrás de "Ver detalhes"), com CTA pra confirmar de
            perto. Sem isso, um lead vira um card fantasma sem nada legível. */}
        {isLead && (
          <>
            {review.heads_up && (
              <p style={{
                fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.55,
                fontStyle: 'italic', marginBottom: 12,
              }}>
                &ldquo;{review.heads_up}&rdquo;
              </p>
            )}

            {/* Roteiro — visualização direto no card, sem forçar download
                (pedido da Dani no treinamento, 13/08). PDF/imagem renderiza
                inline no viewer nativo do navegador; Word não tem preview
                nativo, então vira link de abrir. */}
            {review.document_url && (
              <div style={{ marginBottom: 12 }}>
                {/\.(pdf|jpe?g|png|webp)$/i.test(review.document_url) ? (
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--tdgflow-border)' }}>
                    <iframe src={review.document_url} title={`Roteiro — ${review.hotel_name}`} style={{ width: '100%', height: 320, border: 'none', display: 'block' }} />
                  </div>
                ) : (
                  <a
                    href={review.document_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface-high)', textDecoration: 'none' }}
                  >
                    <FileText size={16} style={{ color: accent }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>Abrir roteiro</span>
                  </a>
                )}
                <a
                  href={review.document_url} download target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', textDecoration: 'none' }}
                >
                  <Download size={11} /> Baixar arquivo
                </a>
              </div>
            )}

            <button
              onClick={() => onConfirmLead(review)}
              style={{
                fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                background: accent, border: `1px solid ${accent}`,
                padding: '7px 13px', borderRadius: 999, cursor: 'pointer', marginBottom: 12,
              }}
            >
              Registrar teste real →
            </button>
          </>
        )}

        {/* Highlights */}
        {!isLead && review.highlights?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
            {(expanded ? review.highlights : review.highlights.slice(0, 3)).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: accent, marginTop: 7, flexShrink: 0, opacity: 0.7 }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Must experience — always visible if exists */}
        {review.must_experience && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10,
            padding: '8px 12px', borderRadius: 8,
            background: `${accent}08`,
            borderLeft: `2px solid ${accent}50`,
          }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: accent, flexShrink: 0, marginTop: 1 }}>★</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>{review.must_experience}</span>
          </div>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--tdgflow-border)', marginBottom: 12 }}>
                {(review.rooms_rating || review.service_rating || review.food_rating || review.location_rating) && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', margin: '0 0 8px' }}>
                      Avaliação por aspecto
                    </p>
                    <SubSentimentRow label="Acomodações" value={review.rooms_rating} />
                    <SubSentimentRow label="Serviço"     value={review.service_rating} />
                    <SubSentimentRow label="Gastronomia" value={review.food_rating} />
                    <SubSentimentRow label="Localização" value={review.location_rating} />
                  </div>
                )}

                {/* Sentiment map — nota inline por aspecto */}
                {review.sentiment_map && Object.keys(review.sentiment_map).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <MapPin size={10} style={{ color: 'var(--tdgflow-text-muted)' }} />
                      <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', margin: 0 }}>
                        Mapa de sentimentos
                      </p>
                    </div>
                    {Object.entries(review.sentiment_map)
                      .filter(([, e]) => e.score !== null)
                      .map(([aspect, entry]) => (
                        <SubSentimentRow
                          key={aspect}
                          label={aspect}
                          value={entry.score}
                          note={entry.note ?? undefined}
                        />
                      ))
                    }
                  </div>
                )}
                {review.photo_urls && review.photo_urls.length > 1 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', margin: '0 0 8px' }}>
                      Fotos da visita
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {review.photo_urls.map((url, i) => (
                        <button
                          key={url}
                          onClick={() => setGalleryIndex(i)}
                          style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', display: 'block', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {review.media_usage_authorized === false && galleryPhotos.length > 0 && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', margin: '0 0 14px', fontStyle: 'italic' }}>
                    Uso restrito — fotos só pra referência interna, não autorizadas pra propostas de outras agências.
                  </p>
                )}
                {review.client_profile && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 5 }}>
                      Perfil ideal
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.6, fontWeight: 300 }}>{review.client_profile}</p>
                  </div>
                )}
                {/* heads_up de lead já aparece sempre visível acima como o
                    "porquê" — não repete aqui pra não duplicar o mesmo texto. */}
                {!isLead && review.heads_up && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <AlertCircle size={12} style={{ color: 'var(--tdgflow-warning)', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.6, fontWeight: 300 }}>{review.heads_up}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviewer signature */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5625rem', fontWeight: 700, color: 'var(--tdgflow-text-muted)', flexShrink: 0,
          }}>
            {review.agent_name[0]}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>
            {review.agent_name}
          </span>
          {review.visit_date && (
            <>
              <span style={{ color: 'var(--tdgflow-border)', fontSize: '0.6875rem' }}>·</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>{formatDate(review.visit_date)}</span>
            </>
          )}
        </div>
      </div>

      {/* Footer — lead não tem o que expandir nem histórico (é um registro
          único, ainda sem confirmação), então não mostra a barra. */}
      {!isLead && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px 8px 22px',
          borderTop: '1px solid var(--tdgflow-border)',
          background: 'var(--tdgflow-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggleExpanded}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', padding: 0, transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--tdgflow-text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--tdgflow-text-muted)')}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Fechar' : 'Ver detalhes'}
            </button>
            {(review.view_count ?? 0) > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.625rem', color: 'var(--tdgflow-text-faint)' }}>
                <Eye size={11} /> {review.view_count}
              </span>
            )}
            <CopyLinkButton path={`/flow/dicas?reviewId=${review.id}`} label={`Review: ${review.hotel_name}`} size={12} />
            {/* Só o autor edita — sem exceção pra admin (pedido explícito
                da Carla, 10/08). Também é daqui que dá pra acrescentar
                mais fotos depois da visita. */}
            {review.is_own && (
              <button
                onClick={() => setShowEdit(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', padding: 0, transition: 'color 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--tdgflow-text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--tdgflow-text-muted)')}
              >
                <Pencil size={11} /> Editar
              </button>
            )}
          </div>
          {visitCount > 1 && review.entity_type === 'hotel' && review.hotel_id ? (
            // Hotel tem ficha própria — a lista de visitas mora lá (Fase 2),
            // não num drawer separado que só sabia casar por nome.
            <Link
              href={`/flow/rede?tab=fornecedores&hotelId=${review.hotel_id}`}
              className="no-underline"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6875rem', color: accent }}
            >
              Ver ficha do hotel <ArrowRight size={10} />
            </Link>
          ) : visitCount > 1 && (
            <button
              onClick={() => onViewHistory(review.hotel_name)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: accent, padding: 0 }}
            >
              {visitCount} visitas <ArrowRight size={10} />
            </button>
          )}
        </div>
      )}
      {showEdit && (
        <EditReviewModal
          review={review}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onUpdated() }}
        />
      )}
      {galleryIndex !== null && (
        <MediaLightbox
          photos={galleryPhotos}
          index={galleryIndex}
          onIndexChange={setGalleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </motion.div>
  )
}

/* ── Carrossel de fotos — clique na capa ou numa miniatura abre em tela
   cheia, setas/arrastar pra navegar. Vídeo entra aqui depois, no mesmo
   componente (achado da Carla, 10/08: pediu carrossel pros dois juntos). */
function MediaLightbox({ photos, index, onIndexChange, onClose }: {
  photos: string[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % photos.length)
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndexChange, onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <X size={18} style={{ color: '#fff' }} />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onIndexChange((index - 1 + photos.length) % photos.length) }}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowLeft size={18} style={{ color: '#fff' }} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onIndexChange((index + 1) % photos.length) }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowRight size={18} style={{ color: '#fff' }} />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
      />

      {photos.length > 1 && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {photos.map((_, i) => (
            <span
              key={i}
              onClick={e => { e.stopPropagation(); onIndexChange(i) }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: i === index ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Editar review — exclusivo do autor (review.is_own), gate real fica no
   servidor (PATCH /api/reviews). Reaproveita PhotoUploadStep pra acrescentar
   fotos além das já existentes, sem precisar recriar a review. ──────── */
function EditReviewModal({ review, onClose, onSaved }: {
  review: Review
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  // Nome do hotel editável — achado da Carla, 28/08: Ana Roberta (Haus 22)
  // não conseguia trocar a review presa no fornecedor genérico "Fasano"
  // pela unidade certa ("Fasano Rio de Janeiro"), porque esse campo nunca
  // existiu no formulário de edição. Autocomplete contra o catálogo real
  // evita criar fornecedor duplicado por erro de digitação — quem digitar
  // um nome que não bate com nada existente ainda pode salvar (vira
  // fornecedor novo, mesmo find-or-create do resto do app).
  const [hotelName, setHotelName] = useState(review.hotel_name)
  const [hotelSuggestions, setHotelSuggestions] = useState<{ id: string; name: string }[]>([])
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false)
  const [allHotelNames, setAllHotelNames] = useState<{ id: string; name: string }[]>([])
  const [overallRating, setOverallRating] = useState(review.overall_rating)
  const [clientProfile, setClientProfile] = useState(review.client_profile ?? '')
  const [mustExperience, setMustExperience] = useState(review.must_experience ?? '')
  const [headsUp, setHeadsUp] = useState(review.heads_up ?? '')
  const [newPhotos, setNewPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mediaAuthorized, setMediaAuthorized] = useState(review.media_usage_authorized ?? true)
  // Reviews antigas (import histórico) costumam vir sem visit_type — dá pra
  // classificar aqui na edição. Só mostra o seletor quando ainda não tem
  // valor, pra nunca sobrescrever silenciosamente uma classificação real.
  const [visitType, setVisitType] = useState<string | null>(null)
  const existingPhotos = review.photo_urls?.length ? review.photo_urls : (review.photo_url ? [review.photo_url] : [])

  useEffect(() => {
    fetch('/api/hotels')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.hotels) setAllHotelNames(data.hotels.map((h: { id: string; name: string }) => ({ id: h.id, name: h.name }))) })
      .catch(() => {})
  }, [])

  function onHotelNameChange(value: string) {
    setHotelName(value)
    const q = value.trim().toLowerCase()
    if (!q) { setHotelSuggestions([]); return }
    setHotelSuggestions(
      allHotelNames.filter(h => h.name.toLowerCase().includes(q) && h.name !== value).slice(0, 6)
    )
  }

  async function handlePhotosSelect(files: File[]) {
    if (!files.length) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      files.slice(0, 6 - existingPhotos.length - newPhotos.length).forEach(f => fd.append('photo', f))
      const res = await fetch('/api/reviews/photo', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNewPhotos(prev => [...prev, ...(data.photo_urls as string[])])
    } catch {
      toast('Não foi possível enviar a(s) foto(s)', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: review.id,
          action: 'edit',
          fields: {
            overall_rating: overallRating,
            client_profile: clientProfile || null,
            must_experience: mustExperience || null,
            heads_up: headsUp || null,
            visit_type: visitType,
            media_usage_authorized: mediaAuthorized,
            ...(hotelName.trim() && hotelName.trim() !== review.hotel_name ? { hotel_name: hotelName.trim() } : {}),
          },
          new_photo_urls: newPhotos,
        }),
      })
      if (!res.ok) throw new Error()
      sounds.saved()
      toast('Review atualizada', 'success')
      onSaved()
    } catch {
      toast('Não foi possível salvar as alterações', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--tdgflow-surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: 0 }}>Editar review</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Hotel</p>
            <input
              className="input"
              value={hotelName}
              onChange={e => onHotelNameChange(e.target.value)}
              onFocus={() => setShowHotelSuggestions(true)}
              onBlur={() => setTimeout(() => setShowHotelSuggestions(false), 150)}
            />
            {showHotelSuggestions && hotelSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 5,
                background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              }}>
                {hotelSuggestions.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onMouseDown={() => { setHotelName(h.name); setHotelSuggestions([]) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: '0.8125rem',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-secondary)',
                    }}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            )}
            {hotelName.trim() && hotelName.trim() !== review.hotel_name && !allHotelNames.some(h => h.name === hotelName.trim()) && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>
                Fornecedor novo — vai ser criado no catálogo ao salvar.
              </p>
            )}
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Avaliação geral</p>
            <SentimentChips value={overallRating} onChange={v => v !== null && setOverallRating(v)} />
          </div>

          {!review.visit_type && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>
                Tipo de visita <span style={{ fontWeight: 400 }}>(não classificado — dado importado)</span>
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {VISIT_TYPE_FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisitType(opt.id)}
                    className={visitType === opt.id ? 'btn-gold' : 'btn-ghost'}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Perfil de cliente ideal</p>
            <textarea className="input" rows={2} value={clientProfile} onChange={e => setClientProfile(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Experiência obrigatória</p>
            <textarea className="input" rows={2} value={mustExperience} onChange={e => setMustExperience(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Ressalva ou ponto de atenção</p>
            <textarea className="input" rows={2} value={headsUp} onChange={e => setHeadsUp(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Fotos</p>
            {existingPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                {existingPhotos.map(url => (
                  <div key={url} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', border: '1px solid var(--tdgflow-border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}
            <PhotoUploadStep
              photos={newPhotos}
              uploading={uploadingPhoto}
              maxPhotos={Math.max(0, 6 - existingPhotos.length)}
              onSelect={handlePhotosSelect}
              onRemove={url => setNewPhotos(prev => prev.filter(u => u !== url))}
            />
            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--tdgflow-surface-high)', marginTop: 10 }}>
                <Toggle
                  checked={mediaAuthorized}
                  onChange={setMediaAuthorized}
                  label="Autorizar uso das fotos por outras agências"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>
                  Autorizo o uso destas fotos por outras agências em propostas e materiais
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '11px 14px' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ flex: 2, padding: '11px 14px' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Salvar alterações
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Photo upload step — grid de miniaturas + dropzone com arrastar-e-
   soltar, várias fotos por visita (achado da Carla, 07/08). ─────────── */
function PhotoUploadStep({ photos, uploading, maxPhotos, onSelect, onRemove }: {
  photos: string[]
  uploading: boolean
  maxPhotos: number
  onSelect: (files: File[]) => void
  onRemove: (url: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const canAddMore = photos.length < maxPhotos

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {photos.map(url => (
            <div key={url} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--tdgflow-border)', aspectRatio: '1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Foto da visita" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                onClick={() => onRemove(url)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={11} style={{ color: '#fff' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
            if (files.length) onSelect(files)
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '28px 16px', borderRadius: 14,
            border: `1.5px dashed ${dragOver ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-border-light)'}`,
            background: dragOver ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface-high)',
            cursor: uploading ? 'default' : 'pointer', transition: 'background 150ms, border-color 150ms',
          }}
        >
          {uploading
            ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
            : (
              <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center' }}>
                {photos.length > 0 ? 'Adicionar mais fotos' : 'Toque para escolher ou arraste fotos aqui'}
              </span>
            )
          }
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onSelect(files); e.target.value = '' }}
            style={{ display: 'none' }}
          />
        </label>
      )}
    </div>
  )
}

/* ── Documento do roteiro (PDF/Word/foto das páginas) — 1 arquivo só, sem
   preview de imagem (não é foto), mostra nome do arquivo. ────────────── */
function DocumentUploadStep({ selectedDoc, uploading, onSelect, onRemove }: {
  selectedDoc: { url: string; name: string } | undefined
  uploading: boolean
  onSelect: (file: File) => void
  onRemove: () => void
}) {
  const [dragOver, setDragOver] = useState(false)

  if (selectedDoc) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface-high)' }}>
        <FileText size={18} style={{ color: 'var(--tdgflow-navy)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedDoc.name}
        </span>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          <X size={14} style={{ color: 'var(--tdgflow-text-muted)' }} />
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) onSelect(file)
      }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '28px 16px', borderRadius: 14,
        border: `1.5px dashed ${dragOver ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-border-light)'}`,
        background: dragOver ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface-high)',
        cursor: uploading ? 'default' : 'pointer', transition: 'background 150ms, border-color 150ms',
      }}
    >
      {uploading
        ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
        : (
          <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center' }}>
            Toque para escolher ou arraste o roteiro aqui
          </span>
        )
      }
      <input
        type="file"
        accept="application/pdf,.pdf,.doc,.docx,image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={e => { const file = e.target.files?.[0]; if (file) onSelect(file); e.target.value = '' }}
        style={{ display: 'none' }}
      />
    </label>
  )
}

/* ── Lista de nomes — lote de "Por testar": mesmo contexto compartilhado
   (país, motivo/fonte), N nomes, adicionar/remover linhas livremente. ── */
function NameListStep({ names, onChange }: { names: string[]; onChange: (names: string[]) => void }) {
  function update(i: number, value: string) {
    const next = [...names]
    next[i] = value
    onChange(next)
  }
  function remove(i: number) {
    onChange(names.length > 1 ? names.filter((_, idx) => idx !== i) : [''])
  }
  function add() {
    onChange([...names, ''])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {names.map((name, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="input"
            placeholder={i === 0 ? 'Nome do hotel, restaurante, guia...' : 'Mais um nome...'}
            value={name}
            onChange={e => update(i, e.target.value)}
            autoFocus={i === names.length - 1}
          />
          {names.length > 1 && (
            <button
              onClick={() => remove(i)}
              style={{ flexShrink: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}
              aria-label="Remover"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={add}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
          padding: '8px 12px', borderRadius: 10, background: 'none', border: '1px dashed var(--tdgflow-border-light)',
          color: 'var(--tdgflow-text-muted)', fontSize: '0.8125rem', cursor: 'pointer',
        }}
      >
        <Plus size={13} /> Adicionar outro
      </button>
    </div>
  )
}

/* ── Questionnaire ──────────────────────────────────────────────── */
// Perguntas ramificadas por entity_type/visit_type — ver src/lib/review-questions.ts

function Questionnaire({ onClose, onSaved, initialAnswers, relatedLeadId }: {
  onClose: () => void
  onSaved: () => void
  initialAnswers?: Record<string, unknown>
  relatedLeadId?: string
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers ?? {})
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const { toast } = useToast()

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [secs, setSecs] = useState(0)

  const QUESTIONS = getQuestions(answers)
  const q = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const progress = ((step + 1) / QUESTIONS.length) * 100

  function setAnswer(val: unknown) {
    setAnswers(prev => ({ ...prev, [q.id]: val }))
  }

  function setAnswerField(key: string, val: unknown) {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }

  const currentAnswer = answers[q.id]

  function canAdvance() {
    if (q.id === 'heads_up') return true          // optional
    if (q.type === 'sentiment_map') return true   // optional
    if (q.type === 'photo') return !uploadingPhoto // optional, só trava durante upload
    if (q.type === 'document') return !uploadingDocument // optional, só trava durante upload
    if (q.type === 'sentiment') return currentAnswer !== undefined  // allow 0
    if (q.type === 'name_list') return Array.isArray(currentAnswer) && (currentAnswer as string[]).some(n => n.trim())
    return !!currentAnswer
  }

  const MAX_REVIEW_PHOTOS = 6

  async function handlePhotosSelect(files: File[]) {
    if (!files.length) return
    const current = (answers.photo as string[] | undefined) ?? []
    const room = MAX_REVIEW_PHOTOS - current.length
    if (room <= 0) {
      toast(`Máximo de ${MAX_REVIEW_PHOTOS} fotos por visita`, 'error')
      return
    }
    const toUpload = files.slice(0, room)
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      toUpload.forEach(f => fd.append('photo', f))
      const res = await fetch('/api/reviews/photo', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAnswer([...current, ...(data.photo_urls as string[])])
    } catch {
      toast('Não foi possível enviar a(s) foto(s) — pode seguir sem elas', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  function removePhoto(url: string) {
    const current = (answers.photo as string[] | undefined) ?? []
    setAnswer(current.filter(u => u !== url))
  }

  async function handleDocumentSelect(file: File) {
    setUploadingDocument(true)
    try {
      const fd = new FormData()
      fd.append('document', file)
      const res = await fetch('/api/reviews/document', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erro ao enviar')
      }
      const data = await res.json()
      setAnswer({ url: data.document_url as string, name: data.document_name as string })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível enviar o documento', 'error')
    } finally {
      setUploadingDocument(false)
    }
  }

  function removeDocument() {
    setAnswer(undefined)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size < 1000) return
        // Transcribe inline
        const fd = new FormData()
        fd.append('audio', new File([blob], 'answer.webm', { type: 'audio/webm' }))
        fd.append('agent_name', '')
        fd.append('interlocutor_name', '')
        fd.append('interlocutor_company', '')
        // Use existing transcribe endpoint or inline OpenAI call
        // For now, set a placeholder — real transcription happens server-side at submit
        setAnswer('[gravação de voz]')
        setRecording(false)
        if (timerRef.current) clearInterval(timerRef.current)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setSecs(0)
      timerRef.current = setInterval(() => setSecs(s => s + 1), 1000)
      sounds.recordStart()
    } catch {
      sounds.error()
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    sounds.recordStop()
  }

  async function handleSubmit() {
    setSaving(true)

    const subRatings = (answers.sub_ratings as Record<string, number>) ?? {}
    const sentimentMap = (answers.sentiment_map as SentimentMapValue) ?? {}
    const hasSentimentMap = Object.keys(sentimentMap).length > 0
    const rawAnswers = Object.fromEntries(
      Object.entries(answers)
        .filter(([k]) => !['overall_rating', 'sub_ratings', 'sentiment_map', 'hotel_name', 'hotel_names', 'visit_date', 'visit_type', 'entity_type', 'photo', 'document', 'media_usage_authorized'].includes(k))
        .map(([k, v]) => [k, String(v)])
    )

    // Lote de "Por testar" — mesmo contexto (país, fonte/motivo), N nomes.
    // Um POST por nome, mas um único submit pro usuário (achado da Carla,
    // 10/08: repetir o questionário inteiro só porque o nome muda era
    // fricção sem motivo).
    const isBatch = Array.isArray(answers.hotel_names)
    const names = isBatch ? (answers.hotel_names as string[]).map(n => n.trim()).filter(Boolean) : []

    try {
      if (isBatch) {
        const results = await Promise.all(names.map(name =>
          fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hotel_name:  name,
              entity_type: answers.entity_type || 'hotel',
              country:     answers.country || null,
              visit_type:  answers.visit_type || null,
              raw_answers: rawAnswers,
            }),
          })
        ))
        const failed = results.filter(r => !r.ok).length
        if (failed === results.length) throw new Error('Nenhuma descoberta foi salva.')
        setDone(true)
        sounds.saved()
        const ok = results.length - failed
        toast(
          failed > 0
            ? `${ok} de ${results.length} descobertas registradas — algumas falharam, tente de novo.`
            : `${ok} descoberta${ok > 1 ? 's' : ''} registrada${ok > 1 ? 's' : ''} — vamos testar!`,
          failed > 0 ? 'error' : 'success'
        )
        return
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_name:       answers.hotel_name,
          entity_type:      answers.entity_type || 'hotel',
          country:          answers.country || null,
          visit_date:       answers.visit_date || null,
          visit_type:       answers.visit_type || null,
          overall_rating:   answers.overall_rating,
          rooms_rating:     subRatings.rooms    ?? null,
          service_rating:   subRatings.service  ?? null,
          food_rating:      subRatings.food     ?? null,
          location_rating:  subRatings.location ?? null,
          photo_urls:       (answers.photo as string[] | undefined) ?? [],
          document_url:     (answers.document as { url: string } | undefined)?.url ?? null,
          media_usage_authorized: (answers.media_usage_authorized as boolean | undefined) ?? true,
          related_lead_id:  relatedLeadId || null,
          // status não é enviado — o servidor deriva de visit_type, nunca confia no cliente.
          raw_answers:      rawAnswers,
          sentiment_map:    hasSentimentMap ? sentimentMap : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${res.status}`)
      }
      setDone(true)
      sounds.saved()
      toast(
        isLeadSubmission(answers) ? 'Descoberta registrada — vamos testar!' : 'Visita registrada com sucesso!',
        'success'
      )
    } catch (err) {
      toast(`Erro ao salvar visita: ${err instanceof Error ? err.message : 'Tente novamente'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', borderRadius: 20, padding: 40, maxWidth: 360, width: '100%', textAlign: 'center' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(134,239,172,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} style={{ color: 'var(--tdgflow-success)' }} />
          </div>
          <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', marginBottom: 8 }}>
            {isLeadSubmission(answers) ? 'Descoberta registrada' : 'Visita registrada'}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            {isLeadSubmission(answers)
              ? 'Assim que alguém da rede confirmar de perto, essa descoberta vira uma dica de verdade.'
              : 'Extraímos os pontos-chave das suas respostas. Sua visita ficou registrada no histórico.'}
          </p>
          <button onClick={() => { onSaved(); onClose() }} className="btn-gold w-full" style={{ justifyContent: 'center', padding: 12 }}>
            Ver as dicas
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <ResponsiveSheet onClose={onClose} maxWidth={520}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Registrar experiência · {step + 1} de {QUESTIONS.length}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: 'var(--tdgflow-text-muted)' }} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ height: 2, background: 'var(--tdgflow-border)', margin: '0 20px 24px', borderRadius: 2 }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            style={{ height: '100%', background: 'var(--tdgflow-navy)', borderRadius: 2 }}
          />
        </div>

        {/* Question */}
        <div style={{ flex: 1, overflow: 'hidden auto', padding: '0 20px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: 300, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.4, marginBottom: 20 }}>
                {q.text}
              </p>

              {/* Text input */}
              {(q.type === 'text') && (
                <input
                  className="input"
                  placeholder={q.placeholder}
                  value={(currentAnswer as string) ?? ''}
                  onChange={e => setAnswer(e.target.value)}
                  autoFocus
                />
              )}

              {/* Lista de nomes — lote de "Por testar" (achado da Carla,
                  10/08: mesmo contexto, N nomes, 1 submit) */}
              {q.type === 'name_list' && (
                <NameListStep
                  names={(currentAnswer as string[] | undefined) ?? ['']}
                  onChange={setAnswer}
                />
              )}

              {/* Date */}
              {q.type === 'date' && (
                <input
                  className="input"
                  type="date"
                  value={(currentAnswer as string) ?? ''}
                  onChange={e => setAnswer(e.target.value)}
                />
              )}

              {/* Select */}
              {q.type === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options!.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(opt)}
                      style={{
                        padding: '12px 16px', borderRadius: 12, textAlign: 'left',
                        background: currentAnswer === opt ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface-high)',
                        border: `1px solid ${currentAnswer === opt ? 'var(--tdgflow-navy-ring)' : 'var(--tdgflow-border)'}`,
                        color: currentAnswer === opt ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)',
                        fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {OPTION_LABELS[opt] ?? opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Sentiment chips — overall (Fase 3: substitui o slider de dots) */}
              {q.type === 'sentiment' && (
                <SentimentChips
                  value={currentAnswer !== undefined ? (currentAnswer as number) : null}
                  onChange={setAnswer}
                  size="large"
                />
              )}

              {/* Sentiment map */}
              {q.type === 'sentiment_map' && (
                <SentimentMapStep
                  value={(currentAnswer as SentimentMapValue) ?? {}}
                  onChange={setAnswer}
                />
              )}

              {/* Photo — prova de que alguém esteve lá de verdade; opcional.
                  Múltiplas fotos + arrastar pra dentro (achado da Carla,
                  07/08: só dava pra subir uma de cada vez, sem drag&drop). */}
              {q.type === 'photo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <PhotoUploadStep
                    photos={(currentAnswer as string[] | undefined) ?? []}
                    uploading={uploadingPhoto}
                    maxPhotos={MAX_REVIEW_PHOTOS}
                    onSelect={handlePhotosSelect}
                    onRemove={removePhoto}
                  />
                  {/* Autorização de uso pela rede — só faz sentido perguntar
                      se tem foto. Default ligado (opt-out), decisão da
                      Carla, 10/08: combina com o espírito de inteligência
                      coletiva do produto. */}
                  {((currentAnswer as string[] | undefined) ?? []).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--tdgflow-surface-high)' }}>
                      <Toggle
                        checked={(answers.media_usage_authorized as boolean | undefined) ?? true}
                        onChange={v => setAnswerField('media_usage_authorized', v)}
                        label="Autorizar uso das fotos por outras agências"
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>
                        Autorizo o uso destas fotos por outras agências em propostas e materiais
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Documento do roteiro — PDF/Word/fotos das páginas */}
              {q.type === 'document' && (
                <DocumentUploadStep
                  selectedDoc={currentAnswer as { url: string; name: string } | undefined}
                  uploading={uploadingDocument}
                  onSelect={handleDocumentSelect}
                  onRemove={removeDocument}
                />
              )}

              {/* Voice + text */}
              {q.type === 'voice_text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder={q.placeholder}
                    value={(currentAnswer as string) ?? ''}
                    onChange={e => setAnswer(e.target.value)}
                    style={{ resize: 'none', lineHeight: 1.6 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 10,
                          background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
                          color: 'var(--tdgflow-text-muted)', fontSize: '0.75rem', cursor: 'pointer',
                        }}
                      >
                        <Mic size={13} /> Responder por voz
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 10,
                          background: 'var(--tdgflow-error)', border: 'none',
                          color: 'var(--tdgflow-surface)', fontSize: '0.75rem', cursor: 'pointer',
                        }}
                      >
                        <Square size={12} className="fill-current" />
                        Parar ({Math.floor(secs / 60)}:{(secs % 60).toString().padStart(2, '0')})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div style={{ flexShrink: 0, padding: '20px', display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => { sounds.stepBack(); setStep(s => s - 1) }}
              className="btn-ghost"
              style={{ padding: '11px 18px' }}
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <button
            onClick={isLast ? handleSubmit : () => { sounds.stepNext(); setStep(s => s + 1) }}
            disabled={!canAdvance() || saving}
            className="btn-gold"
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Processando...</>
              : isLast
                ? <><CheckCircle size={14} /> {isLeadSubmission(answers) ? 'Registrar descoberta' : 'Registrar visita'}</>
                : <>Próxima <ArrowRight size={14} /></>
            }
          </button>
        </div>
    </ResponsiveSheet>
  )
}

/* ── History drawer ─────────────────────────────────────────────── */
function HistoryDrawer({ hotelName, onClose, onToggleFavorite }: {
  hotelName: string
  onClose: () => void
  onToggleFavorite: (id: string, current: boolean) => void
}) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reviews?hotel=${encodeURIComponent(hotelName)}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews ?? []); setLoading(false) })
  }, [hotelName])

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        style={{
          width: '100%', maxWidth: 420, height: '100%',
          background: 'var(--tdgflow-surface)', borderLeft: '1px solid var(--tdgflow-border)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--tdgflow-border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>{hotelName}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>Histórico de visitas</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} style={{ color: 'var(--tdgflow-text-muted)' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden auto', padding: '16px' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem', paddingTop: 40 }}>Carregando...</p>}
          {!loading && reviews.map((r, idx) => (
            <div
              key={r.id}
              style={{
                padding: '16px', borderRadius: 14, marginBottom: 10,
                background: idx === 0 ? 'var(--tdgflow-surface-high)' : 'var(--tdgflow-bg)',
                border: `1px solid ${idx === 0 ? 'var(--tdgflow-border)' : 'var(--tdgflow-border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <SentimentBadge value={r.overall_rating} />
                    {r.visit_type && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--tdgflow-navy)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {VISIT_TYPE_LABELS[r.visit_type] ?? r.visit_type}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 600, color: 'var(--tdgflow-text-secondary)' }}>
                      {r.agent_name[0]}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {r.agent_name} · {r.agency_name}
                      {r.source === 'max_whatsapp' && <MaxSourceBadge />}
                    </span>
                    {idx === 0 && <span style={{ fontSize: '0.6rem', color: 'var(--tdgflow-navy)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>mais recente</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>{formatDate(r.visit_date)}</span>
                  <button onClick={() => onToggleFavorite(r.id, r.is_favorite)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <Heart size={14} style={{ color: r.is_favorite ? '#f87171' : 'var(--tdgflow-border)', fill: r.is_favorite ? '#f87171' : 'transparent' }} />
                  </button>
                </div>
              </div>

              {r.highlights?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {r.highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--tdgflow-navy-dim)', marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>{h}</span>
                    </div>
                  ))}
                </div>
              )}
              {r.must_experience && (
                <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-navy)', marginTop: 6, fontWeight: 300 }}>
                  ★ {r.must_experience}
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/* Favoritos saiu daqui — não é taxonomia de visita, é estado pessoal
   salvo. Virou um toggle próprio ao lado da busca (revisão Tesla). */
const VISIT_FILTER_TABS = [
  { id: 'all',               label: 'Tudo' },
  { id: 'fam_trip',          label: 'FAM Trip' },
  { id: 'site_inspection',   label: 'Site Inspection' },
  { id: 'personal_stay',     label: 'Personal Stay' },
]

// Mesmas 3 opções do filtro acima, sem "Tudo" — usado no EditReviewModal
// pra classificar retroativamente reviews importadas sem visit_type.
const VISIT_TYPE_FILTER_OPTIONS = VISIT_FILTER_TABS.filter(t => t.id !== 'all')

const ENTITY_FILTER_TABS = [{ id: 'all', label: 'Todos os tipos' }, ...Object.entries(ENTITY_TYPE_LABELS).map(([id, label]) => ({ id, label }))]

const PERIOD_FILTER_TABS = [
  { id: 'all',       label: 'Todo o período' },
  { id: '30d',       label: 'Últimos 30 dias' },
  { id: '90d',       label: 'Últimos 90 dias' },
  { id: 'year',      label: 'Este ano' },
  { id: 'last_year', label: 'Ano passado' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function matchesPeriod(dateStr: string | null, period: string, now: Date): boolean {
  if (period === 'all') return true
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (period === '30d') return now.getTime() - d.getTime() <= 30 * DAY_MS
  if (period === '90d') return now.getTime() - d.getTime() <= 90 * DAY_MS
  if (period === 'year') return d.getFullYear() === now.getFullYear()
  if (period === 'last_year') return d.getFullYear() === now.getFullYear() - 1
  return true
}

/* ── Main export ────────────────────────────────────────────────── */
export default function DicasView() {
  const searchParams = useSearchParams()
  // Antecipação: vindo da ficha de um fornecedor ("Registrar nova visita"),
  // já chega aqui com o nome preenchido — nunca pergunta de novo algo que o
  // sistema já sabe.
  const prefillHotelName = searchParams.get('hotel')
  const highlightReviewId = searchParams.get('reviewId')

  const [publishedReviews, setPublishedReviews] = useState<Review[]>([])
  const [leadReviews, setLeadReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuestionnaire, setShowQuestionnaire] = useState(!!prefillHotelName)
  const [showRecord, setShowRecord] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [confirmingLead, setConfirmingLead] = useState<Review | null>(null)
  const [audioToRegister, setAudioToRegister] = useState<AudioQueueItem | null>(null)
  const [historyHotel, setHistoryHotel] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [activeVisitType, setActiveVisitType] = useState('all')
  const [activeEntityType, setActiveEntityType] = useState('all')
  const [activeCountry, setActiveCountry] = useState('all')
  const [activePeriod, setActivePeriod] = useState('all')
  const [activeAgency, setActiveAgency] = useState('all')
  const [showFilterSheet, setShowFilterSheet] = useState(false)

  const loadReviews = useCallback(async () => {
    const [pubRes, leadRes] = await Promise.all([
      fetch('/api/reviews?status=published'),
      fetch('/api/reviews?status=a_testar'),
    ])
    const pubData = await pubRes.json()
    const leadData = await leadRes.json()
    setPublishedReviews(pubData.reviews ?? [])
    setLeadReviews(leadData.reviews ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadReviews() }, [loadReviews])

  async function toggleFavorite(reviewId: string, isFavorite: boolean) {
    isFavorite ? sounds.favoriteRemove() : sounds.favoriteAdd()
    const patch = (r: Review) => r.id === reviewId ? { ...r, is_favorite: !isFavorite } : r
    setPublishedReviews(prev => prev.map(patch))
    setLeadReviews(prev => prev.map(patch))
    await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, action: isFavorite ? 'remove' : 'add' }),
    })
  }

  const allReviews = [...publishedReviews, ...leadReviews]
  const q = search.trim().toLowerCase()
  const countries = ['all', ...Array.from(new Set(allReviews.map(r => r.country).filter(Boolean))).sort()] as string[]
  const agencies = ['all', ...Array.from(new Set(allReviews.map(r => r.agency_name).filter(Boolean))).sort()] as string[]
  const now = new Date()

  function matches(r: Review) {
    if (favoritesOnly && !r.is_favorite) return false
    if (activeVisitType !== 'all' && r.visit_type !== activeVisitType) return false
    if (activeEntityType !== 'all' && r.entity_type !== activeEntityType) return false
    if (activeCountry !== 'all' && r.country !== activeCountry) return false
    if (activeAgency !== 'all' && r.agency_name !== activeAgency) return false
    if (!matchesPeriod(r.visit_date ?? r.created_at, activePeriod, now)) return false
    if (!q) return true
    return (
      r.hotel_name.toLowerCase().includes(q) ||
      (r.country ?? '').toLowerCase().includes(q) ||
      r.agent_name.toLowerCase().includes(q) ||
      r.agency_name.toLowerCase().includes(q) ||
      (r.client_profile ?? '').toLowerCase().includes(q) ||
      (r.must_experience ?? '').toLowerCase().includes(q) ||
      (r.heads_up ?? '').toLowerCase().includes(q) ||
      r.highlights.some(h => h.toLowerCase().includes(q))
    )
  }

  const filteredPublished = publishedReviews.filter(matches)
  const filteredLeads = leadReviews.filter(matches)
  const hasResults = filteredPublished.length > 0 || filteredLeads.length > 0
  // Contador do botão "Filtros" — só o que mora no sheet (tipo de fornecedor
  // fica sempre visível fora dele, favoritos tem o próprio toggle).
  const sheetActiveCount = [activeVisitType !== 'all', activeCountry !== 'all', activePeriod !== 'all', activeAgency !== 'all'].filter(Boolean).length
  const hasActiveFilter = activeVisitType !== 'all' || activeEntityType !== 'all' || activeCountry !== 'all' || activePeriod !== 'all' || activeAgency !== 'all' || favoritesOnly || !!q

  // Hero — a review confirmada com melhor nota que tenha foto real anexada.
  // Sem foto, não vira hero (nunca finge com gradiente).
  const heroCandidate = [...filteredPublished]
    .filter(r => r.photo_url)
    .sort((a, b) => (b.overall_rating ?? 0) - (a.overall_rating ?? 0))[0]

  function clearFilters() {
    setSearch(''); setActiveVisitType('all'); setActiveEntityType('all'); setActiveCountry('all')
    setActivePeriod('all'); setActiveAgency('all'); setFavoritesOnly(false)
  }

  function clearSheetFilters() {
    setActiveVisitType('all'); setActiveCountry('all'); setActivePeriod('all'); setActiveAgency('all')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TdgIconSprite />

      {/* ── Header block ─────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)' }}>
        {/* Title row — flexWrap: achado do áudito mobile (13/08): sem isso, o
            cluster de stats + botões (incluindo "Registrar experiência", a
            ação primária da página) simplesmente vazava pra fora da tela em
            viewports estreitos, ficando inacessível. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 12, padding: '18px 20px 12px' }}>
          <div>
            <p style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--tdgflow-accent-warm)', marginBottom: 4,
            }}>
              <svg style={{ width: 10, height: 10, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <use href="#i-compass" />
              </svg>
              Rede TDG
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4 }}>
              Na prática
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>
              O que aprendemos indo lá: inspeções, impressões, avisos
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, rowGap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            {!loading && (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{publishedReviews.length}</p>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>testadas</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-accent-warm)', letterSpacing: '-0.02em', lineHeight: 1 }}>{leadReviews.length}</p>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>a testar</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowQueue(true)}
              className="btn-ghost relative"
              style={{ padding: '8px 13px', fontSize: '0.8125rem' }}
            >
              <IconQueue size={13} /> Fila
              {queueCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1,
                  background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.625rem',
                }}>
                  {queueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowRecord(true)}
              className="btn-ghost"
              style={{ padding: '8px 13px', fontSize: '0.8125rem' }}
              title="Vai pra Fila — transcreva quando quiser, depois vira registro com 1 clique"
            >
              <Mic size={13} /> Gravar
            </button>
            <button
              onClick={() => setShowQuestionnaire(true)}
              className="btn-gold"
              style={{ padding: '8px 13px', fontSize: '0.8125rem' }}
            >
              <Plus size={13} /> Registrar experiência
            </button>
          </div>
        </div>

        {/* Search + favoritos (estado pessoal, não taxonomia — toggle próprio) */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
            <input
              className="input"
              placeholder="Fornecedor, advisor, perfil de cliente, palavra-chave..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, fontSize: '0.8125rem', background: 'var(--tdgflow-bg)' }}
            />
          </div>
          <button
            onClick={() => setFavoritesOnly(v => !v)}
            title="Só favoritos"
            style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: favoritesOnly ? 'var(--tdgflow-navy)' : 'var(--tdgflow-surface-high)',
              border: favoritesOnly ? 'none' : '1px solid var(--tdgflow-border)',
              cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            <Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} style={{ color: favoritesOnly ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-muted)' }} />
          </button>
        </div>

        {/* Tipo de fornecedor — único chip sempre visível (eixo de navegação
            primário, largura previsível); tudo o mais mora no sheet "Filtros" */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', flex: 1, minWidth: 0 }}>
            {ENTITY_FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveEntityType(tab.id)}
                style={{
                  flexShrink: 0, padding: '4px 12px', borderRadius: 999,
                  fontSize: '0.6875rem', fontWeight: activeEntityType === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  background: activeEntityType === tab.id ? 'var(--tdgflow-text-primary)' : 'var(--tdgflow-surface-high)',
                  color: activeEntityType === tab.id ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-muted)',
                  border: activeEntityType === tab.id ? 'none' : '1px solid var(--tdgflow-border)',
                  transition: 'all 150ms',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilterSheet(true)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999,
              fontSize: '0.6875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
              background: sheetActiveCount > 0 ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface)',
              color: sheetActiveCount > 0 ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)',
              border: sheetActiveCount > 0 ? '1.5px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
            }}
          >
            <SlidersHorizontal size={12} /> Filtros{sheetActiveCount > 0 ? ` · ${sheetActiveCount}` : ''}
          </button>
        </div>
      </div>

      {/* ── Sheet: Tipo de visita / País / Período / Agência ────────── */}
      <AnimatePresence>
        {showFilterSheet && (
          <ResponsiveSheet onClose={() => setShowFilterSheet(false)} maxWidth={560} zIndex={60}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>Filtros</p>
                <button onClick={() => setShowFilterSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={16} style={{ color: 'var(--tdgflow-text-muted)' }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Tipo de visita</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {VISIT_FILTER_TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveVisitType(tab.id)}
                        style={{
                          padding: '4px 12px', borderRadius: 999,
                          fontSize: '0.6875rem', fontWeight: activeVisitType === tab.id ? 600 : 400,
                          cursor: 'pointer',
                          background: activeVisitType === tab.id ? 'var(--tdgflow-navy)' : 'var(--tdgflow-surface-high)',
                          color: activeVisitType === tab.id ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-muted)',
                          border: activeVisitType === tab.id ? 'none' : '1px solid var(--tdgflow-border)',
                          transition: 'all 150ms',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {countries.length > 1 && (
                  <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>País</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {countries.map(c => (
                        <button
                          key={c}
                          onClick={() => setActiveCountry(c)}
                          style={{
                            padding: '3px 11px', borderRadius: 999,
                            fontSize: '0.625rem', fontWeight: activeCountry === c ? 600 : 400,
                            letterSpacing: '0.02em', cursor: 'pointer',
                            background: activeCountry === c ? 'var(--tdgflow-surface-high)' : 'transparent',
                            color: activeCountry === c ? 'var(--tdgflow-text-primary)' : 'var(--tdgflow-text-muted)',
                            border: activeCountry === c ? '1px solid var(--tdgflow-border-light)' : '1px solid var(--tdgflow-border)',
                            transition: 'all 150ms',
                          }}
                        >
                          {c === 'all' ? 'Todos os países' : c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Período</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PERIOD_FILTER_TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePeriod(tab.id)}
                        style={{
                          padding: '3px 11px', borderRadius: 999,
                          fontSize: '0.625rem', fontWeight: activePeriod === tab.id ? 600 : 400,
                          letterSpacing: '0.02em', cursor: 'pointer',
                          background: activePeriod === tab.id ? 'var(--tdgflow-surface-high)' : 'transparent',
                          color: activePeriod === tab.id ? 'var(--tdgflow-text-primary)' : 'var(--tdgflow-text-muted)',
                          border: activePeriod === tab.id ? '1px solid var(--tdgflow-border-light)' : '1px solid var(--tdgflow-border)',
                          transition: 'all 150ms',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {agencies.length > 1 && (
                  <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Agência</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {agencies.map(a => (
                        <button
                          key={a}
                          onClick={() => setActiveAgency(a)}
                          style={{
                            padding: '3px 11px', borderRadius: 999,
                            fontSize: '0.625rem', fontWeight: activeAgency === a ? 600 : 400,
                            letterSpacing: '0.02em', cursor: 'pointer',
                            background: activeAgency === a ? 'var(--tdgflow-surface-high)' : 'transparent',
                            color: activeAgency === a ? 'var(--tdgflow-text-primary)' : 'var(--tdgflow-text-muted)',
                            border: activeAgency === a ? '1px solid var(--tdgflow-border-light)' : '1px solid var(--tdgflow-border)',
                            transition: 'all 150ms',
                          }}
                        >
                          {a === 'all' ? 'Todas as agências' : a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--tdgflow-border)', display: 'flex', gap: 10 }}>
                <button onClick={clearSheetFilters} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}>Limpar filtros</button>
                <button onClick={() => setShowFilterSheet(false)} className="btn-gold" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}>Aplicar</button>
              </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      {/* ── Feed ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 40px' }}>
        {/* Fase 6 — 3ª seção condicional, "você disse isso, confirma?" (decisão
            #14). Some sozinha quando não há pendência própria — não some quando
            o resto da lista (recém-descoberto/aprovado) está vazio. */}
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <PendingConfirmationQueue scope="mine" contentType="review" title="Você disse isso — confirma?" />
        </div>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem', paddingTop: 48 }}>Carregando...</p>
        )}
        {!loading && !hasResults && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            {hasActiveFilter ? (
              <>
                <Search size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nenhum resultado encontrado.</p>
                <button onClick={clearFilters} style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <Building2 size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nenhuma visita registrada ainda.</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>Clique em &quot;Registrar experiência&quot; para começar.</p>
              </>
            )}
          </div>
        )}

        {!loading && hasResults && (
          <div style={{ maxWidth: 1040, margin: '0 auto' }}>

            {/* Hero — uma peça editorial só, nunca compete dentro da grade */}
            {heroCandidate && (
              <div style={{
                position: 'relative', borderRadius: 20, overflow: 'hidden', height: 260, marginBottom: 32,
                background: `linear-gradient(0deg, rgba(20,12,6,0.82) 0%, rgba(20,12,6,0.3) 50%, rgba(20,12,6,0.05) 72%), url(${heroCandidate.photo_url}) center/cover`,
              }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '24px 28px 22px' }}>
                  <p style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.92)', marginBottom: 8,
                  }}>
                    <svg style={{ width: 11, height: 11, fill: 'currentColor' }}><use href="#i-verified" /></svg>
                    {heroCandidate.visit_type ? (VISIT_TYPE_LABELS[heroCandidate.visit_type] ?? heroCandidate.visit_type) : 'Confirmado'} · por {heroCandidate.agent_name}
                  </p>
                  <h3 style={{ fontFamily: 'ui-serif, Georgia, serif', fontWeight: 500, fontSize: '1.75rem', color: '#fff', margin: '0 0 6px', maxWidth: 560, lineHeight: 1.15 }}>
                    {heroCandidate.hotel_name}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.82)' }}>
                    {heroCandidate.country ?? ''}{heroCandidate.must_experience ? ` · ${heroCandidate.must_experience}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Recém-descoberto — ninguém foi lá pessoalmente ainda */}
            {filteredLeads.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h4 style={{
                    display: 'flex', alignItems: 'center', gap: 6, margin: 0,
                    fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--tdgflow-text-muted)',
                  }}>
                    <svg style={{ width: 12, height: 12, fill: 'var(--tdgflow-accent-warm)' }}><use href="#i-spark" /></svg>
                    Recém-descoberto pela rede
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>Ainda a testar — por isso é traço, não foto</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(252px, 1fr))', gap: 16 }}>
                  <AnimatePresence>
                    {filteredLeads.map(r => (
                      <HotelCard
                        key={r.id}
                        review={r}
                        onToggleFavorite={toggleFavorite}
                        onViewHistory={setHistoryHotel}
                        onConfirmLead={setConfirmingLead}
                        onUpdated={loadReviews}
                        highlightId={highlightReviewId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Aprovado pela rede */}
            {filteredPublished.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h4 style={{
                    display: 'flex', alignItems: 'center', gap: 6, margin: 0,
                    fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--tdgflow-text-muted)',
                  }}>
                    <svg style={{ width: 12, height: 12, fill: 'var(--tdgflow-gold-dim, #8C6436)' }}><use href="#i-verified" /></svg>
                    Testado pela rede
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>Foto de quem esteve lá — nunca banco de imagens</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(252px, 1fr))', gap: 16 }}>
                  <AnimatePresence>
                    {filteredPublished.map(r => (
                      <HotelCard
                        key={r.id}
                        review={r}
                        onToggleFavorite={toggleFavorite}
                        onViewHistory={setHistoryHotel}
                        onConfirmLead={setConfirmingLead}
                        onUpdated={loadReviews}
                        highlightId={highlightReviewId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showQuestionnaire && (
          <Questionnaire
            onClose={() => setShowQuestionnaire(false)}
            onSaved={() => { loadReviews() }}
            initialAnswers={prefillHotelName ? { entity_type: 'hotel', hotel_name: prefillHotelName } : undefined}
          />
        )}
        {confirmingLead && (
          <Questionnaire
            onClose={() => setConfirmingLead(null)}
            onSaved={() => { loadReviews() }}
            relatedLeadId={confirmingLead.id}
            initialAnswers={{
              entity_type: confirmingLead.entity_type,
              hotel_name: confirmingLead.hotel_name,
              country: confirmingLead.country ?? undefined,
            }}
          />
        )}
        {audioToRegister && (
          <Questionnaire
            onClose={() => setAudioToRegister(null)}
            onSaved={() => {
              loadReviews()
              // Marca o áudio como convertido — não volta a sugerir "Criar
              // registro" pro mesmo item depois de já ter virado review.
              fetch('/api/audio-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: audioToRegister.id }),
              }).catch(() => {})
            }}
            initialAnswers={audioAnswersFrom(audioToRegister)}
          />
        )}
        {historyHotel && (
          <HistoryDrawer
            hotelName={historyHotel}
            onClose={() => setHistoryHotel(null)}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </AnimatePresence>

      {showRecord && (
        <AudioRecord
          onSaved={() => { setQueueCount(c => c + 1); setShowRecord(false) }}
          onClose={() => setShowRecord(false)}
        />
      )}
      {showQueue && (
        <AudioQueue
          onClose={() => { setShowQueue(false); setQueueCount(0) }}
          onCreateRegister={item => { setAudioToRegister(item); setShowQueue(false) }}
        />
      )}
    </div>
  )
}
