'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Loader2, Lightbulb, AlertTriangle } from 'lucide-react'
import TdgIconSprite from '@/components/TdgIconSprite'
import CopyLinkButton from '@/components/CopyLinkButton'

/* ── Types ──────────────────────────────────────────────────────── */
interface KnowledgeTip {
  id: string
  title: string
  content: string
  source_author: string
  source_date: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

/* ── Tip card ───────────────────────────────────────────────────── */
function TipCard({ tip, highlightId }: { tip: KnowledgeTip; highlightId?: string | null }) {
  const isHighlighted = !!highlightId && tip.id === highlightId
  const [expanded, setExpanded] = useState(isHighlighted)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isHighlighted) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect if tip is a warning/critical tip
  const isAlert = /⚠️|NÃO|exige|proibido|impede|risco|atenção|jurídico|greve/i.test(tip.content ?? '')

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: 'var(--tdgflow-surface)',
        border: isHighlighted ? '1.5px solid var(--tdgflow-navy)' : `1px solid ${isAlert ? '#fca5a5' : 'var(--tdgflow-border)'}`,
        borderLeft: `3px solid ${isAlert ? '#dc2626' : 'var(--tdgflow-navy-dim)'}`,
        boxShadow: isHighlighted ? '0 0 0 3px var(--tdgflow-navy-subtle)' : 'none',
        borderRadius: 10,
        padding: '13px 15px',
        cursor: 'pointer',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={e => { if (!isHighlighted) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { if (!isHighlighted) e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {isAlert
          ? <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          : <Lightbulb size={14} style={{ color: 'var(--tdgflow-navy-dim)', flexShrink: 0, marginTop: 1 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', lineHeight: 1.3, marginBottom: 5 }}>
            {tip.title}
          </p>
          <p style={{
            fontSize: '0.75rem', color: '#2d4a52', lineHeight: 1.5,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: expanded ? 'visible' : 'hidden',
          }}>
            {tip.content}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={9} style={{ color: 'var(--tdgflow-text-muted)' }} />
          <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.04em' }}>
            {tip.source_author ?? 'TDG Knowledge Base'}
            {tip.source_date && <span style={{ opacity: 0.7 }}> · {formatDate(tip.source_date)}</span>}
          </span>
        </div>
        <CopyLinkButton path={`/flow/destinos?tipId=${tip.id}`} label={`Dica: ${tip.title}`} size={12} />
      </div>
    </motion.div>
  )
}

/* ── Main export ────────────────────────────────────────────────────
   Fase 4 da reorganização de caixinhas: "Dicas de Destino" morava dentro
   de Rede/Contatos (achado do arquiteto — conhecimento fragmentado numa
   tela cujo header se chamava "Contatos"). Vira item próprio na navegação.
   Fonte de dado agora é /api/knowledge-tips (separado do Contact Hub, que
   ficou só com contatos de pessoas/fornecedores em /api/hotel-contacts). */
export default function DestinosView() {
  const searchParams = useSearchParams()
  const highlightTipId = searchParams.get('tipId')
  const [tips, setTips] = useState<KnowledgeTip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    const res = await fetch(`/api/knowledge-tips?${params}`)
    const data = await res.json()
    setTips(data.tips ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TdgIconSprite />

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 10px' }}>
          <div>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-navy-dim)', marginBottom: 3 }}>
              <svg style={{ width: 10, height: 10, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                <use href="#i-compass" />
              </svg>
              Direto do WhatsApp
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4 }}>
              TDG Knowledge Base
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>
              Conhecimento prático por país e destino: vistos, costumes, avisos
            </p>
          </div>
          {!loading && (
            <div style={{ textAlign: 'right', paddingTop: 4 }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{total || tips.length}</p>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>dicas</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px 12px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Destino, país, ou tema (ex: golpe, aéreo, pandemia)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, fontSize: '0.8125rem', background: 'var(--tdgflow-bg)' }}
          />
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, color: 'var(--tdgflow-text-muted)' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.875rem' }}>Carregando...</span>
          </div>
        )}

        {!loading && tips.length === 0 && total === 0 && !search && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb size={20} style={{ color: 'var(--tdgflow-text-muted)' }} />
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>Conhecimento da rede em reprocessamento</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--tdgflow-text-muted)', maxWidth: 340, lineHeight: 1.5 }}>
              A base de dicas por destino está passando por uma nova depuração antes de voltar pra cá. Assim que sair, notas e avisos práticos por país aparecem nesta tela.
            </p>
          </div>
        )}

        {!loading && tips.length === 0 && (search || total > 0) && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Search size={24} style={{ color: 'var(--tdgflow-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)' }}>Nenhuma dica encontrada.</p>
            {search && (
              <button onClick={() => setSearch('')}
                style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--tdgflow-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpar filtro
              </button>
            )}
          </div>
        )}

        {!loading && tips.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {tips.map(tip => <TipCard key={tip.id} tip={tip} highlightId={highlightTipId} />)}
            </AnimatePresence>
          </div>
        )}

        {!loading && tips.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', opacity: 0.6, letterSpacing: '0.08em', marginTop: 24, marginBottom: 8 }}>
            FONTE · DIRETO DO WHATSAPP · SET 2024 – MAR 2026
          </p>
        )}
      </div>
    </div>
  )
}
