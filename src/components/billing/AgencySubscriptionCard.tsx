'use client'

import React, { useEffect, useState } from 'react'
import { CalendarCheck, Loader2 } from 'lucide-react'
import { fetchSubscriptionStatus, type SubscriptionStatusResult } from '@/lib/subscription-status-client'
import { subscribeToGrowth } from '@/lib/subscribe-client'

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
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
      <div style={{ background: '#fff', border: '1px solid #E4EEF0', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: '0.75rem', color: '#7BA8B2', margin: 0 }}>Carregando assinatura…</p>
      </div>
    )
  }

  const cardBase = { background: '#fff', border: '1px solid #E4EEF0', borderRadius: 14, overflow: 'hidden' } as const
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
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#112630', margin: 0 }}>Plano Growth ativo</p>
          {fmtDate(state.nextPaymentDate) && (
            <p style={{ fontSize: '0.75rem', color: '#7BA8B2', margin: '4px 0 0' }}>
              Próxima cobrança: {fmtDate(state.nextPaymentDate)}
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
        </div>
        {error && <p style={{ fontSize: '0.75rem', color: '#C62828', margin: 0 }}>{error}</p>}
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
