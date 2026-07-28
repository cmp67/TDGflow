'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Link2, Play, Trash2, Plus, X, Loader2, ExternalLink, AlertCircle,
} from 'lucide-react'

interface Material {
  id: string
  category: 'contrato_acordo' | 'formulario' | 'treinamento' | 'outro'
  title: string
  description: string | null
  kind: 'file' | 'link'
  file_url: string | null
  link_url: string | null
  source_note: string | null
  created_by: string
  created_at: string
}

const CATEGORY_LABELS: Record<Material['category'], string> = {
  contrato_acordo: 'Contratos/Acordos',
  formulario: 'Formulários',
  treinamento: 'Treinamento',
  outro: 'Outro',
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Todos' },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
] as const

function MaterialIcon({ m }: { m: Material }) {
  if (m.category === 'treinamento' && m.kind === 'link') return <Play size={15} />
  if (m.kind === 'link') return <Link2 size={15} />
  return <FileText size={15} />
}

export default function MaterialsTab() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [category, setCategory] = useState<Material['category']>('formulario')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [kind, setKind] = useState<'file' | 'link'>('link')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [materialsRes, contextRes, sessionRes] = await Promise.all([
      fetch('/api/materials'),
      fetch('/api/context'),
      fetch('/api/auth/session'),
    ])
    const materialsData = await materialsRes.json()
    const contextData = await contextRes.json()
    const sessionData = await sessionRes.json().catch(() => null)
    setMaterials(materialsData.materials ?? [])
    setIsAdmin(!!contextData.is_admin)
    setUserEmail(sessionData?.user?.email ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setCategory('formulario'); setTitle(''); setDescription(''); setSourceNote('')
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
    if (sourceNote.trim()) fd.append('source_note', sourceNote.trim())
    if (kind === 'link') fd.append('link_url', linkUrl.trim())
    if (kind === 'file' && file) fd.append('file', file)

    const res = await fetch('/api/materials', { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error ?? 'Erro ao salvar material.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setShowAddForm(false)
    resetForm()
    load()
  }

  async function handleDelete(id: string) {
    setMaterials(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/materials?id=${id}`, { method: 'DELETE' })
  }

  const filtered = activeCategory === 'all'
    ? materials
    : materials.filter(m => m.category === activeCategory)

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
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="btn-gold"
          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
        >
          <Plus size={13} /> Adicionar material
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>Novo material</p>
            <button type="button" onClick={() => { setShowAddForm(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          <select className="input" value={category} onChange={e => setCategory(e.target.value as Material['category'])} style={{ fontSize: '0.8125rem' }}>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>

          <input className="input" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: '0.8125rem' }} />
          <textarea className="input" placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }} />
          <input className="input" placeholder="Atribuição/fonte (opcional — ex: Fonte: Protur Brasil)" value={sourceNote} onChange={e => setSourceNote(e.target.value)} style={{ fontSize: '0.8125rem' }} />

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
            <input className="input" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} style={{ fontSize: '0.8125rem' }} />
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
            {submitting ? 'Salvando...' : 'Salvar material'}
          </button>
        </form>
      )}

      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--tdgflow-text-muted)', fontSize: '0.875rem', padding: '32px 0' }}>Carregando...</p>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 8 }}>
          <FileText size={22} style={{ color: 'var(--tdgflow-text-muted)' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nenhum material nesta categoria ainda.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
                borderRadius: 8, background: i % 2 === 0 ? 'var(--tdgflow-surface)' : 'var(--tdgflow-bg)',
              }}
            >
              <div style={{ color: 'var(--tdgflow-navy)', marginTop: 1, flexShrink: 0 }}>
                <MaterialIcon m={m} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>{m.title}</p>
                {m.description && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{m.description}</p>
                )}
                {m.source_note && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--tdgflow-text-faint)', marginTop: 3, fontStyle: 'italic' }}>{m.source_note}</p>
                )}
              </div>
              <a
                href={m.file_url ?? m.link_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 500, color: 'var(--tdgflow-navy)', flexShrink: 0, marginTop: 2 }}
              >
                Abrir <ExternalLink size={11} />
              </a>
              {(isAdmin || m.created_by === userEmail) && (
                <button
                  onClick={() => handleDelete(m.id)}
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
