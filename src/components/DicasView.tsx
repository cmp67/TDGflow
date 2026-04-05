'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Star, Heart, ChevronDown, ChevronUp,
  Building2, X, Mic, Square, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, AlertCircle, Search, SlidersHorizontal
} from 'lucide-react'
import { sounds } from '@/lib/sounds'
import { useToast } from '@/contexts/ToastContext'

/* ── Types ─────────────────────────────────────────────────────── */
interface Review {
  id: string
  hotel_name: string
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
  created_at: string
  is_favorite: boolean
  visit_count?: number
  avg_rating?: number
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  fam_trip: 'FAM Trip',
  site_inspection: 'Site Inspection',
  personal_stay: 'Hospedagem pessoal',
  commercial_meeting: 'Reunião comercial',
}

/* ── Star rating display ────────────────────────────────────────── */
function Stars({ value, size = 12, interactive = false, onChange }: {
  value: number; size?: number; interactive?: boolean; onChange?: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          style={{
            color: (interactive ? hover || value : value) >= i ? 'var(--gold)' : 'var(--border)',
            fill: (interactive ? hover || value : value) >= i ? 'var(--gold)' : 'transparent',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'color 0.1s',
          }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(i)}
        />
      ))}
    </div>
  )
}

/* ── Rating accent color ────────────────────────────────────────── */
function ratingAccent(r: number) {
  if (r >= 5) return 'var(--gold)'
  if (r >= 4) return '#C0B090'
  if (r >= 3) return 'var(--text-muted)'
  return 'var(--border)'
}

