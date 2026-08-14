'use client'

import { useEffect, useState } from 'react'
import { Loader, BookOpen, FileText, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface WikiPage {
  id: string
  category: string
  title: string
  content: string
  meeting_date: string | null
  order_index: number
  updated_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  guia: 'Guias',
  ata: 'Atas de Reunião',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function WikiView() {
  const [pages, setPages] = useState<WikiPage[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/wiki')
      const data = await res.json()
      if (res.ok) {
        setPages(data.pages)
        if (data.pages.length > 0) setActiveId(data.pages[0].id)
      } else {
        setLoadError(data.error ?? 'Erro ao carregar o wiki.')
      }
    })()
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = (pages ?? []).filter(p =>
    !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
  )

  const grouped = filtered.reduce<Record<string, WikiPage[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p)
    return acc
  }, {})

  const active = (pages ?? []).find(p => p.id === activeId) ?? null

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div className="mb-5">
        <p className="section-label mb-1">Base de conhecimento interna</p>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
          <BookOpen size={19} style={{ color: 'var(--tdgflow-gold)' }} />
          Wiki TDG Flow
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Guias de uso e atas das reuniões da rede — tudo num só lugar.
        </p>
      </div>

      {loadError && <p className="text-xs" style={{ color: 'var(--tdgflow-error)' }}>{loadError}</p>}

      {pages === null && !loadError && (
        <div className="flex items-center justify-center py-10">
          <Loader size={18} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
        </div>
      )}

      {pages && pages.length === 0 && (
        <div className="card text-sm" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Ainda não há páginas no wiki.
        </div>
      )}

      {pages && pages.length > 0 && (
        <div className="flex gap-5 items-start" style={{ flexWrap: 'wrap' }}>

          {/* Sidebar — lista agrupada por categoria */}
          <div style={{ width: 260, flexShrink: 0 }} className="space-y-4">
            <div className="relative">
              <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--tdgflow-text-muted)' }} />
              <input
                className="input"
                placeholder="Buscar no wiki…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: 30, fontSize: '0.8125rem' }}
              />
            </div>

            {Object.entries(grouped).map(([cat, catPages]) => (
              <div key={cat}>
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--tdgflow-text-muted)' }}>
                  {CATEGORY_LABELS[cat] ?? cat} ({catPages.length})
                </p>
                <div className="space-y-1">
                  {catPages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setActiveId(p.id)}
                      className="w-full text-left"
                      style={{
                        display: 'block', padding: '8px 10px', borderRadius: 10,
                        background: p.id === activeId ? 'var(--tdgflow-navy-subtle)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{
                          color: p.id === activeId ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)',
                          fontWeight: p.id === activeId ? 600 : 400,
                        }}
                      >
                        {p.title}
                      </span>
                      {p.meeting_date && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
                          {formatDate(p.meeting_date)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>Nada encontrado.</p>
            )}
          </div>

          {/* Conteúdo */}
          <div className="card flex-1" style={{ minWidth: 320, padding: '28px 32px' }}>
            {active ? (
              <article key={active.id} className="wiki-content">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} style={{ color: 'var(--tdgflow-gold)' }} />
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tdgflow-text-muted)' }}>
                    {CATEGORY_LABELS[active.category] ?? active.category}
                    {active.meeting_date && ` · ${formatDate(active.meeting_date)}`}
                  </p>
                </div>
                <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>
                  {active.title}
                </h2>
                <div className="prose-dark text-sm leading-relaxed">
                  <ReactMarkdown>{active.content}</ReactMarkdown>
                </div>
              </article>
            ) : (
              <p className="text-sm" style={{ color: 'var(--tdgflow-text-muted)' }}>Selecione uma página.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
