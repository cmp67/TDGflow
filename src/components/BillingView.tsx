'use client'

import React, { useState, useEffect } from 'react'
import {
  Zap, Mic, Globe, Brain, Database, HardDrive, Bot,
  Users, Coins, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowUp, ArrowDown, Minus, LayoutGrid, Activity,
  ChevronDown, ChevronUp, Sparkles, Scale, ArrowRightLeft, Send,
} from 'lucide-react'
import { TIERS, CREDIT_COSTS, type TierId } from '@/lib/credits'
import MyLumisTopUp from '@/components/billing/MyLumisTopUp'
import AgencySubscriptionCard from '@/components/billing/AgencySubscriptionCard'
import { fetchPendingGuestRequests, reviewGuestRequest, type PendingGuestRequest } from '@/lib/guest-access-client'
import StatBlock from '@/components/ui/StatBlock'

// ── Helpers ───────────────────────────────────────────────────────────────────

function numFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Data types ────────────────────────────────────────────────────────────────

interface MyUsageData {
  totalThisMonth: number
  prevMonthTotal: number
  byAction: { action_type: string; credits_used: number }[]
  daily: { day: string; credits: number }[]
}

interface AgencyRow { agency: string; usedThisMonth: number }

interface QuotaData {
  quota: number; consumed: number; returned: number
  remaining: number; topup: number; pool: number; period: string
}

interface CreditData {
  // Self-service fields — present only when the caller has an agency_id of
  // their own (see /api/credits GET). Admins without an agency (all 4
  // existing admin accounts today) get these as `undefined`.
  balance?: { balance: number; tier: TierId }
  creditsThisMonth?: number
  dailyUsage?: { day: string; requests: number }[]
  byUser?: { advisor_name: string | null; user_email: string; credits_used: number }[]
  purchases?: { amount: number; meta: { tier: string; note?: string }; created_at: string }[]
  // Admin-only, cross-agency fields — independent of the caller's own agency.
  lumiSettings: { mode: 'free' | 'equal'; equalTotal: number }
  agencyBreakdown: AgencyRow[]
}

// ── Service definitions ───────────────────────────────────────────────────────

type Service = {
  id: string; name: string; icon: React.ElementType
  color: string; bg: string; what: string
  tier: string; tierColor: string; tierBg: string; soon?: boolean
}
type ServiceGroup = { label: string; services: Service[] }

const SERVICE_GROUPS: ServiceGroup[] = [
  {
    label: 'Inteligências Artificiais',
    services: [
      { id: 'flow-ai', name: 'TDG Flow', icon: Brain, color: 'var(--tdgflow-accent-info)', bg: 'var(--tdgflow-accent-info-subtle)',
        what: 'Assistente inteligente — respostas, sugestões e extração de insights',
        tier: 'Por consumo', tierColor: 'var(--tdgflow-accent-warm)', tierBg: 'var(--tdgflow-accent-warm-subtle)' },
      { id: 'transcription', name: 'Transcrição de Voz', icon: Mic, color: 'var(--tdgflow-navy)', bg: 'var(--tdgflow-navy-subtle)',
        what: 'Converte gravações em texto com alta precisão',
        tier: 'Plano gratuito', tierColor: 'var(--tdgflow-success)', tierBg: 'var(--tdgflow-success-subtle)' },
      { id: 'travel-ai', name: 'Requisitos de Viagem', icon: Globe, color: '#004A7C', bg: '#E8F1F8',
        what: 'Vistos, ETAs e condições de entrada em tempo real',
        tier: 'Por consumo', tierColor: 'var(--tdgflow-accent-warm)', tierBg: 'var(--tdgflow-accent-warm-subtle)' },
    ],
  },
  {
    label: 'Infraestrutura',
    services: [
      { id: 'hosting', name: 'Hospedagem & Deploy', icon: Zap, color: '#000', bg: '#F5F5F5',
        what: 'Disponibilidade global, atualizações instantâneas',
        tier: 'Plano fixo', tierColor: 'var(--tdgflow-text-muted)', tierBg: 'var(--tdgflow-surface-high)' },
      { id: 'database', name: 'Base de Dados', icon: Database, color: '#00B388', bg: '#E6FAF5',
        what: 'Dicas, perfis, ofertas e histórico da rede TDG',
        tier: 'Plano fixo', tierColor: 'var(--tdgflow-text-muted)', tierBg: 'var(--tdgflow-surface-high)' },
      { id: 'storage', name: 'Armazenamento de Arquivos', icon: HardDrive, color: '#5C6BC0', bg: '#EEEFFD',
        what: 'Áudios das gravações dos advisors',
        tier: 'Por consumo', tierColor: 'var(--tdgflow-accent-warm)', tierBg: 'var(--tdgflow-accent-warm-subtle)' },
    ],
  },
  {
    label: 'Plataforma de Agentes',
    services: [
      { id: 'agents', name: 'Agentes Conversacionais', icon: Bot, color: '#E53935', bg: 'var(--tdgflow-error-subtle)',
        what: 'Atendimento automatizado via WhatsApp e outros canais',
        tier: 'Em integração', tierColor: 'var(--tdgflow-text-muted)', tierBg: 'var(--tdgflow-surface-high)', soon: true },
    ],
  },
]

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  chat:              { label: 'Mensagens Flow',    icon: Brain,  color: 'var(--tdgflow-accent-info)' },
  review_extraction: { label: 'Extração de dicas', icon: Zap,    color: 'var(--tdgflow-accent-warm)' },
  transcription:     { label: 'Transcrições',       icon: Mic,    color: 'var(--tdgflow-navy)' },
  travel_docs:       { label: 'Consultas de visto', icon: Globe,  color: '#004A7C' },
  scan_card:         { label: 'Scan de cartão',     icon: Bot,    color: '#E53935' },
}

