'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Pencil, Trash2, Loader2, Search, ShieldQuestion } from 'lucide-react'
import TagInput from '@/components/TagInput'

/* Fase 6 — fila de confirmação (decisões #14-16 do plano TDG Knowledge
   Base). Um componente, dois usos:
   - scope="mine"  embutido em DicasView/DestinosView, escopado a 1 tipo de
     conteúdo — "você disse isso, confirma?"
   - scope="admin" na aba Rede TDG do Billing, os dois tipos juntos — fila
     de fallback pra quem ainda não tem conta no Flow com nome batendo. */

export interface PendingItem {
  id: string
  content_type: 'review' | 'knowledge'
  title: string
  source_author: string
  source_date: string
  // review
  heads_up?: string | null
  must_experience?: string | null
  client_profile?: string | null
  highlights?: string[]
  // knowledge
  content?: string | null
  country?: string | null
  tags?: string[]
  knowledge_type?: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EditFields({ item, onChange }: { item: PendingItem; onChange: (fields: Record<string, unknown>) => void }) {
  if (item.content_type === 'knowledge') {
    const [title, setTitle] = useState(item.title)
    const [content, setContent] = useState(item.content ?? '')
    const [country, setCountry] = useState(item.country ?? '')
    const [tags, setTags] = useState<string[]>(item.tags ?? [])
    useEffect(() => {
      onChange({ title, content, country: country || null, tags })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, content, country, tags])
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: '0.8125rem' }} placeholder="Título" />
        <textarea className="input" value={content} onChange={e => setContent(e.target.value)} rows={3} style={{ fontSize: '0.8125rem', resize: 'vertical' }} placeholder="Conteúdo" />
        <input className="input" value={country} onChange={e => setCountry(e.target.value)} style={{ fontSize: '0.8125rem' }} placeholder="País (opcional)" />
        <TagInput value={tags} onChange={setTags} />
      </div>
    )
  }

  const [highlightsText, setHighlightsText] = useState((item.highlights ?? []).join('\n'))
  const [clientProfile, setClientProfile] = useState(item.client_profile ?? '')
  const [mustExperience, setMustExperience] = useState(item.must_experience ?? '')
  const [headsUp, setHeadsUp] = useState(item.heads_up ?? '')
  useEffect(() => {
    onChange({
      highlights: highlightsText.split('\n').map(t => t.trim()).filter(Boolean),
      client_profile: clientProfile || null,
      must_experience: mustExperience || null,
      heads_up: headsUp || null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightsText, clientProfile, mustExperience, headsUp])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea className="input" value={highlightsText} onChange={e => setHighlightsText(e.target.value)} rows={3} style={{ fontSize: '0.8125rem', resize: 'vertical' }} placeholder="Destaques — 1 por linha" />
      <input className="input" value={clientProfile} onChange={e => setClientProfile(e.target.value)} style={{ fontSize: '0.8125rem' }} placeholder="Perfil de cliente ideal" />
      <input className="input" value={mustExperience} onChange={e => setMustExperience(e.target.value)} style={{ fontSize: '0.8125rem' }} placeholder="Experiência que ninguém deve perder" />
      <textarea className="input" value={headsUp} onChange={e => setHeadsUp(e.target.value)} rows={2} style={{ fontSize: '0.8125rem', resize: 'vertical' }} placeholder="Ressalvas / cuidados" />
    </div>
  )
}