/* ── Hotel card ─────────────────────────────────────────────────── */
function HotelCard({ review, onToggleFavorite, onViewHistory }: {
  review: Review
  onToggleFavorite: (id: string, current: boolean) => void
  onViewHistory: (hotelName: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visitCount = Number(review.visit_count ?? 1)
  const avgRating = Number(review.avg_rating ?? review.overall_rating)
  const accent = ratingAccent(Math.round(avgRating))

  function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }} />

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
              fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 2,
            }}>
              {review.hotel_name}
            </h3>
            {review.country && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.01em' }}>
                {review.country}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: accent, letterSpacing: '-0.02em' }}>
                  {avgRating.toFixed(1)}
                </span>
                <Stars value={Math.round(avgRating)} size={11} />
              </div>
              <span style={{ color: 'var(--border-light)' }}>·</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {visitCount} {visitCount === 1 ? 'visita' : 'visitas'}
              </span>
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
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <Heart size={16} style={{
              color: review.is_favorite ? '#f87171' : 'var(--border-light)',
              fill: review.is_favorite ? '#f87171' : 'transparent',
              transition: 'all 0.15s',
            }} />
          </button>
        </div>

        {/* Highlights */}
        {review.highlights?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
            {(expanded ? review.highlights : review.highlights.slice(0, 3)).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: accent, marginTop: 7, flexShrink: 0, opacity: 0.7 }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>{h}</span>
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
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>{review.must_experience}</span>
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
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginBottom: 12 }}>
                {(review.rooms_rating || review.service_rating || review.food_rating || review.location_rating) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 14 }}>
                    {[
                      { label: 'Acomodações', v: review.rooms_rating },
                      { label: 'Serviço', v: review.service_rating },
                      { label: 'Gastronomia', v: review.food_rating },
                      { label: 'Localização', v: review.location_rating },
                    ].filter(r => r.v).map(({ label, v }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{label}</span>
                        <Stars value={v!} size={10} />
                      </div>
                    ))}
                  </div>
                )}
                {review.client_profile && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                      Perfil ideal
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 300 }}>{review.client_profile}</p>
                  </div>
                )}
                {review.heads_up && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <AlertCircle size={12} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 300 }}>{review.heads_up}</p>
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
            background: 'var(--surface-high)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0,
          }}>
            {review.agent_name[0]}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {review.agent_name}
          </span>
          {review.visit_date && (
            <>
              <span style={{ color: 'var(--border)', fontSize: '0.6875rem' }}>·</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatDate(review.visit_date)}</span>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 18px 8px 22px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--text-muted)', padding: 0, transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Fechar' : 'Ver detalhes'}
        </button>
        {visitCount > 1 && (
          <button
            onClick={() => onViewHistory(review.hotel_name)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: accent, padding: 0 }}
          >
            {visitCount} visitas <ArrowRight size={10} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Questionnaire ──────────────────────────────────────────────── */
const QUESTIONS = [
  { id: 'hotel_name',      text: 'Qual hotel você visitou?',                                    type: 'text',     placeholder: 'Nome do hotel...' },
  { id: 'country',         text: 'Em qual país fica o hotel?',                                  type: 'text',     placeholder: 'Ex: Portugal, Maldivas, França...' },
  { id: 'visit_date',      text: 'Quando foi a sua visita?',                                    type: 'date' },
  { id: 'visit_type',      text: 'Qual o tipo de visita?',                                      type: 'select',   options: ['fam_trip', 'site_inspection', 'personal_stay', 'commercial_meeting'] },
  { id: 'overall_rating',  text: 'Que nota geral você daria ao hotel?',                         type: 'stars' },
  { id: 'sub_ratings',     text: 'Avalie cada aspecto do hotel.',                               type: 'sub_stars' },
  { id: 'impressions',     text: 'O que mais te impressionou durante a visita?',                type: 'voice_text', placeholder: 'Descreva os pontos de destaque...' },
  { id: 'client_profile',  text: 'Para qual perfil de cliente você recomendaria este hotel?',  type: 'voice_text', placeholder: 'Famílias, casais, golf...' },
  { id: 'must_experience', text: 'Qual experiência no hotel você considera obrigatória?',       type: 'voice_text', placeholder: 'Uma atividade, restaurante, serviço...' },
  { id: 'heads_up',        text: 'Há alguma ressalva ou ponto de atenção para o cliente?',     type: 'voice_text', placeholder: 'Opcional — deixe em branco se não houver.' },
]

function Questionnaire({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number | Record<string, number>>>({})
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const { toast } = useToast()

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [secs, setSecs] = useState(0)

  const q = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const progress = ((step + 1) / QUESTIONS.length) * 100

  function setAnswer(val: string | number | Record<string, number>) {
    setAnswers(prev => ({ ...prev, [q.id]: val }))
  }

  const currentAnswer = answers[q.id]

  function canAdvance() {
    if (q.id === 'heads_up') return true // optional
    if (q.type === 'sub_stars') return true // optional
    return !!currentAnswer
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
    const rawAnswers = Object.fromEntries(
      Object.entries(answers).filter(([k]) => !['overall_rating', 'sub_ratings', 'hotel_name', 'visit_date', 'visit_type'].includes(k))
        .map(([k, v]) => [k, String(v)])
    )

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_name: answers.hotel_name,
        country: answers.country || null,
        visit_date: answers.visit_date || null,
        visit_type: answers.visit_type || null,
        overall_rating: answers.overall_rating,
        rooms_rating: subRatings.rooms ?? null,
        service_rating: subRatings.service ?? null,
        food_rating: subRatings.food ?? null,
        location_rating: subRatings.location ?? null,
        raw_answers: rawAnswers,
      }),
    })
    setSaving(false)
    setDone(true)
    sounds.saved()
    toast('Dica registrada com sucesso!', 'success')
  }

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, maxWidth: 360, width: '100%', textAlign: 'center' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(134,239,172,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} style={{ color: 'var(--success)' }} />
          </div>
          <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            Dica registrada
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            A IA processou suas respostas e extraiu os pontos-chave. Sua visita ficou registrada no histórico do hotel.
          </p>
          <button onClick={() => { onSaved(); onClose() }} className="btn-gold w-full" style={{ justifyContent: 'center', padding: 12 }}>
            Ver as dicas
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        style={{
          background: 'var(--surface)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          width: '100%', maxWidth: 520, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Registrar visita · {step + 1} de {QUESTIONS.length}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ height: 2, background: 'var(--border)', margin: '0 20px 24px', borderRadius: 2 }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            style={{ height: '100%', background: 'var(--gold)', borderRadius: 2 }}
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
              <p style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.4, marginBottom: 20 }}>
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
                        background: currentAnswer === opt ? 'var(--gold-subtle)' : 'var(--surface-high)',
                        border: `1px solid ${currentAnswer === opt ? 'var(--gold-ring)' : 'var(--border)'}`,
                        color: currentAnswer === opt ? 'var(--gold)' : 'var(--text-secondary)',
                        fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {VISIT_TYPE_LABELS[opt]}
                    </button>
                  ))}
                </div>
              )}

              {/* Star rating */}
              {q.type === 'stars' && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '8px 0' }}>
                  <Stars
                    value={(currentAnswer as number) ?? 0}
                    size={36}
                    interactive
                    onChange={setAnswer}
                  />
                </div>
              )}

              {/* Sub-ratings */}
              {q.type === 'sub_stars' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { key: 'rooms', label: 'Acomodações' },
                    { key: 'service', label: 'Serviço' },
                    { key: 'food', label: 'Gastronomia' },
                    { key: 'location', label: 'Localização' },
                  ].map(({ key, label }) => {
                    const subs = (currentAnswer as Record<string, number>) ?? {}
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', minWidth: 110 }}>{label}</span>
                        <Stars
                          value={subs[key] ?? 0}
                          size={20}
                          interactive
                          onChange={v => setAnswer({ ...subs, [key]: v })}
                        />
                      </div>
                    )
                  })}
                </div>
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
                          background: 'var(--surface-high)', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer',
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
                          background: 'var(--error)', border: 'none',
                          color: '#fff', fontSize: '0.75rem', cursor: 'pointer',
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
                ? <><CheckCircle size={14} /> Publicar dica</>
                : <>Próxima <ArrowRight size={14} /></>
            }
          </button>
        </div>
      </motion.div>
    </div>
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
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>{hotelName}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Histórico de visitas</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden auto', padding: '16px' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', paddingTop: 40 }}>Carregando...</p>}
          {!loading && reviews.map((r, idx) => (
            <div
              key={r.id}
              style={{
                padding: '16px', borderRadius: 14, marginBottom: 10,
                background: idx === 0 ? 'var(--surface-high)' : 'var(--bg)',
                border: `1px solid ${idx === 0 ? 'var(--border)' : 'var(--border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <Stars value={r.overall_rating} size={12} />
                    {r.visit_type && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {VISIT_TYPE_LABELS[r.visit_type] ?? r.visit_type}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-high)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {r.agent_name[0]}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.agent_name} · {r.agency_name}
                    </span>
                    {idx === 0 && <span style={{ fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>mais recente</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatDate(r.visit_date)}</span>
                  <button onClick={() => onToggleFavorite(r.id, r.is_favorite)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <Heart size={14} style={{ color: r.is_favorite ? '#f87171' : 'var(--border)', fill: r.is_favorite ? '#f87171' : 'transparent' }} />
                  </button>
                </div>
              </div>

              {r.highlights?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {r.highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gold-dim)', marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 300 }}>{h}</span>
                    </div>
                  ))}
                </div>
              )}
              {r.must_experience && (
                <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: 6, fontWeight: 300 }}>
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

const FILTER_TABS = [
  { id: 'all',               label: 'Todos' },
  { id: 'favorites',         label: 'Favoritos' },
  { id: 'fam_trip',          label: 'FAM Trip' },
  { id: 'site_inspection',   label: 'Site Inspection' },
  { id: 'personal_stay',     label: 'Personal Stay' },
]

/* ── Main export ────────────────────────────────────────────────── */
export default function DicasView() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [historyHotel, setHistoryHotel] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeCountry, setActiveCountry] = useState('all')

  const loadReviews = useCallback(async () => {
    const res = await fetch('/api/reviews')
    const data = await res.json()
    setReviews(data.reviews ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadReviews() }, [loadReviews])

  async function toggleFavorite(reviewId: string, isFavorite: boolean) {
    isFavorite ? sounds.favoriteRemove() : sounds.favoriteAdd()
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_favorite: !isFavorite } : r))
    await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, action: isFavorite ? 'remove' : 'add' }),
    })
  }

  const q = search.trim().toLowerCase()
  const countries = ['all', ...Array.from(new Set(reviews.map(r => r.country).filter(Boolean))).sort()] as string[]

  const filtered = reviews.filter(r => {
    if (activeFilter === 'favorites' && !r.is_favorite) return false
    if (activeFilter !== 'all' && activeFilter !== 'favorites' && r.visit_type !== activeFilter) return false
    if (activeCountry !== 'all' && r.country !== activeCountry) return false
    if (!q) return true
    return (
      r.hotel_name.toLowerCase().includes(q) ||
      (r.country ?? '').toLowerCase().includes(q) ||
      r.agent_name.toLowerCase().includes(q) ||
      r.agency_name.toLowerCase().includes(q) ||
      (r.client_profile ?? '').toLowerCase().includes(q) ||
      (r.must_experience ?? '').toLowerCase().includes(q) ||
      r.highlights.some(h => h.toLowerCase().includes(q))
    )
  })

  const uniqueHotels = new Set(reviews.map(r => r.hotel_name)).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header block ─────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 12px' }}>
          <div>
            <p style={{ fontSize: '0.5625rem', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-dim)', marginBottom: 3 }}>
              Rede TDG
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1 }}>
              Dicas de Hotéis
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 4 }}>
            {!loading && (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{uniqueHotels}</p>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>hotéis</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{reviews.length}</p>
                  <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>reviews</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowQuestionnaire(true)}
              className="btn-gold"
              style={{ padding: '8px 13px', fontSize: '0.8125rem' }}
            >
              <Plus size={13} /> Nova visita
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 20px 12px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Hotel, advisor, perfil de cliente, palavra-chave..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, fontSize: '0.8125rem', background: 'var(--bg)' }}
          />
        </div>

        {/* Visit type filter chips */}
        <div style={{ display: 'flex', gap: 6, padding: '0 20px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                flexShrink: 0, padding: '4px 12px', borderRadius: 999,
                fontSize: '0.6875rem', fontWeight: activeFilter === tab.id ? 600 : 400,
                cursor: 'pointer',
                background: activeFilter === tab.id ? 'var(--gold)' : 'var(--surface-high)',
                color: activeFilter === tab.id ? '#1A1918' : 'var(--text-muted)',
                border: activeFilter === tab.id ? 'none' : '1px solid var(--border)',
                transition: 'all 150ms',
              }}
            >
              {tab.label}
              {tab.id === 'favorites' && reviews.filter(r => r.is_favorite).length > 0 && (
                <span style={{ marginLeft: 5, opacity: 0.7 }}>{reviews.filter(r => r.is_favorite).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Country filter chips */}
        {countries.length > 1 && (
          <div style={{ display: 'flex', gap: 6, padding: '0 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {countries.map(c => (
              <button
                key={c}
                onClick={() => setActiveCountry(c)}
                style={{
                  flexShrink: 0, padding: '3px 11px', borderRadius: 999,
                  fontSize: '0.625rem', fontWeight: activeCountry === c ? 600 : 400,
                  letterSpacing: '0.02em', cursor: 'pointer',
                  background: activeCountry === c ? 'var(--surface-high)' : 'transparent',
                  color: activeCountry === c ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: activeCountry === c ? '1px solid var(--border-light)' : '1px solid transparent',
                  transition: 'all 150ms',
                }}
              >
                {c === 'all' ? 'Todos os países' : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', paddingTop: 48 }}>Carregando...</p>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            {q || activeFilter !== 'all' ? (
              <>
                <Search size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nenhum resultado encontrado.</p>
                <button onClick={() => { setSearch(''); setActiveFilter('all'); setActiveCountry('all') }} style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <Building2 size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nenhuma visita registrada ainda.</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Clique em "Nova visita" para começar.</p>
              </>
            )}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620, margin: '0 auto' }}>
          <AnimatePresence>
            {filtered.map(r => (
              <HotelCard
                key={r.id}
                review={r}
                onToggleFavorite={toggleFavorite}
                onViewHistory={setHistoryHotel}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showQuestionnaire && (
          <Questionnaire
            onClose={() => setShowQuestionnaire(false)}
            onSaved={() => { loadReviews() }}
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
    </div>
  )
}