// ── Buy Modal ─────────────────────────────────────────────────────────────────

function BuyModal({ currentTier, onClose, onSuccess }: {
  currentTier: TierId; onClose: () => void; onSuccess: (t: TierId) => void
}) {
  const [selected, setSelected] = useState<TierId | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleBuy() {
    if (!selected) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/credits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selected }),
      })
      if (!res.ok) throw new Error()
      onSuccess(selected)
    } catch { setError('Não foi possível processar. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(17,38,48,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--tdgflow-surface)', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: '0 0 4px' }}>Adicionar Lumis</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', margin: '0 0 18px' }}>Selecione o pacote para o saldo da rede TDG.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {TIERS.filter(t => t.credits !== null).map(t => {
            const active = selected === t.id
            const current = t.id === currentTier
            return (
              <button key={t.id} onClick={() => setSelected(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: active ? `2px solid ${t.color}` : '1.5px solid var(--tdgflow-border)', background: active ? t.bg : 'var(--tdgflow-surface)', transition: 'all 0.12s var(--tdgflow-ease-smooth)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{t.name}</span>
                    {current && <span style={{ fontSize: '0.5rem', fontWeight: 700, color: t.color, background: t.bg, borderRadius: 20, padding: '1px 6px' }}>atual</span>}
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', margin: '2px 0 0' }}>{t.label}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: t.color, margin: 0 }}>{numFmt(t.credits!)}</p>
                  <p style={{ fontSize: '0.5rem', color: 'var(--tdgflow-text-faint)', margin: '1px 0 0' }}>Lumis</p>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: '3px 0 0' }}>{t.priceLabel}</p>
                </div>
              </button>
            )
          })}
        </div>
        {error && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)', marginBottom: 10 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', fontSize: '0.875rem', color: 'var(--tdgflow-text-muted)', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
          <button onClick={handleBuy} disabled={!selected || loading} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: selected && !loading ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border-light)', color: 'var(--tdgflow-surface)', fontSize: '0.875rem', fontWeight: 600, cursor: selected && !loading ? 'pointer' : 'default', transition: 'background 0.12s var(--tdgflow-ease-smooth)' }}>
            {loading ? 'Processando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card: O que são Lumis? ────────────────────────────────────────────────────

function LumisExplainer() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('lumis_explainer_closed') !== '1' } catch { return true }
  })

  function dismiss() {
    setOpen(false)
    try { localStorage.setItem('lumis_explainer_closed', '1') } catch { /* ignore */ }
  }

  const ACTION_COSTS = [
    { icon: Brain, label: 'Mensagem para a Stella', cost: 9, color: 'var(--tdgflow-accent-info)' },
    { icon: Zap,   label: 'Extração de dica',        cost: 5, color: 'var(--tdgflow-accent-warm)' },
    { icon: Mic,   label: 'Transcrição de áudio',   cost: 2, color: 'var(--tdgflow-navy)' },
    { icon: Globe, label: 'Consulta de visto',       cost: 2, color: '#004A7C' },
  ]

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: '1px solid #D8EEF0',
      background: 'linear-gradient(135deg, #F0F9FA 0%, #FAFFFE 100%)',
      flexShrink: 0,
    }}>
      {/* Header — sempre visível */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--tdgflow-navy-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Coins size={14} style={{ color: 'var(--tdgflow-navy)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', margin: 0, lineHeight: 1.2 }}>
            O que são Lumis?
          </p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', margin: '1px 0 0' }}>
            A moeda oficial da Bemgsy — toque para {open ? 'fechar' : 'entender'}
          </p>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--tdgflow-text-faint)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--tdgflow-text-faint)', flexShrink: 0 }} />}
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #D8EEF0' }}>

          {/* Explicação lúdica */}
          <div style={{ padding: '12px 0 10px' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.65, margin: '0 0 8px', fontWeight: 300 }}>
              <strong style={{ fontWeight: 600 }}>Lumis</strong> é a moeda da <strong style={{ fontWeight: 600 }}>Bemgsy</strong> — cada ação no sistema debita Lumis do saldo da rede. Quando o saldo baixar, o admin recarrega.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', lineHeight: 1.55, margin: 0, fontWeight: 300 }}>
              O saldo é compartilhado entre todos os advisors da rede. Consulte a tabela abaixo para saber o custo de cada ação.
            </p>
          </div>

          {/* Tabela de consumo */}
          <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '4px 0 8px' }}>
            Quanto gasta cada ação
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {ACTION_COSTS.map(({ icon: Icon, label, cost, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'var(--tdgflow-surface)', borderRadius: 8, border: '1px solid var(--tdgflow-border-subtle)' }}>
                <Icon size={11} style={{ color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', flexShrink: 0 }}>{cost} lm</span>
              </div>
            ))}
          </div>

          {/* Durabilidade */}
          <div style={{ padding: '10px 12px', background: '#FEF9EE', borderRadius: 8, border: '1px solid #F5E4BA', marginBottom: 10 }}>
            <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-accent-warm)', margin: '0 0 5px' }}>
              Quanto dura o saldo?
            </p>
            <p style={{ fontSize: '0.75rem', color: '#7A4F10', lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
              Um advisor ativo consome em média <strong style={{ fontWeight: 600 }}>~500 lm/mês</strong>. Cada agência recebe <strong style={{ fontWeight: 600 }}>500 lm de cota mensal</strong> — 1 lm equivale a R$0,006 de custo real de IA.
            </p>
          </div>

          {/* Como comprar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'var(--tdgflow-navy-subtle)', borderRadius: 8, border: '1px solid #B8E0E3' }}>
            <Coins size={11} style={{ color: 'var(--tdgflow-navy)', flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-navy-dim)', margin: 0, fontWeight: 300 }}>
              Cada agência recebe uma <strong style={{ fontWeight: 600 }}>cota mensal</strong> de Lumis. Se precisar de mais, compre top-up diretamente com a Bemgsy pelo botão abaixo.
            </p>
          </div>

          {/* Fechar e não mostrar mais */}
          <button
            onClick={dismiss}
            style={{ marginTop: 10, width: '100%', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.625rem', color: 'var(--tdgflow-text-faint)', textDecoration: 'underline' }}
          >
            Entendi — não mostrar mais
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tab: Meu uso ──────────────────────────────────────────────────────────────

function TabMyUsage() {
  const [data, setData]         = useState<MyUsageData | null>(null)
  const [quota, setQuota]       = useState<QuotaData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showReturn, setShowReturn] = useState(false)
  const [returnAmt, setReturnAmt]   = useState('')
  const [returning, setReturning]   = useState(false)
  const [returnDone, setReturnDone] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/credits/me').then(r => r.json()),
      fetch('/api/credits/quota').then(r => r.json()),
    ]).then(([myData, quotaData]) => {
      setData(myData); setQuota(quotaData); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleReturn() {
    const amt = parseInt(returnAmt, 10)
    if (!amt || amt <= 0) return
    setReturning(true)
    try {
      const res = await fetch('/api/credits/quota', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const result = await res.json()
      if (result.returned > 0) {
        setReturnDone(result.returned); setReturnAmt(''); setShowReturn(false)
        setQuota(q => q ? { ...q, remaining: q.remaining - result.returned, returned: q.returned + result.returned } : q)
      }
    } finally { setReturning(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><p style={{ color: 'var(--tdgflow-text-faint)', fontSize: '0.875rem' }}>Carregando…</p></div>
  if (!data) return null

  const { totalThisMonth, prevMonthTotal, byAction, daily } = data
  const quotaPct      = quota ? Math.min(100, Math.round((quota.consumed / quota.quota) * 100)) : 0
  const quotaBarColor = quotaPct > 85 ? 'var(--tdgflow-error)' : quotaPct > 65 ? 'var(--tdgflow-accent-warm)' : 'var(--tdgflow-navy)'
  const recentDays = [...daily].reverse().slice(-14)
  const avgDay = daily.slice(0, 7).length > 0 ? Math.round(daily.slice(0, 7).reduce((s, d) => s + d.credits, 0) / daily.slice(0, 7).length) : 0
  const projectedMonth = avgDay * 30
  const diff = totalThisMonth - prevMonthTotal
  const diffPct = prevMonthTotal > 0 ? Math.round(Math.abs(diff) / prevMonthTotal * 100) : null
  const TrendIcon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus
  const trendColor = diff > 0 ? 'var(--tdgflow-accent-warm)' : diff < 0 ? 'var(--tdgflow-success)' : 'var(--tdgflow-text-faint)'
  const sparkMax = Math.max(...recentDays.map(d => d.credits), 1)

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>

      {/* Lumis explainer */}
      <LumisExplainer />

      {/* Assinatura mensal da agência (Asaas, plano Growth) */}
      <AgencySubscriptionCard />

      {/* Saldo comprado da agência (top-up self-service, via /api/credits) */}
      <MyLumisTopUp />

      {/* Cota mensal */}
      {quota && (
        <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Coins size={12} style={{ color: 'var(--tdgflow-navy)' }} />
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: 0, flex: 1 }}>
              Cota mensal — {new Date(quota.period + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Barra de consumo */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-primary)', fontWeight: 600 }}>{quota.consumed} lm usados</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)' }}>cota: {quota.quota} lm</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--tdgflow-surface-high)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${quotaPct}%`, background: quotaBarColor, borderRadius: 3, transition: 'width 0.4s var(--tdgflow-ease-smooth)' }} />
              </div>
            </div>

            {/* Status pills — "top-up" foi removido daqui de propósito: é o
                mesmo saldo (tdg_credits_balance) já mostrado, sempre
                atualizado, no card "Saldo comprado da agência" logo acima
                (MyLumisTopUp). Mostrar os dois lado a lado duplicava o
                número e um deles ficava desatualizado após uma compra. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {[
                { label: 'restantes', value: quota.remaining, color: quota.remaining > 0 ? 'var(--tdgflow-navy)' : 'var(--tdgflow-error)', bg: quota.remaining > 0 ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-error-subtle)' },
                { label: 'pool central', value: quota.pool, color: quota.pool > 0 ? 'var(--tdgflow-text-muted)' : 'var(--tdgflow-border-light)', bg: quota.pool > 0 ? 'var(--tdgflow-surface-high)' : 'var(--tdgflow-bg)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ padding: '8px 10px', background: bg, borderRadius: 8, textAlign: 'center' }}>
                  <p style={{ fontSize: '1.0625rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: '0.5rem', color: 'var(--tdgflow-text-faint)', margin: '3px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Ações — compra real de top-up agora vive no card "Saldo comprado
                da agência" abaixo (MyLumisTopUp), que chama a API de verdade
                em vez do antigo link mailto. Aqui fica só a devolução ao pool,
                que é uma ação distinta (cota central, não compra). */}
            {quota.remaining > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowReturn(r => !r)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 9, border: '1.5px solid var(--tdgflow-border)', background: showReturn ? 'var(--tdgflow-surface-high)' : 'var(--tdgflow-surface)', color: 'var(--tdgflow-text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <ArrowRightLeft size={12} />
                  Devolver ao pool
                </button>
              </div>
            )}

            {/* Formulário de devolução */}
            {showReturn && quota.remaining > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--tdgflow-bg)', borderRadius: 9, border: '1px solid var(--tdgflow-border-subtle)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', flexShrink: 0 }}>Devolver</span>
                <input
                  type="number" value={returnAmt} onChange={e => setReturnAmt(e.target.value)}
                  max={quota.remaining} min={1} placeholder={`máx ${quota.remaining} lm`}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 7, border: '1.5px solid var(--tdgflow-border)', fontSize: '0.875rem', color: 'var(--tdgflow-text-primary)', outline: 'none' }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', flexShrink: 0 }}>lm ao pool</span>
                <button
                  onClick={handleReturn} disabled={returning || !returnAmt}
                  style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', opacity: returning ? 0.6 : 1 }}
                >
                  {returning ? '…' : 'OK'}
                </button>
              </div>
            )}

            {returnDone > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-success)', background: 'var(--tdgflow-success-subtle)', borderRadius: 7, padding: '6px 10px', margin: 0 }}>
                ✓ {returnDone} lm devolvidos ao pool central da rede.
              </p>
            )}

            <p style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', margin: 0, lineHeight: 1.5 }}>
              Top-up: R$0,012/lm · 1 lm = R$0,006 custo real · Ciclo: 1 ao último dia do mês
            </p>
          </div>
        </div>
      )}

      {/* Stat blocks — soltos sobre o fundo, sem card/borda (Stripe/Linear,
          skill bemgsy-design § Benchmarks Externos): são números-chave que a
          advisor lê de cara, não uma linha de tabela/fila que precise de
          moldura pra se diferenciar de outra linha igual ao lado. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '4px 2px' }}>
        <StatBlock
          label="Este mês"
          value={numFmt(totalThisMonth)}
          unit="lm"
          helper={
            diffPct !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <TrendIcon size={10} style={{ color: trendColor }} />
                <span style={{ color: trendColor }}>{diffPct}% vs mês anterior</span>
              </div>
            ) : 'primeiro mês'
          }
        />
        <StatBlock
          label="Projeção mensal"
          value={projectedMonth > 0 ? numFmt(projectedMonth) : '—'}
          unit={projectedMonth > 0 ? 'lm' : undefined}
          helper={avgDay > 0 ? `~${avgDay} lm/dia` : 'sem dados recentes'}
        />
      </div>

      {/* Sparkline */}
      {recentDays.length > 1 && (
        <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 10px' }}>Últimos 14 dias</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
            {recentDays.map((d, i) => {
              const h = Math.max(3, Math.round((d.credits / sparkMax) * 32))
              const isLast = i === recentDays.length - 1
              return (
                <div key={d.day} title={`${new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}: ${d.credits} lm`}
                  style={{ flex: 1, height: h, borderRadius: 3, background: isLast ? 'var(--tdgflow-navy)' : 'var(--tdgflow-border-light)', transition: 'height 0.3s var(--tdgflow-ease-smooth)' }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: '0.5rem', color: 'var(--tdgflow-text-faint)' }}>
              {recentDays[0] ? new Date(recentDays[0].day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
            </span>
            <span style={{ fontSize: '0.5rem', color: 'var(--tdgflow-navy)', fontWeight: 700 }}>hoje</span>
          </div>
        </div>
      )}

      {/* By action */}
      {byAction.length > 0 ? (
        <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: 0 }}>Por tipo de uso</p>
          </div>
          <div>
            {byAction.map((row, i) => {
              const meta = ACTION_META[row.action_type] ?? { label: row.action_type, icon: Zap, color: 'var(--tdgflow-text-muted)' }
              const Icon = meta.icon
              const pct = totalThisMonth > 0 ? Math.round(row.credits_used / totalThisMonth * 100) : 0
              const cost = CREDIT_COSTS[row.action_type] ?? 1
              return (
                <div key={i} style={{ padding: '10px 16px', borderBottom: i < byAction.length - 1 ? '1px solid var(--tdgflow-border-subtle)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <Icon size={12} style={{ color: meta.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--tdgflow-text-primary)' }}>{meta.label}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)' }}>{numFmt(row.credits_used)} lm</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', width: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--tdgflow-surface-high)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 2, transition: 'width 0.4s var(--tdgflow-ease-smooth)' }} />
                    </div>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', flexShrink: 0, width: 60, textAlign: 'right' }}>
                      {Math.round(row.credits_used / cost)} {cost === 2 ? 'consultas' : cost === 10 ? 'gravações' : 'ações'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--tdgflow-bg)', borderRadius: 14, border: '1px dashed var(--tdgflow-border)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-faint)', textAlign: 'center', margin: 0 }}>Nenhum consumo registrado este mês.</p>
        </div>
      )}
    </div>
  )
}

// ── Tab: Infraestrutura ───────────────────────────────────────────────────────

function TabInfra() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {SERVICE_GROUPS.map(group => (
          <div key={group.label}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 7px' }}>
              {group.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.services.map(s => {
                const Icon = s.icon
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 12, opacity: s.soon ? 0.65 : 1 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} style={{ color: s.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{s.name}</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 600, background: s.tierBg, color: s.tierColor, borderRadius: 20, padding: '1px 6px' }}>{s.tier}</span>
                        {s.soon && <span style={{ fontSize: '0.5rem', color: 'var(--tdgflow-text-faint)', fontStyle: 'italic' }}>em breve</span>}
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.what}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ padding: '10px 14px', background: 'var(--tdgflow-bg)', borderRadius: 10, border: '1px solid var(--tdgflow-border-subtle)' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: 'var(--tdgflow-text-primary)' }}>Plano fixo</strong> — custo mensal independente do uso ·{' '}
            <strong style={{ color: 'var(--tdgflow-text-primary)' }}>Por consumo</strong> — proporcional ao volume ·{' '}
            <strong style={{ color: 'var(--tdgflow-text-primary)' }}>Gratuito</strong> — sem custo nos limites atuais
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Lumi Distribution Panel (admin) ──────────────────────────────────────────

function LumiDistribution({
  settings, breakdown, totalBalance, onRefresh,
}: {
  settings:     { mode: 'free' | 'equal'; equalTotal: number }
  breakdown:    AgencyRow[]
  totalBalance: number
  onRefresh:    () => void
}) {
  // Rascunho persistido em localStorage — trocar de aba (ou fechar o
  // navegador por engano) no meio da configuração não deve perder o que o
  // admin já digitou, só o que já foi confirmado em "Distribuir"/"Salvar".
  const DRAFT_KEY = 'tdg-flow-lumi-distribution-draft'

  function readDraft(): { mode?: 'free' | 'equal'; equalTotal?: number } {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}') } catch { return {} }
  }

  const [mode,           setModeLocal]   = useState<'free' | 'equal'>(() => readDraft().mode ?? settings.mode)
  const [equalTotal,     setEqualTotal]  = useState(() => readDraft().equalTotal ?? (settings.equalTotal || totalBalance))
  const [distribution,   setDistrib]     = useState<{ agencies: string[]; quotaEach: number } | null>(null)
  const [contributing,   setContrib]     = useState<string | null>(null)  // agency name being contributed
  const [contribAmt,     setContribAmt]  = useState('')
  const [saving,         setSaving]      = useState(false)
  const [feedback,       setFeedback]    = useState('')

  const agencyCount = breakdown.length

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ mode, equalTotal }))
  }, [mode, equalTotal])

  async function handleSetMode(m: 'free' | 'equal') {
    setSaving(true)
    await fetch('/api/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_mode', mode: m }) })
    setModeLocal(m)
    setSaving(false)
  }

  async function handleDistribute() {
    if (!equalTotal || equalTotal <= 0) return
    setSaving(true)
    const res = await fetch('/api/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'distribute', total: equalTotal }) })
    const data = await res.json()
    if (data.ok) {
      setDistrib(data)
      setFeedback(`${data.agencies.length} agências · ${data.quotaEach} lm cada`)
      window.localStorage.removeItem(DRAFT_KEY)
    }
    setSaving(false)
  }

  async function handleContribute(agency: string) {
    const amt = parseInt(contribAmt, 10)
    if (!amt || amt <= 0) return
    setSaving(true)
    await fetch('/api/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'contribute', agencyName: agency, amount: amt }) })
    setContrib(null); setContribAmt(''); setFeedback(`+${amt} lm contribuídos pela ${agency}`)
    onRefresh()
    setSaving(false)
  }

  const quotaEach = distribution?.quotaEach ?? (agencyCount > 0 && equalTotal > 0 ? Math.floor(equalTotal / agencyCount) : 0)

  return (
    <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Scale size={12} style={{ color: 'var(--tdgflow-text-secondary)' }} />
        <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-secondary)', margin: 0, flex: 1 }}>Distribuição de Lumis</p>
        {feedback && <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-success)', background: 'var(--tdgflow-success-subtle)', borderRadius: 20, padding: '2px 8px' }}>{feedback}</span>}
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Mode toggle */}
        <div>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 8px' }}>Modo de consumo</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { id: 'free',  label: 'Livre',        desc: 'Pool comum — quem chegar consome' },
              { id: 'equal', label: 'Igualitário',   desc: 'Quota igual por agência' },
            ] as const).map(m => (
              <button
                key={m.id}
                onClick={() => handleSetMode(m.id)}
                disabled={saving}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: mode === m.id ? '2px solid var(--tdgflow-text-secondary)' : '1.5px solid var(--tdgflow-border)',
                  background: mode === m.id ? 'var(--tdgflow-surface-high)' : 'var(--tdgflow-surface)',
                  transition: 'all 0.12s var(--tdgflow-ease-smooth)',
                }}
              >
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: 0 }}>{m.label}</p>
                <p style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', margin: '2px 0 0' }}>{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Equal mode config */}
        {mode === 'equal' && (
          <>
            <div>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 8px' }}>
                Total a distribuir · {agencyCount} agências ativas
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  value={equalTotal}
                  onChange={e => setEqualTotal(Number(e.target.value))}
                  min={0}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--tdgflow-border)', fontSize: '0.875rem', color: 'var(--tdgflow-text-primary)', outline: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', whiteSpace: 'nowrap' }}>lm</span>
                <button
                  onClick={handleDistribute}
                  disabled={saving || equalTotal <= 0}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--tdgflow-text-secondary)', color: 'var(--tdgflow-surface)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: saving ? 0.6 : 1 }}
                >
                  Distribuir
                </button>
              </div>
              {quotaEach > 0 && (
                <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', margin: '5px 0 0' }}>
                  → <strong>{quotaEach} lm</strong> por agência
                </p>
              )}
            </div>

            {/* Per-agency breakdown + contribute */}
            {breakdown.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 4px' }}>Por agência — este mês</p>
                {breakdown.map(row => {
                  const pct = quotaEach > 0 ? Math.min(100, Math.round((row.usedThisMonth / quotaEach) * 100)) : 0
                  const over = quotaEach > 0 && row.usedThisMonth > quotaEach
                  const remaining = Math.max(0, quotaEach - row.usedThisMonth)
                  return (
                    <div key={row.agency} style={{ borderRadius: 10, border: '1px solid var(--tdgflow-surface-high)', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.agency}</span>
                            {over && <span style={{ fontSize: '0.5rem', color: 'var(--tdgflow-error)', background: 'var(--tdgflow-error-subtle)', borderRadius: 20, padding: '1px 5px', flexShrink: 0 }}>excedeu</span>}
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--tdgflow-surface-high)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--tdgflow-error)' : pct > 75 ? 'var(--tdgflow-accent-warm)' : 'var(--tdgflow-navy)', borderRadius: 2, transition: 'width 0.3s var(--tdgflow-ease-smooth)' }} />
                          </div>
                          <p style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', margin: '3px 0 0' }}>
                            {numFmt(row.usedThisMonth)} usados {quotaEach > 0 ? `· quota ${numFmt(quotaEach)} lm` : ''}
                          </p>
                        </div>
                        {remaining > 0 && (
                          <button
                            onClick={() => { setContrib(contributing === row.agency ? null : row.agency); setContribAmt('') }}
                            title="Contribuir saldo não usado para o pool"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-bg)', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <ArrowRightLeft size={10} style={{ color: 'var(--tdgflow-text-muted)' }} />
                            <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-muted)', fontWeight: 600 }}>Contribuir</span>
                          </button>
                        )}
                      </div>
                      {contributing === row.agency && (
                        <div style={{ padding: '8px 12px', background: 'var(--tdgflow-bg)', borderTop: '1px solid var(--tdgflow-surface-high)', display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', flexShrink: 0 }}>Contribuir</span>
                          <input
                            type="number"
                            value={contribAmt}
                            onChange={e => setContribAmt(e.target.value)}
                            max={remaining}
                            min={1}
                            placeholder={`máx ${remaining} lm`}
                            style={{ flex: 1, padding: '5px 8px', borderRadius: 7, border: '1.5px solid var(--tdgflow-border)', fontSize: '0.75rem', color: 'var(--tdgflow-text-primary)', outline: 'none' }}
                          />
                          <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', flexShrink: 0 }}>lm ao pool</span>
                          <button
                            onClick={() => handleContribute(row.agency)}
                            disabled={saving || !contribAmt}
                            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Free mode — just explain */}
        {mode === 'free' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', lineHeight: 1.6, margin: 0 }}>
            No modo <strong style={{ color: 'var(--tdgflow-text-primary)' }}>Livre</strong>, todos os advisors compartilham o saldo comum sem restrição por agência — quem usar primeiro consome. Para definir quotas por agência, mude para <strong style={{ color: 'var(--tdgflow-text-secondary)' }}>Igualitário</strong>.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Pedidos de ativação GUEST (admin) ──────────────────────────────────────────

function GuestRequestsPanel() {
  const [requests, setRequests] = useState<PendingGuestRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetchPendingGuestRequests().then(rows => { setRequests(rows); setLoading(false) })
  }, [])

  async function handleReview(id: number, status: 'approved' | 'rejected') {
    setActingId(id); setError('')
    const result = await reviewGuestRequest(id, status)
    if (!result.ok) { setError(result.message); setActingId(null); return }
    setRequests(prev => prev.filter(r => r.id !== id))
    setActingId(null)
  }

  // Sem skeleton dedicado — painel de baixo volume, aparece e some rápido;
  // não renderizar nada enquanto carrega ou quando a fila está vazia evita
  // ocupar espaço permanente na aba por um estado raro.
  if (loading || requests.length === 0) return null

  return (
    <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Send size={12} style={{ color: 'var(--tdgflow-gold-dim)' }} />
        <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: 0, flex: 1 }}>
          Pedidos de ativação GUEST
        </p>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--tdgflow-gold-dim)', background: 'var(--tdgflow-gold-subtle)', borderRadius: 20, padding: '1px 7px' }}>
          {requests.length}
        </span>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {error && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)', margin: 0 }}>{error}</p>}
        {requests.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--tdgflow-bg)', borderRadius: 10, border: '1px solid var(--tdgflow-border-subtle)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.agencyName}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)', margin: '2px 0 0' }}>
                {r.requestedByName} · {new Date(r.requestedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
            </div>
            <button
              onClick={() => handleReview(r.id, 'rejected')}
              disabled={actingId === r.id}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', color: 'var(--tdgflow-text-muted)', fontSize: '0.6875rem', fontWeight: 600, cursor: actingId === r.id ? 'default' : 'pointer', flexShrink: 0 }}
            >
              Rejeitar
            </button>
            <button
              onClick={() => handleReview(r.id, 'approved')}
              disabled={actingId === r.id}
              style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--tdgflow-gold)', color: 'var(--tdgflow-navy-dim)', fontSize: '0.6875rem', fontWeight: 600, cursor: actingId === r.id ? 'default' : 'pointer', flexShrink: 0 }}
            >
              {actingId === r.id ? '…' : 'Aprovar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Rede TDG (admin) ─────────────────────────────────────────────────────

function TabNetwork() {
  const [data, setData]       = useState<CreditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [showBuy, setShowBuy] = useState(false)
  const [bought, setBought]   = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/credits').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => { setError('Erro ao carregar'); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><p style={{ color: 'var(--tdgflow-text-faint)', fontSize: '0.875rem' }}>Carregando…</p></div>
  if (error || !data) return <p style={{ color: 'var(--tdgflow-error)', fontSize: '0.875rem' }}>{error}</p>

  const { balance, creditsThisMonth, dailyUsage, byUser, purchases } = data

  // Admins have no agency_id of their own today (see /api/credits GET), so
  // `balance` and everything derived from it come back undefined. The
  // network-wide sections below (breakdown, distribution settings) are
  // admin-only and independent of agency — they always render.
  let tierDef, avgPerDay = 0, daysLeft: number | null = null
  let alertLevel: 'critical' | 'low' | 'medium' | 'ok' = 'ok'
  let pct = 100, barColor = 'var(--tdgflow-navy)'

  if (balance) {
    // Sem fallback pra TIERS[0]: se a agência nunca comprou top-up (tier ''),
    // tierDef fica undefined de propósito — mostrar um pacote como "atual"
    // sem ter sido comprado inventaria um fato que não está no dado.
    tierDef = TIERS.find(t => t.id === balance.tier)
    const recentDays = (dailyUsage ?? []).slice(0, 7)
    avgPerDay = recentDays.length > 0 ? Math.round(recentDays.reduce((s, d) => s + d.requests, 0) / recentDays.length * 1.5) : 0
    daysLeft = avgPerDay > 0 && balance.balance > 0 ? Math.round(balance.balance / avgPerDay) : null
    alertLevel = balance.balance < 0 ? 'critical' : tierDef?.credits && balance.balance < tierDef.credits * 0.15 ? 'low' : tierDef?.credits && balance.balance < tierDef.credits * 0.40 ? 'medium' : 'ok'
    pct = tierDef?.credits ? Math.max(0, Math.min(100, (balance.balance / tierDef.credits) * 100)) : 100
    barColor = pct > 40 ? 'var(--tdgflow-navy)' : pct > 15 ? 'var(--tdgflow-accent-warm)' : 'var(--tdgflow-error)'
  }

  const alertConf = {
    critical: { color: 'var(--tdgflow-error)', bg: 'var(--tdgflow-error-subtle)', icon: AlertTriangle, label: 'Saldo negativo — adicione Lumis urgente' },
    low:      { color: 'var(--tdgflow-accent-warm)', bg: 'var(--tdgflow-accent-warm-subtle)', icon: AlertTriangle, label: 'Saldo baixo — considere recarregar' },
    medium:   { color: 'var(--tdgflow-accent-warm)', bg: 'var(--tdgflow-accent-warm-subtle)', icon: TrendingUp,   label: 'Consumo crescendo — monitore o saldo' },
    ok:       { color: 'var(--tdgflow-success)', bg: 'var(--tdgflow-success-subtle)', icon: CheckCircle2, label: 'Saldo saudável' },
  }
  const alert = alertConf[alertLevel]
  const AlertIcon = alert.icon

  return (
    <>
      {showBuy && balance && <BuyModal currentTier={balance.tier} onClose={() => setShowBuy(false)} onSuccess={() => { setShowBuy(false); setBought(true); setTimeout(() => setBought(false), 3500); load() }} />}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        <GuestRequestsPanel />

        {!balance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: 'var(--tdgflow-border-subtle)', borderRadius: 9, border: '1px solid var(--tdgflow-border-subtle)', flexShrink: 0 }}>
            <Users size={13} style={{ color: 'var(--tdgflow-text-faint)', flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', margin: 0 }}>Este admin não está vinculado a uma agência — sem saldo individual.</p>
          </div>
        )}

        {balance && (
          <>
            {/* Balance hero */}
            <div style={{ background: 'var(--tdgflow-text-primary)', borderRadius: 16, padding: '18px 20px', flexShrink: 0 }}>
              {bought && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,140,148,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
                  <CheckCircle2 size={12} style={{ color: '#4DD0E1' }} />
                  <span style={{ fontSize: '0.75rem', color: '#4DD0E1' }}>Lumis adicionados.</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Coins size={13} style={{ color: '#4DD0E1' }} />
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4DD0E1' }}>Saldo da rede</span>
                    {tierDef && (
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', background: '#4DD0E1', borderRadius: 20, padding: '1px 7px' }}>
                        Último top-up: {tierDef.name}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '2.5rem', fontWeight: 800, color: balance.balance < 0 ? '#F48FB1' : 'var(--tdgflow-surface)', margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {numFmt(balance.balance)}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--tdgflow-text-faint)', marginLeft: 5 }}>Lumis</span>
                  </p>
                  {tierDef?.credits && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.5s var(--tdgflow-ease-smooth)' }} />
                      </div>
                      <p style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-muted)', marginTop: 4, margin: '4px 0 0' }}>
                        {numFmt(Math.max(0, balance.balance))} de {numFmt(tierDef.credits)} Lumis disponíveis (último top-up)
                      </p>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowBuy(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 9, border: 'none', background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                  + Adicionar<ChevronRight size={11} />
                </button>
              </div>
            </div>

            {/* Alert */}
            {alertLevel !== 'ok' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: alert.bg, borderRadius: 9, border: `1px solid ${alert.color}33`, flexShrink: 0 }}>
                <AlertIcon size={13} style={{ color: alert.color, flexShrink: 0 }} />
                <p style={{ fontSize: '0.75rem', color: alert.color, margin: 0 }}>{alert.label}</p>
              </div>
            )}

            {/* Stats row — sem card, mesmo princípio do StatBlock acima */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, flexShrink: 0, padding: '2px 2px' }}>
              {[
                { label: 'Consumido este mês', value: `${numFmt(creditsThisMonth ?? 0)} lm` },
                { label: 'Ritmo diário', value: avgPerDay > 0 ? `${avgPerDay} lm/dia` : '—' },
                { label: 'Saldo estimado', value: daysLeft ? `~${daysLeft} dias` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 6px' }}>{label}</p>
                  <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--tdgflow-text-primary)', margin: 0, lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Bottom 2-col */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>

              {/* By advisor */}
              <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={11} style={{ color: 'var(--tdgflow-text-faint)' }} />
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: 0 }}>Por advisor — este mês</p>
                </div>
                <div>
                  {!byUser || byUser.length === 0 ? (
                    <p style={{ padding: '16px', fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)' }}>Nenhum consumo registrado.</p>
                  ) : byUser.map((row, i) => {
                    const maxCredits = byUser[0]?.credits_used ?? 1
                    const w = Math.round((row.credits_used / maxCredits) * 100)
                    return (
                      <div key={i} style={{ padding: '9px 14px', borderBottom: i < byUser.length - 1 ? '1px solid var(--tdgflow-bg)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--tdgflow-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.advisor_name ?? row.user_email}
                          </span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', flexShrink: 0 }}>{numFmt(row.credits_used)} lm</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--tdgflow-surface-high)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${w}%`, background: 'var(--tdgflow-navy)', borderRadius: 2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Custo por ação + recargas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 168 }}>
                <div style={{ background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 8px' }}>Custo por ação</p>
                  {Object.entries(CREDIT_COSTS).map(([action, cost]) => {
                    const labels: Record<string, string> = { chat: 'Msg Flow', review_extraction: 'Ext. dica', transcription: 'Transcrição', travel_docs: 'Consulta visto', scan_card: 'Scan cartão' }
                    return (
                      <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>{labels[action] ?? action}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)' }}>{cost} lm</span>
                      </div>
                    )
                  })}
                </div>

                {purchases && purchases.length > 0 && (
                  <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, padding: '12px 14px', flex: 1 }}>
                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 8px' }}>Recargas</p>
                    {purchases.map((p, i) => (
                      <div key={i} style={{ marginBottom: i < purchases.length - 1 ? 7 : 0 }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: 0 }}>+{numFmt(p.amount)} lm</p>
                        <p style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', margin: '1px 0 0' }}>
                          {p.meta?.tier} · {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Lumi distribution — admin-only, cross-agency, independent of the caller's own balance */}
        <LumiDistribution
          settings={data.lumiSettings}
          breakdown={data.agencyBreakdown}
          totalBalance={balance?.balance ?? 0}
          onRefresh={load}
        />

      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'usage' | 'infra' | 'network'

export default function BillingView({ userRole }: { userRole: string }) {
  const isAdmin = userRole === 'admin'
  const [tab, setTab] = useState<Tab>('usage')

  const allTabs: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: 'usage',   label: 'Meu uso',       icon: Activity },
    { id: 'infra',   label: 'Infraestrutura', icon: LayoutGrid },
    { id: 'network', label: 'Rede TDG',       icon: Users, adminOnly: true },
  ]
  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-5" style={{ height: '100%', maxWidth: 680, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <p style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: '0 0 2px' }}>Infraestrutura</p>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Serviços & Custos</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--tdgflow-border-subtle)', borderRadius: 11, padding: 4, flexShrink: 0 }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? 'var(--tdgflow-surface)' : 'transparent', color: active ? 'var(--tdgflow-text-primary)' : 'var(--tdgflow-text-faint)', fontWeight: active ? 600 : 500, fontSize: '0.75rem', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s var(--tdgflow-ease-smooth)' }}>
              <Icon size={12} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'usage'   && <TabMyUsage />}
        {tab === 'infra'   && <TabInfra />}
        {tab === 'network' && isAdmin && <TabNetwork />}
      </div>
    </div>
  )
}
