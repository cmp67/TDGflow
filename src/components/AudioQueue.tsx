'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mic, Clock, CheckCircle, Loader, FileText, Play, X, ChevronDown, ChevronUp, Pencil, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { sounds } from '@/lib/sounds'

interface AudioItem {
  id: string
  agent_name: string
  interlocutor_name?: string
  interlocutor_company?: string
  visit_type: string
  status: 'pending' | 'processing' | 'transcribed' | 'confirmed'
  audio_url?: string
  transcript?: string
  summary?: { hotel_name?: string; commission_rate?: number; highlights?: string[]; notes?: string; [key: string]: unknown }
  created_at: string
  transcribe_error?: string
}

interface Props {
  onClose: () => void
}

const STATUS_CONFIG = {
  pending:     { label: 'Pendente',      color: { color: 'var(--text-muted)',  background: 'var(--surface-high)' },        icon: Clock },
  processing:  { label: 'Transcrevendo', color: { color: 'var(--gold)', background: 'var(--gold-subtle)' },          icon: Loader },
  transcribed: { label: 'Transcrito',    color: { color: 'var(--warning)', background: 'rgba(251,191,36,0.10)' },       icon: FileText },
  confirmed:   { label: 'Confirmado',    color: { color: 'var(--success)', background: 'rgba(134,239,172,0.10)' },      icon: CheckCircle },
}

export default function AudioQueue({ onClose }: Props) {
  const [items, setItems] = useState<AudioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/audio-queue')
    const data = await res.json()
    setItems(data.items)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function transcribe(id: string) {
    setTranscribing(prev => new Set(prev).add(id))
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing', transcribe_error: undefined } : i))

    const res = await fetch('/api/audio-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    setTranscribing(prev => { const s = new Set(prev); s.delete(id); return s })

    if (data.transcript) {
      sounds.transcribed()
      setItems(prev => prev.map(i => i.id === id
        ? { ...i, status: 'transcribed', transcript: data.transcript, summary: data.summary }
        : i))
    } else {
      sounds.error()
      const errorMsg = data.error
        ? data.error.includes('audio_url')
          ? 'Áudio não encontrado no servidor.'
          : data.error.includes('429') || data.error.toLowerCase().includes('quota')
            ? 'Cota da API de transcrição esgotada. Verifique o plano OpenAI.'
            : `Erro: ${data.error.slice(0, 90)}`
        : 'Falha na transcrição.'
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'pending', transcribe_error: errorMsg } : i))
    }
  }

  async function transcribeAll() {
    const pending = items.filter(i => i.status === 'pending')
    for (const item of pending) await transcribe(item.id)
  }

  function startEdit(item: AudioItem) {
    setEditing(item.id)
    setEditName(item.interlocutor_name ?? '')
    setEditCompany(item.interlocutor_company ?? '')
  }

  async function saveEdit(id: string) {
    setSavingEdit(true)
    await fetch('/api/audio-queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, interlocutor_name: editName, interlocutor_company: editCompany }),
    })
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, interlocutor_name: editName, interlocutor_company: editCompany }
      : i))
    setSavingEdit(false)
    setEditing(null)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const pendingCount = items.filter(i => i.status === 'pending').length

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Fila de Áudios</h2>
            {pendingCount > 0 && (
              <span className="badge badge-warning">{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button onClick={transcribeAll} className="btn-gold" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
                <Play size={11} className="fill-current" /> Transcrever todos ({pendingCount})
              </button>
            )}
            <button onClick={onClose} className="btn-ghost" style={{ padding: '4px', border: 'none' }}>
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Carregando...</p>}
          {!loading && items.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Nenhum áudio registrado ainda.</p>
          )}

          <AnimatePresence>
            {items.map(item => {
              const cfg = STATUS_CONFIG[item.status]
              const Icon = cfg.icon
              const isExpanded = expanded === item.id
              const isTranscribing = transcribing.has(item.id)
              const isEditingThis = editing === item.id

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {/* Row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-high)' }}>
                      <Mic size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditingThis ? (
                        <div className="flex flex-col gap-1.5">
                          <input
                            className="input"
                            style={{ padding: '5px 10px', fontSize: '0.8125rem' }}
                            placeholder="Nome do interlocutor"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            autoFocus
                          />
                          <input
                            className="input"
                            style={{ padding: '5px 10px', fontSize: '0.8125rem' }}
                            placeholder="Hotel / Empresa"
                            value={editCompany}
                            onChange={e => setEditCompany(e.target.value)}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.interlocutor_name
                              ? <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.interlocutor_name}</span>
                              : <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Sem interlocutor</span>
                            }
                            {item.interlocutor_company && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {item.interlocutor_company}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.agent_name}</span>
                            <span style={{ color: 'var(--border-light)' }}>·</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</span>
                          </div>
                        </>
                      )}

                      {/* Error message */}
                      {item.transcribe_error && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <AlertCircle size={11} style={{ color: 'var(--error)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.6875rem', color: 'var(--error)' }}>{item.transcribe_error}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Edit / Save buttons */}
                      {isEditingThis ? (
                        <>
                          <button
                            onClick={() => saveEdit(item.id)}
                            disabled={savingEdit}
                            className="btn-gold"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            {savingEdit ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                            Salvar
                          </button>
                          <button onClick={() => setEditing(null)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg" style={cfg.color}>
                            <Icon size={11} className={isTranscribing ? 'animate-spin' : ''} />
                            {cfg.label}
                          </span>

                          <button
                            onClick={() => startEdit(item)}
                            className="btn-ghost"
                            style={{ padding: '4px 6px', border: 'none' }}
                            title="Editar"
                          >
                            <Pencil size={13} style={{ color: 'var(--text-muted)' }} />
                          </button>

                          {item.status === 'pending' && !isTranscribing && (
                            <button onClick={() => transcribe(item.id)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                              Transcrever
                            </button>
                          )}

                          {(item.status === 'transcribed' || item.status === 'confirmed') && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : item.id)}
                              className="btn-ghost"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--gold)' }}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isExpanded ? 'Fechar' : 'Resumo'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded summary */}
                  <AnimatePresence>
                    {isExpanded && item.summary && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-high)' }}>
                          {item.summary.hotel_name && (
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Hotel:</span>{' '}{item.summary.hotel_name}
                            </p>
                          )}
                          {item.summary.commission_rate && (
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Comissão:</span>{' '}
                              <span style={{ color: 'var(--gold)' }}>{item.summary.commission_rate}%</span>
                            </p>
                          )}
                          {Array.isArray(item.summary.highlights) && item.summary.highlights.length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Destaques</p>
                              {item.summary.highlights.map((h, i) => (
                                <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>· {h}</p>
                              ))}
                            </div>
                          )}
                          {item.summary.notes && (
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{item.summary.notes}</p>
                          )}
                          {item.transcript && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>Ver transcrição completa</summary>
                              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.transcript}</p>
                            </details>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
