'use client'

import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import TdgIconSprite from '@/components/TdgIconSprite'
import { fetchSubscriptionStatus, type SubscriptionStatusResult } from '@/lib/subscription-status-client'
import { subscribeToGrowth } from '@/lib/subscribe-client'

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtAmount(n: number | null) {
  if (n === null) return null
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AgencySubscriptionCard() {
  const [state, setState]     = useState<SubscriptionStatusResult>({ status: 'none' })
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetchSubscriptionStatus().then(r => { setState(r); setLoading(false) })
  }, [])

  async function handleSubscribe() {
    setStarting(true); setError('')
    const result = await subscribeToGrowth()
    if (result.status === 'ok') {
      window.location.href = result.initPoint
      return
    }
    if (result.status === 'unauthenticated') setError('Sessão expirada — atualize a página.')
    else if (result.status === 'no_agency') setError('Sua conta não está vinculada a uma agência.')
    else if (result.status === 'already_subscribed') setError('Sua agência já tem uma assinatura ativa.')
    else setError(result.message)
    setStarting(false)
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)' }}>
          <Skeleton width={130} height={9} />
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={150} height={14} />
          <Skeleton width={220} height={11} />
        </div>
      </div>
    )
  }

  const cardBase = { background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, boxShadow: '0 2px 8px rgba(17,38,48,0.06)' } as const
  const header = (
    <div style={{ padding: '10px 16px', borderRadius: '14px 14px 0 0', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg style={{ width: 12, height: 12, stroke: 'var(--tdgflow-navy)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
        <use href="#i-calendar" />
      </svg>
      <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)', margin: 0, flex: 1 }}>
        Assinatura da agência
      </p>
    </div>
  )

  if (state.status === 'authorized') {
    return (
      <div style={cardBase}>
        <TdgIconSprite />
        {header}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: 0 }}>
            <svg style={{ width: 13, height: 13, stroke: 'var(--tdgflow-success)', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
              <use href="#i-verified" />
            </svg>
            Plano Growth ativo · Membro Fundador
          </p>
          {state.transactionAmount !== null && (
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', margin: '4px 0 0' }}>
              {fmtAmount(state.transactionAmount)}/mês (fee de manutenção)
              {fmtDate(state.nextPaymentDate) && <> · próxima cobrança: {fmtDate(state.nextPaymentDate)}</>}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (state.status === 'pending') {
    return (
      <div style={cardBase}>
        <TdgIconSprite />
        {header}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', margin: 0 }}>Assinatura em processamento — aguardando confirmação do pagamento.</p>
        </div>
      </div>
    )
  }

  if (state.status === 'paused') {
    return (
      <div style={cardBase}>
        <TdgIconSprite />
        {header}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-accent-warm)', margin: 0 }}>Assinatura pausada — regularize o pagamento.</p>
        </div>
      </div>
    )
  }

  // none, cancelled, rejected → offer to subscribe
  return (
    <div style={cardBase}>
      <TdgIconSprite />
      {header}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', margin: 0 }}>Plano Growth — R$ 77,37/mês</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-faint)', margin: '4px 0 0' }}>500 lm/mês de cota para a agência, cobrança recorrente todo dia 5.</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-success)', margin: '6px 0 0', fontWeight: 600 }}>Fee de manutenção de Membro Fundador — sem valores adicionais, sem surpresas na fatura.</p>
        </div>
        {error && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-error)', margin: 0 }}>{error}</p>}
        <button
          onClick={handleSubscribe}
          disabled={starting}
          style={{
            width: '100%', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 14px', borderRadius: 9, border: 'none',
            background: starting ? 'var(--tdgflow-border-light)' : 'var(--tdgflow-navy)',
            color: 'var(--tdgflow-surface)', fontSize: '0.8125rem', fontWeight: 600,
            cursor: starting ? 'default' : 'pointer', flexShrink: 0,
          }}
        >
          {starting ? <Loader2 className="animate-spin" size={14} /> : null}
          {starting ? 'Redirecionando…' : 'Assinar plano Growth'}
        </button>
      </div>
    </div>
  )
}
