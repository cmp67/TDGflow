'use client'

/* "Como faço" (porte do Trip Flow, 16/10/2026) — a Carla escreve, a rede lê. Uma página, um
   campo de busca, uma lista agrupada por área. Sem modal, sem paginação.
   Deep-link por slug (/flow/faq/<slug>) é a URL que vai pro WhatsApp.
   O estado vazio é o estado principal da v1: "não achei" gera trabalho
   acionável pra Carla, não uma métrica. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Search, Plus, Pencil, X, Check, Loader2, Link as LinkIcon } from 'lucide-react'
import { FAQ_AREAS, FAQ_AREA_LABELS, GLOSSARY_AREA, matchesFaq, type FaqArea, type FaqItem, type FaqRequest } from '@/lib/faq'

const md = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.7, margin: '0 0 10px' }} {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul style={{ paddingLeft: 20, margin: '0 0 10px', listStyle: 'disc' }} {...props} />,
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => <ol style={{ paddingLeft: 20, margin: '0 0 10px', listStyle: 'decimal' }} {...props} />,
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => <li style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.7, marginBottom: 3 }} {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong style={{ color: 'var(--tdgflow-text-primary)', fontWeight: 600 }} {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', margin: '14px 0 6px' }} {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', margin: '12px 0 6px' }} {...props} />,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => <div style={{ overflowX: 'auto', margin: '0 0 10px' }}><table style={{ borderCollapse: 'collapse', fontSize: '0.8125rem' }} {...props} /></div>,
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--tdgflow-border)', color: 'var(--tdgflow-text-primary)' }} {...props} />,
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--tdgflow-border)', color: 'var(--tdgflow-text-secondary)' }} {...props} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a style={{ color: 'var(--tdgflow-navy)' }} {...props} />,
}

type Draft = { id: string | null; requestId: string | null; pergunta: string; resposta_md: string; area: FaqArea; publicado: boolean; ordem: number }
const emptyDraft = (): Draft => ({ id: null, requestId: null, pergunta: '', resposta_md: '', area: 'geral', publicado: true, ordem: 0 })

const smallBtn: React.CSSProperties = { fontSize: '0.75rem', padding: '6px 12px' }
const linkBtn: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }

export default function FaqView({ items, requests, isAdmin, initialSlug }: {
  items: FaqItem[]; requests: FaqRequest[]; isAdmin: boolean; initialSlug?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [openSlug, setOpenSlug] = useState<string | null>(initialSlug ?? null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askText, setAskText] = useState('')
  const [asked, setAsked] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const openRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { if (initialSlug && openRef.current) openRef.current.scrollIntoView({ block: 'start' }) }, [initialSlug])

  const filtered = useMemo(() => items.filter(i => matchesFaq(i, query)), [items, query])
  const grouped = useMemo(() => FAQ_AREAS.map(a => ({ area: a, items: filtered.filter(i => i.area === a) })).filter(g => g.items.length > 0), [filtered])

  async function save() {
    if (!draft) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(draft.id ? `/api/faq/${draft.id}` : '/api/faq', {
        method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: draft.pergunta, resposta_md: draft.resposta_md, area: draft.area, publicado: draft.publicado, ordem: draft.ordem, request_id: draft.requestId ?? undefined }),
      })
      const data = await res.json() as { item?: FaqItem; error?: string }
      if (!res.ok || !data.item) { setError(data.error ?? 'Erro ao salvar.'); return }
      setDraft(null); setOpenSlug(data.item.slug); router.refresh()
    } catch { setError('Serviço indisponível.') }
    finally { setSaving(false) }
  }

  async function discard(id: string) {
    await fetch(`/api/faq/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'descartada' }) })
    router.refresh()
  }

  async function ask() {
    setError(null)
    const res = await fetch('/api/faq/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pergunta: askText, contexto: query || null }) })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setError(data.error ?? 'Erro ao enviar.'); return }
    setAsked(true); setAskText('')
  }

  async function copyLink(slug: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/flow/faq/${slug}`); setCopied(slug); setTimeout(() => setCopied(null), 1500) } catch { /* sem clipboard, sem drama */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden auto' }}>
      <div style={{ maxWidth: 820, width: '100%', margin: '0 auto', padding: '20px 16px 48px' }}>
        <p style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-accent-warm)', marginBottom: 4 }}>Travel Designers Group</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>Como faço</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', marginBottom: 16 }}>Perguntas, respostas e os termos do TDG Flow. Não achou? Pergunte no fim da página.</p>
          </div>
          {isAdmin && !draft && (
            <button className="btn-gold" style={smallBtn} onClick={() => setDraft(emptyDraft())}><Plus size={12} /> Nova pergunta</button>
          )}
        </div>

        {isAdmin && requests.length > 0 && !draft && (
          <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 12, background: 'var(--tdgflow-accent-warm-subtle)', border: '1px solid var(--tdgflow-accent-warm)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tdgflow-accent-warm)', marginBottom: 8 }}>
              {requests.length} pergunta{requests.length > 1 ? 's' : ''} da rede sem resposta
            </p>
            {requests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--tdgflow-border)' }}>
                <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--tdgflow-text-primary)' }}>{r.pergunta} <span style={{ color: 'var(--tdgflow-text-muted)', fontSize: '0.6875rem' }}>· {r.created_by}</span></span>
                <button style={linkBtn} onClick={() => setDraft({ ...emptyDraft(), pergunta: r.pergunta, requestId: r.id })}><Pencil size={11} /> Responder</button>
                <button style={{ ...linkBtn, color: 'var(--tdgflow-text-muted)' }} onClick={() => void discard(r.id)}>Descartar</button>
              </div>
            ))}
          </div>
        )}

        {draft && (
          <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-navy-ring)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Pergunta, como a equipe faria (ex: Como registro uma condição comercial?)" value={draft.pergunta} onChange={e => setDraft({ ...draft, pergunta: e.target.value })} maxLength={200} style={{ fontSize: '0.875rem' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="input" value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value as FaqArea })} style={{ fontSize: '0.75rem', width: 200 }}>
                {FAQ_AREAS.map(a => <option key={a} value={a}>{FAQ_AREA_LABELS[a]}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)' }}>
                <input type="checkbox" checked={draft.publicado} onChange={e => setDraft({ ...draft, publicado: e.target.checked })} /> Publicada
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              <textarea className="input" placeholder="Resposta, em markdown simples (negrito com **, listas com -, tabelas com |)" value={draft.resposta_md} onChange={e => setDraft({ ...draft, resposta_md: e.target.value })} rows={12} style={{ fontSize: '0.8125rem', resize: 'vertical', fontFamily: 'ui-monospace, monospace' }} />
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px dashed var(--tdgflow-border)', minHeight: 120 }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Prévia</p>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{draft.resposta_md || '_Nada ainda._'}</ReactMarkdown>
              </div>
            </div>
            {error && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-gold" style={smallBtn} disabled={saving} onClick={() => void save()}>{saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvar</button>
              <button className="btn-ghost" style={smallBtn} onClick={() => { setDraft(null); setError(null) }}><X size={12} /> Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: 18 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--tdgflow-text-muted)' }} />
          <input className="input" autoFocus={!initialSlug} placeholder="Busque por palavra: Lumis, selo, blacklist, Max…" value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 34, fontSize: '0.875rem', width: '100%' }} />
        </div>

        {items.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', padding: '12px 0' }}>Ainda não há perguntas respondidas.</p>
        )}
        {items.length > 0 && grouped.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', padding: '12px 0' }}>Nada com &quot;{query}&quot;. Pergunte abaixo — a resposta entra aqui.</p>
        )}

        {grouped.map(g => (
          <section key={g.area} id={`area-${g.area}`} style={{ marginBottom: 22 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-navy)', marginBottom: 8 }}>{FAQ_AREA_LABELS[g.area]}</p>
            {g.area === GLOSSARY_AREA ? (
              /* Glossário: definição não é pergunta — lista alfabética, sem acordeão. */
              <div style={{ borderRadius: 12, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', padding: '4px 14px' }}>
                {[...g.items].sort((a, b) => a.pergunta.localeCompare(b.pergunta)).map(item => (
                  <div key={item.id} ref={openSlug === item.slug ? openRef : null} style={{ padding: '10px 0', borderBottom: '1px solid var(--tdgflow-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{item.pergunta}</span>
                      {!item.publicado && <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', border: '1px dashed var(--tdgflow-border)', borderRadius: 999, padding: '1px 8px' }}>não publicado</span>}
                      {isAdmin && <button style={{ ...linkBtn, fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }} onClick={() => setDraft({ id: item.id, requestId: null, pergunta: item.pergunta, resposta_md: item.resposta_md, area: item.area, publicado: item.publicado, ordem: item.ordem })}><Pencil size={10} /> Editar</button>}
                    </div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{item.resposta_md}</ReactMarkdown>
                  </div>
                ))}
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.items.map(item => {
                const open = openSlug === item.slug
                return (
                  <div key={item.id} ref={open ? openRef : null} style={{ borderRadius: 12, border: `1px solid ${open ? 'var(--tdgflow-navy-ring)' : 'var(--tdgflow-border)'}`, background: 'var(--tdgflow-surface)' }}>
                    <button onClick={() => setOpenSlug(open ? null : item.slug)} aria-expanded={open} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: '0.9375rem', fontWeight: open ? 600 : 500, color: 'var(--tdgflow-text-primary)' }}>{item.pergunta}</span>
                      {!item.publicado && <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', border: '1px dashed var(--tdgflow-border)', borderRadius: 999, padding: '2px 8px' }}>não publicada</span>}
                    </button>
                    {open && (
                      <div style={{ padding: '0 14px 12px' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{item.resposta_md}</ReactMarkdown>
                        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                          <button style={linkBtn} onClick={() => void copyLink(item.slug)}><LinkIcon size={11} /> {copied === item.slug ? 'Link copiado' : 'Copiar link'}</button>
                          {isAdmin && <button style={linkBtn} onClick={() => setDraft({ id: item.id, requestId: null, pergunta: item.pergunta, resposta_md: item.resposta_md, area: item.area, publicado: item.publicado, ordem: item.ordem })}><Pencil size={11} /> Editar</button>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )}
          </section>
        ))}

        <div style={{ marginTop: 28, padding: '14px 16px', borderRadius: 12, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', marginBottom: 4 }}>Não achei o que procurava</p>
          {asked ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>Registrado. A resposta entra aqui assim que for escrita.</p>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', marginBottom: 8 }}>Escreva a dúvida como você a faria a uma colega da rede. Ela vai para quem escreve as respostas.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="input" value={askText} onChange={e => setAskText(e.target.value)} placeholder="Ex: Como vejo o histórico de uma condição comercial?" maxLength={200} style={{ flex: 1, minWidth: 220, fontSize: '0.8125rem' }} />
                <button className="btn-gold" style={smallBtn} onClick={() => void ask()} disabled={askText.trim().length < 5}>Enviar</button>
              </div>
              {error && !draft && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)', marginTop: 6 }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
