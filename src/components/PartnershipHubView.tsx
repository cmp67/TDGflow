'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUp, Plus, X, CheckCircle2, Paperclip } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import PartnershipContentTab from '@/components/PartnershipContentTab'

/* ── Ícones próprios — traço só (regra de personalidade Bemgsy) pros
   marcadores de status/tipo de sugestão. Utilitários (fechar, adicionar,
   seta, check de concluído) continuam lucide. ──────────────────────── */
function IconPending({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
    </svg>
  )
}
function IconInProgress({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
    </svg>
  )
}
function IconImprovement({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M9.5 15.5L4 21M14 4l1.3 3.3L18.5 8.5 15.2 9.8 14 13l-1.3-3.3L9.5 8.5l3.2-1.3z" /><circle cx="18" cy="17" r="3" />
    </svg>
  )
}
function IconNewFeature({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" /><path d="M19 15l.7 2.2L22 18l-2.3.8L19 21l-.7-2.2L16 18l2.3-.8z" />
    </svg>
  )
}
function IconSuggest({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.7h5.6c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3z" />
    </svg>
  )
}
function IconBugReport({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 9v4M12 16.5v.01M10.3 3.9L2.7 17.5c-.6 1 .1 2.3 1.3 2.3h16c1.2 0 1.9-1.3 1.3-2.3L13.7 3.9c-.6-1.1-2.2-1.1-2.8 0z" />
    </svg>
  )
}

interface Suggestion {
  id: number
  title: string
  description: string
  type: 'improvement' | 'new_feature' | 'bug_report'
  impact: number
  status: 'pending' | 'in_progress' | 'done'
  votes: number
  voted: boolean
  created_at: string
  screenshot_url?: string | null
}

const STATUS_CONFIG = {
  pending:     { color: 'var(--tdgflow-text-muted)', bg: 'var(--tdgflow-surface-high)', icon: IconPending },
  in_progress: { color: 'var(--tdgflow-navy)', bg: 'var(--tdgflow-navy-subtle)', icon: IconInProgress },
  done:        { color: 'var(--tdgflow-success)', bg: 'var(--tdgflow-success-subtle)', icon: CheckCircle2 },
} as const

const TYPE_CONFIG = {
  improvement: { color: 'var(--tdgflow-accent-info)', bg: 'var(--tdgflow-accent-info-subtle)', icon: IconImprovement },
  new_feature: { color: 'var(--tdgflow-accent-warm)', bg: 'var(--tdgflow-accent-warm-subtle)', icon: IconNewFeature },
  bug_report:  { color: 'var(--tdgflow-error)', bg: 'var(--tdgflow-error-subtle)', icon: IconBugReport },
} as const

