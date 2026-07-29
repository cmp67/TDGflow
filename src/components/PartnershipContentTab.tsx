'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Link2, Video, Megaphone, Trash2, Plus, X, Loader2, ExternalLink, AlertCircle,
} from 'lucide-react'

interface PartnershipContent {
  id: string
  category: 'documento' | 'video_ata' | 'comunicado'
  title: string
  description: string | null
  kind: 'file' | 'link'
  file_url: string | null
  link_url: string | null
  created_by: string
  created_at: string
}

const CATEGORY_LABELS: Record<PartnershipContent['category'], string> = {
  documento: 'Documentos da parceria',
  video_ata: 'Vídeos & atas de reunião',
  comunicado: 'Comunicados & roadmap',
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Todos' },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
] as const

function ContentIcon({ c }: { c: PartnershipContent }) {
  if (c.category === 'video_ata') return <Video size={15} />
  if (c.category === 'comunicado') return <Megaphone size={15} />
  if (c.kind === 'link') return <Link2 size={15} />
  return <FileText size={15} />
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PartnershipContentTab() {
  const [items, setItems] = useState<PartnershipContent[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [category, setCategory] = useState<PartnershipContent['category']>('comunicado')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'file' | 'link'>('link')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [contentRes, contextRes] = await Promise.all([
      fetch('/api/partnership-content'),
      fetch('/api/context'),
    ])
    const contentData = await contentRes.json()
    const contextData = await contextRes.json()
    setItems(contentData.content ?? [])
    setIsAdmin(!!contextData.is_admin)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setCategory('comunicado'); setTitle(''); setDescription('')
    setKind('link'); setLinkUrl(''); setFile(null); setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!title.trim()) { setFormError('Título é obrigatório.'); return }
    if (kind === 'link' && !linkUrl.trim()) { setFormError('Informe o link.'); return }
    if (kind === 'file' && !file) { setFormError('Selecione um arquivo.'); return }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('category', category)
    fd.append('title', title.trim())
    if (description.trim()) fd.append('description', description.trim())
    if (kind === 'link') fd.append('link_url', linkUrl.trim())
    if (kind === 'file' && file) fd.append('file', file)

    const res = await fetch('/api/partnership-content', { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error ?? 'Erro ao salvar.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setShowAddForm(false)
    resetForm()
    load()
  }

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/partnership-content?id=${id}`, { method: 'DELETE' })
  }

  const filtered = activeCategory === 'all'
    ? items
    : items.filter(c => c.category === activeCategory)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                padding: '4px 11px', borderRadius: 999, fontSize: '0.7rem', fontWeight: activeCategory === tab.id ? 600 : 400,
                cursor: 'pointer', transition: 'all 150ms',
                background: activeCategory === tab.id ? 'var(--tdgflow-navy)' : 'var(--tdgflow-surface)',
                color: activeCategory === tab.id ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-secondary)',
                border: activeCategory === tab.id ? '1px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="btn-gold"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          >
            <Plus size={13} /> Publicar conteúdo
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>Novo conteúdo</p>
            <button type="button" onClick={() => { setShowAddForm(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          <select className="input" value={category} onChange={e => setCategory(e.target.value as PartnershipContent['category'])} style={{ fontSize: '0.8125rem' }}>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>

          <input className="input" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: '0.8125rem' }} />
          <textarea className="input" placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 6 }}>
            {(['link', 'file'] as const).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer',
                  background: kind === k ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-bg)',
                  border: kind === k ? '1.5px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
                  color: kind === k ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)',
                }}
              >
                {k === 'link' ? 'Link externo' : 'Arquivo (upload)'}
              </button>
            ))}
          </div>

          {kind === 'link' ? (
            <input className="input" placeholder="https://... (vídeo, drive, ata)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} style={{ fontSize: '0.8125rem' }} />
          ) : (
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: '0.8125rem' }} />
          )}

          {formError && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--tdgflow-error)' }}>
              <AlertCircle size={13} /> {formError}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-gold" style={{ fontSize: '0.8125rem', padding: '8px 12px' }}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {submitting ? 'Salvando...' : 'Publicar'}
          </button>
        </form>
      )}

      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem', padding: '32px 0' }}>Carregando...</p>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 8 }}>
          <FileText size={22} style={{ color: 'var(--tdgflow-text-muted)' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nada publicado nesta categoria ainda.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
                borderRadius: 8, background: i % 2 === 0 ? 'var(--tdgflow-surface)' : 'var(--tdgflow-bg)',
              }}
            >
              <div style={{ color: 'var(--tdgflow-navy)', marginTop: 1, flexShrink: 0 }}>
                <ContentIcon c={c} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>{c.title}</p>
                {c.description && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{c.description}</p>
                )}
                <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-faint)', marginTop: 3 }}>
                  Publicado em {formatDate(c.created_at)}
                </p>
              </div>
              <a
                href={c.file_url ?? c.link_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 500, color: 'var(--tdgflow-navy)', flexShrink: 0, marginTop: 2 }}
              >
                Abrir <ExternalLink size={11} />
              </a>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-faint)', flexShrink: 0, marginTop: 2 }}
                  title="Remover"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