export function QueueCard({ item, onActed, claimedName }: { item: PendingItem; onActed: () => void; claimedName?: string }) {
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState<Record<string, unknown>>({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState<'approve' | 'delete' | 'save' | null>(null)

  useEffect(() => {
    if (!confirmingDelete) return
    const t = setTimeout(() => setConfirmingDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmingDelete])

  async function act(action: string, fields?: Record<string, unknown>) {
    setBusy(action === 'approve' ? 'approve' : action === 'delete' ? 'delete' : 'save')
    await fetch('/api/pending-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // claimed_name segue em toda ação, não só a primeira — o servidor
      // reavalia autoria a cada chamada, nunca confia num "claim" anterior
      // guardado só no client.
      body: JSON.stringify({ id: item.id, content_type: item.content_type, action, fields, claimed_name: claimedName }),
    })
    setBusy(null)
    onActed()
  }

  const snippet = item.content_type === 'knowledge'
    ? item.content
    : [item.heads_up, item.must_experience, item.client_profile].filter(Boolean).join(' · ')

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', borderRadius: 10, padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '1px 6px', borderRadius: 999,
              color: item.content_type === 'review' ? '#0369a1' : '#6d28d9',
              background: item.content_type === 'review' ? '#e0f2fe' : '#ede9fe',
            }}>
              {item.content_type === 'review' ? 'Review' : 'Conhecimento'}
            </span>
            <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)' }}>
              {item.source_author} · {formatDate(item.source_date)}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3 }}>{item.title}</p>
        </div>
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <EditFields item={item} onChange={setEditFields} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => act('edit', editFields).then(() => setEditing(false))}
              disabled={busy !== null}
              className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px', flex: 1 }}
            >
              {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Salvar edição
            </button>
            <button onClick={() => setEditing(false)} style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)', borderRadius: 8, color: 'var(--tdgflow-text-muted)', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {snippet && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{snippet}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => act('approve')}
              disabled={busy !== null}
              className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px', flex: 1 }}
            >
              {busy === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Aprovar
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy !== null}
              style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)', borderRadius: 8, color: 'var(--tdgflow-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Pencil size={12} /> Editar
            </button>
            <button
              onClick={() => confirmingDelete ? act('delete') : setConfirmingDelete(true)}
              disabled={busy !== null}
              style={{
                fontSize: '0.75rem', padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                background: confirmingDelete ? 'var(--tdgflow-error)' : 'var(--tdgflow-bg)',
                border: confirmingDelete ? 'none' : '1px solid var(--tdgflow-border)',
                color: confirmingDelete ? '#fff' : 'var(--tdgflow-text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {busy === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {confirmingDelete ? 'confirmar?' : 'Excluir'}
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}

interface Props {
  scope: 'admin' | 'mine'
  contentType?: 'review' | 'knowledge'
  title?: string
  emptyHint?: string
}

export default function PendingConfirmationQueue({ scope, contentType, title, emptyHint }: Props) {
  const [items, setItems] = useState<PendingItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  const load = useCallback(async (nextOffset: number) => {
    setLoading(true)
    const params = new URLSearchParams({ scope, limit: String(LIMIT), offset: String(nextOffset) })
    if (search.trim()) params.set('search', search.trim())
    const res = await fetch(`/api/pending-content?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    const filtered = contentType ? (data.items ?? []).filter((i: PendingItem) => i.content_type === contentType) : (data.items ?? [])
    setItems(prev => nextOffset === 0 ? filtered : [...prev, ...filtered])
    setTotal(contentType ? (contentType === 'review' ? data.total_reviews : data.total_knowledge) : data.total)
    setLoading(false)
  }, [scope, search, contentType])

  useEffect(() => { setOffset(0); load(0) }, [load])

  function handleActed() {
    setOffset(0)
    load(0)
  }

  // scope="mine" só existe quando há algo de fato (3ª seção condicional,
  // mesmo padrão de GuestRequestsPanel — nunca ocupa espaço permanente por
  // um estado raro). scope="admin" é fixo na tela (Rede TDG), sempre mostra
  // seu próprio loading/empty.
  if (scope === 'mine' && (loading || items.length === 0) && !search) return null

  return (
    <div style={{ marginBottom: scope === 'mine' ? 24 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ShieldQuestion size={14} style={{ color: 'var(--tdgflow-gold-dim)', flexShrink: 0 }} />
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', flex: 1 }}>
          {title ?? 'Aguardando confirmação'}
        </p>
        {total > 0 && (
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--tdgflow-gold-dim)', background: 'var(--tdgflow-gold-subtle)', borderRadius: 20, padding: '2px 8px' }}>
            {total}
          </span>
        )}
      </div>

      {scope === 'admin' && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)' }} />
          <input
            className="input" placeholder="Buscar por título ou autor..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, fontSize: '0.8125rem' }}
          />
        </div>
      )}

      {loading && items.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 8, color: 'var(--tdgflow-text-muted)' }}>
          <Loader2 size={14} className="animate-spin" /> <span style={{ fontSize: '0.8125rem' }}>Carregando...</span>
        </div>
      )}

      {!loading && items.length === 0 && search && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', textAlign: 'center', padding: '16px 0' }}>Nada encontrado.</p>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {items.map(item => <QueueCard key={`${item.content_type}-${item.id}`} item={item} onActed={handleActed} />)}
          </AnimatePresence>
        </div>
      )}

      {items.length < total && !loading && (
        <button
          onClick={() => { const next = offset + LIMIT; setOffset(next); load(next) }}
          style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)', borderRadius: 8, cursor: 'pointer' }}
        >
          Carregar mais ({total - items.length} restantes)
        </button>
      )}
    </div>
  )
}