function ImpactDots({ value, interactive, onChange }: { value: number; interactive?: boolean; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => interactive && onChange?.(n)}
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: n <= value ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border)',
            border: 'none', padding: 0,
            cursor: interactive ? 'pointer' : 'default',
            transition: 'background 150ms',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins  = Math.floor(diff / 60000)
  if (lang === 'en') {
    if (days > 30) return `${Math.floor(days / 30)}mo ago`
    if (days > 0)  return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${mins}m ago`
  }
  if (days > 30) return `há ${Math.floor(days / 30)} mês`
  if (days > 0)  return `há ${days}d`
  if (hours > 0) return `há ${hours}h`
  return `há ${mins}m`
}

export default function PartnershipHubView({ userRole }: { userRole: string }) {
  const { lang } = useLanguage()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'documentos' | 'board' | 'roadmap'>('documentos')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [type, setType]         = useState<'improvement' | 'new_feature' | 'bug_report'>('improvement')
  const [impact, setImpact]     = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [votingId, setVotingId] = useState<number | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = userRole === 'admin'

  const L = {
    pt: {
      title: 'Linha Direta Bemgsy',
      subtitle: 'Documentos, atas e roadmap da parceria — e onde você sugere melhorias',
      documentos: 'Documentos & atas',
      board: 'Sugestões',
      roadmap: 'Roadmap',
      suggest: 'Sugerir ou reportar',
      formTitle: 'Nova sugestão de melhoria',
      formTitleBug: 'Reportar um problema',
      titleLabel: 'Título',
      titlePh: 'Resumo da sua ideia',
      titlePhBug: 'O que aconteceu, resumido em poucas palavras',
      descLabel: 'Descrição',
      descPh: 'Que problema resolve? Que contexto tem?',
      descPhBug: 'O que você esperava que acontecesse, e o que aconteceu no lugar? Onde estava quando viu isso?',
      typeLabel: 'Tipo',
      improvement: 'Melhoria de funcionalidade',
      new_feature: 'Nova funcionalidade',
      bug_report: 'Problema/erro',
      screenshotLabel: 'Print do erro (opcional)',
      screenshotPick: 'Escolher imagem',
      screenshotChange: 'Trocar imagem',
      screenshotTooBig: 'Imagem excede 8MB — comprima e tente novamente',
      impactLabel: 'Impacto no seu dia a dia',
      impactHint: (v: number) => ['', 'Quase sem impacto', 'Pouco impacto', 'Impacto moderado', 'Alto impacto', 'Mudaria tudo'][v],
      cancel: 'Cancelar',
      submit: 'Enviar sugestão',
      submitBug: 'Enviar problema',
      empty: 'Nenhuma sugestão ainda. Seja o primeiro!',
      emptyRoadmap: 'Nada em andamento ainda.',
      votes: 'votos',
      impactScore: 'Impacto',
      statusPending: 'Sugerido',
      statusProgress: 'Em curso',
      statusDone: 'Concluído',
      statusPendingBug: 'Pendente',
      statusProgressBug: 'Investigando',
      statusDoneBug: 'Resolvido',
    },
    en: {
      title: 'Bemgsy Direct Line',
      subtitle: 'Partnership docs, meeting notes and roadmap — plus where you suggest improvements',
      documentos: 'Docs & meeting notes',
      board: 'Suggestions',
      roadmap: 'Roadmap',
      suggest: 'Suggest or report',
      formTitle: 'New suggestion',
      formTitleBug: 'Report a bug',
      titleLabel: 'Title',
      titlePh: 'Brief summary of your idea',
      titlePhBug: 'What happened, in a few words',
      descLabel: 'Description',
      descPh: 'What problem does it solve?',
      descPhBug: 'What did you expect to happen, and what happened instead? Where were you when you saw it?',
      typeLabel: 'Type',
      improvement: 'Feature improvement',
      new_feature: 'New feature',
      bug_report: 'Bug/error',
      screenshotLabel: 'Error screenshot (optional)',
      screenshotPick: 'Choose image',
      screenshotChange: 'Change image',
      screenshotTooBig: 'Image exceeds 8MB — compress it and try again',
      impactLabel: 'Impact on your workflow',
      impactHint: (v: number) => ['', 'Minimal impact', 'Low impact', 'Moderate impact', 'High impact', 'Game changer'][v],
      cancel: 'Cancel',
      submit: 'Submit',
      submitBug: 'Submit report',
      empty: 'No suggestions yet. Be the first!',
      emptyRoadmap: 'Nothing in progress yet.',
      votes: 'votes',
      impactScore: 'Impact',
      statusPending: 'Suggested',
      statusProgress: 'In progress',
      statusDone: 'Done',
      statusPendingBug: 'Pending',
      statusProgressBug: 'Investigating',
      statusDoneBug: 'Resolved',
    },
  }
  const lx = lang === 'en' ? L.en : L.pt

  const statusLabel = (s: string, t: Suggestion['type']) => {
    if (t === 'bug_report') {
      return s === 'in_progress' ? lx.statusProgressBug : s === 'done' ? lx.statusDoneBug : lx.statusPendingBug
    }
    return s === 'in_progress' ? lx.statusProgress : s === 'done' ? lx.statusDone : lx.statusPending
  }

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => { setSuggestions(d.suggestions ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // "Lido" ≠ "resolvido" (achado da Carla, 21/08) — abrir a Linha Direta
  // como admin marca os bug_reports pendentes como vistos, some do badge
  // da sidebar sem esperar alguém mudar o status pra "Investigando"/"Resolvido".
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_bug_reports_viewed' }),
    }).catch(() => {})
  }, [isAdmin])

  async function handleVote(id: number) {
    if (votingId) return
    setVotingId(id)
    try {
      const res  = await fetch('/api/suggestions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'vote' }) })
      const data = await res.json()
      if (res.ok) setSuggestions(prev => prev.map(s => s.id === id ? { ...s, votes: data.suggestion.votes, voted: data.voted } : s))
    } finally { setVotingId(null) }
  }

  async function handleStatusChange(id: number, status: string) {
    setStatusUpdating(id)
    try {
      const res  = await fetch('/api/suggestions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'status', status }) })
      const data = await res.json()
      if (res.ok) setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: data.suggestion.status } : s))
    } finally { setStatusUpdating(null) }
  }

  function resetForm() {
    setTitle(''); setDescription(''); setType('improvement'); setImpact(3); setShowForm(false)
    setScreenshotFile(null); setScreenshotPreview(null)
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    setSubmitting(true); setError('')
    try {
      let screenshot_url: string | null = null
      if (type === 'bug_report' && screenshotFile) {
        const fd = new FormData()
        fd.append('image', screenshotFile)
        const upRes  = await fetch('/api/suggestions/screenshot', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) { setError(upData.error ?? 'Erro ao enviar imagem'); setSubmitting(false); return }
        screenshot_url = upData.screenshot_url
      }

      const res  = await fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, type, impact, screenshot_url }) })
      const data = await res.json()
      if (res.ok) {
        setSuggestions(prev => [data.suggestion, ...prev])
        resetForm()
      } else { setError(data.error ?? 'Erro ao enviar') }
    } finally { setSubmitting(false) }
  }

  function handleScreenshotPick(file: File | null) {
    if (!file) { setScreenshotFile(null); setScreenshotPreview(null); return }
    if (file.size > 8 * 1024 * 1024) { setError(lx.screenshotTooBig); return }
    setError('')
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const board   = suggestions.filter(s => s.status === 'pending')
  const roadmap = suggestions.filter(s => s.status === 'in_progress' || s.status === 'done')
  const displayed = tab === 'board' ? board : roadmap

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F5F8FA' }}>

      {/* Header */}
      <div className="flex-shrink-0" style={{ background: 'var(--tdgflow-surface)', borderBottom: '1px solid var(--tdgflow-border)', padding: '24px 28px 0' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {lx.title}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>{lx.subtitle}</p>
          </div>
          {tab === 'board' && (
            <button
              onClick={() => { setShowForm(true); setError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}
            >
              <Plus size={14} />{lx.suggest}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex">
          {(['documentos', 'board', 'roadmap'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--tdgflow-navy)' : '2px solid transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', transition: 'all 150ms', marginBottom: -1 }}
            >
              {t === 'documentos' ? lx.documentos : t === 'board' ? lx.board : lx.roadmap}
              {t !== 'documentos' && (
                <span style={{ marginLeft: 6, fontSize: '0.65rem', background: tab === t ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface-high)', color: tab === t ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', borderRadius: 10, padding: '1px 6px', fontWeight: 600 }}>
                  {t === 'board' ? board.length : roadmap.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Submit form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(17,38,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--tdgflow-surface)', borderRadius: 16, width: '100%', maxWidth: 500, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <IconSuggest size={18} style={{ color: 'var(--tdgflow-navy)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>{type === 'bug_report' ? lx.formTitleBug : lx.formTitle}</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 4 }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lx.titleLabel}</label>
                <input
                  value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'bug_report' ? lx.titlePhBug : lx.titlePh} maxLength={120}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--tdgflow-border)', borderRadius: 8, padding: '10px 12px', fontSize: '0.9375rem', color: 'var(--tdgflow-text-primary)', background: 'var(--tdgflow-bg)', outline: 'none' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lx.descLabel}</label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'bug_report' ? lx.descPhBug : lx.descPh} rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--tdgflow-border)', borderRadius: 8, padding: '10px 12px', fontSize: '0.9375rem', color: 'var(--tdgflow-text-primary)', background: 'var(--tdgflow-bg)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lx.typeLabel}</label>
                <div className="flex gap-2">
                  {(['improvement', 'new_feature', 'bug_report'] as const).map(t => {
                    const cfg = TYPE_CONFIG[t]
                    const Icon = cfg.icon
                    const selected = type === t
                    const label = t === 'improvement' ? lx.improvement : t === 'new_feature' ? lx.new_feature : lx.bug_report
                    return (
                      <button
                        key={t} type="button" onClick={() => setType(t)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 8, border: selected ? `1.5px solid ${cfg.color}` : '1.5px solid var(--tdgflow-border)', background: selected ? cfg.bg : 'var(--tdgflow-bg)', cursor: 'pointer', transition: 'all 150ms' }}
                      >
                        <Icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: selected ? 600 : 400, color: selected ? cfg.color : 'var(--tdgflow-text-muted)', lineHeight: 1.3 }}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Screenshot — só pra "Problema/erro" */}
              {type === 'bug_report' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lx.screenshotLabel}</label>
                  <input
                    ref={screenshotInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleScreenshotPick(e.target.files?.[0] ?? null)}
                  />
                  {screenshotPreview ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotPreview} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--tdgflow-border)' }} />
                      <div className="flex flex-col gap-1.5 items-start">
                        <button type="button" onClick={() => screenshotInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--tdgflow-navy)', padding: 0 }}>
                          {lx.screenshotChange}
                        </button>
                        <button type="button" onClick={() => handleScreenshotPick(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', padding: 0 }}>
                          {lx.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button" onClick={() => screenshotInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, border: '1px dashed var(--tdgflow-border)', background: 'var(--tdgflow-bg)', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}
                    >
                      <Paperclip size={13} />{lx.screenshotPick}
                    </button>
                  )}
                </div>
              )}

              {/* Impact */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lx.impactLabel}</label>
                <div className="flex items-center gap-3">
                  <ImpactDots value={impact} interactive onChange={setImpact} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', fontStyle: 'italic' }}>{lx.impactHint(impact)}</span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', marginTop: 6 }}>
                  {lang === 'en' ? '1 = minimal · 5 = game changer' : '1 = pouco · 5 = mudaria tudo'}
                </p>
              </div>

              {error && <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-error)' }}>{error}</p>}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--tdgflow-border)', background: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>
                  {lx.cancel}
                </button>
                <button
                  onClick={handleSubmit} disabled={submitting || !title.trim() || !description.trim()}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: submitting || !title.trim() || !description.trim() ? 'var(--tdgflow-border-light)' : 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  {submitting ? '…' : type === 'bug_report' ? lx.submitBug : lx.submit}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 28px' }}>
        {tab === 'documentos' ? (
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <PartnershipContentTab />
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem' }}>Carregando…</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem' }}>{tab === 'board' ? lx.empty : lx.emptyRoadmap}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680, margin: '0 auto' }}>
            {displayed.map((s, idx) => {
              const sCfg = STATUS_CONFIG[s.status]
              const tCfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.improvement
              const StatusIcon = sCfg.icon
              const TypeIcon   = tCfg.icon
              const isTop = tab === 'board' && idx === 0 && s.votes > 0
              return (
                <div
                  key={s.id}
                  style={{
                    background: 'var(--tdgflow-surface)',
                    borderRadius: 12,
                    border: isTop ? '1.5px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 14,
                    position: 'relative',
                    transition: 'box-shadow 150ms',
                  }}
                >
                  {isTop && (
                    <div style={{ position: 'absolute', top: -1, left: 16, background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '0 0 6px 6px' }}>
                      {lang === 'en' ? 'Top voted' : 'Mais votado'}
                    </div>
                  )}

                  {/* Vote */}
                  <div className="flex-shrink-0" style={{ marginTop: isTop ? 10 : 0 }}>
                    <button
                      onClick={() => handleVote(s.id)} disabled={votingId === s.id}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 10px', borderRadius: 8, border: s.voted ? '1.5px solid var(--tdgflow-navy)' : '1.5px solid var(--tdgflow-border)', background: s.voted ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-bg)', cursor: votingId === s.id ? 'not-allowed' : 'pointer', transition: 'all 150ms', minWidth: 44 }}
                    >
                      <ChevronUp size={14} style={{ color: s.voted ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: s.voted ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-primary)', lineHeight: 1 }}>{s.votes}</span>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0" style={{ marginTop: isTop ? 10 : 0 }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3, margin: 0 }}>{s.title}</h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Type badge */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: tCfg.bg, color: tCfg.color, borderRadius: 20, padding: '3px 8px', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                          <TypeIcon size={9} />
                          {s.type === 'new_feature' ? lx.new_feature : s.type === 'bug_report' ? lx.bug_report : lx.improvement}
                        </span>
                        {/* Status badge */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: sCfg.bg, color: sCfg.color, borderRadius: 20, padding: '3px 8px', fontSize: '0.625rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <StatusIcon size={9} />
                          {statusLabel(s.status, s.type)}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5, margin: '0 0 10px' }}>{s.description}</p>

                    {s.screenshot_url && (
                      <a href={s.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: 10 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.screenshot_url} alt="" style={{ maxHeight: 120, borderRadius: 8, border: '1px solid var(--tdgflow-border)', display: 'block' }} />
                      </a>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ImpactDots value={s.impact} />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)' }}>
                          {lx.impactScore} {s.impact}/5
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-border-light)' }}>·</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)' }}>{timeAgo(s.created_at, lang)}</span>
                      </div>
                      {isAdmin && (
                        <select
                          value={s.status} disabled={statusUpdating === s.id}
                          onChange={e => handleStatusChange(s.id, e.target.value)}
                          style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer' }}
                        >
                          <option value="pending">{statusLabel('pending', s.type)}</option>
                          <option value="in_progress">{statusLabel('in_progress', s.type)}</option>
                          <option value="done">{statusLabel('done', s.type)}</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
