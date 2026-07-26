'use client'

import React, { useEffect, useState } from 'react'
import { CalendarCheck, Loader2 } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
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
      <div style={{ background: '#fff', border: '1px solid #E4EEF0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #F0F5F7', background: '#F8FBFC' }}>
          <Skeleton width={130} height={9} />
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={150} height={14} />
          <Skeleton width={220} height={11} />
        </div>
      </div>
    )
  }

  const cardBase = { background: '#fff', border: '1px solid #E4EEF0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(17,38,48,0.06)' } as const
  const header = (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid #F0F5F7', background: '#F8FBFC', display: 'flex', alignItems: 'center', gap: 6 }}>
      <CalendarCheck size={12} style={{ color: '#008C94' }} />
      <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7BA8B2', margin: 0, flex: 1 }}>
        Assinatura da agência
      </p>
    </div>
  )

  if (state.status === 'authorized') {
    return (
      <div style={cardBase}>
        {header}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#112630', margin: 0 }}>Plano Growth ativo · Membro Fundador</p>
          {state.transactionAmount !== null && (
            <p style={{ fontSize: '0.75rem', color: '#7BA8B2', margin: '4px 0 0' }}>
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
        {header}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.8125rem', color: '#4A7580', margin: 0 }}>Assinatura em processamento — aguardando confirmação do Mercado Pago.</p>
        </div>
      </div>
    )
  }

  if (state.status === 'paused') {
    return (
      <div style={cardBase}>
        {header}
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.8125rem', color: '#C97B20', margin: 0 }}>Assinatura pausada — regularize o pagamento no Mercado Pago.</p>
        </div>
      </div>
    )
  }

  // none, cancelled, rejected → offer to subscribe
  return (
    <div style={cardBase}>
      {header}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#112630', margin: 0 }}>Plano Growth — R$ 1.470/mês</p>
          <p style={{ fontSize: '0.75rem', color: '#7BA8B2', margin: '4px 0 0' }}>500 lm/mês de cota para a agência, cobrança recorrente via Mercado Pago.</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--success)', margin: '6px 0 0', fontWeight: 600 }}>Fee de manutenção de Membro Fundador — sem valores adicionais, sem surpresas na fatura.</p>
        </div>
        {error && <p style={{ fontSize: '0.75rem', color: 'var(--error)', margin: 0 }}>{error}</p>}
        <button
          onClick={handleSubscribe}
          disabled={starting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 9, border: 'none', background: starting ? '#B8D0D5' : '#008C94', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: starting ? 'default' : 'pointer' }}
        >
          {starting ? <Loader2 className="animate-spin" size={14} /> : null}
          {starting ? 'Redirecionando…' : 'Assinar plano Growth'}
        </button>
      </div>
    </div>
  )
}
