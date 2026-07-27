'use client'

import { useEffect, useState } from 'react'
import { Loader, CircleCheck, CircleDashed, CircleOff, CircleAlert } from 'lucide-react'

type SubscriptionStatus = 'none' | 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected'

interface AgencySubscriptionRow {
  id:                 string
  name:               string
  status:             SubscriptionStatus
  providerSubscriptionId: string | null
  transactionAmount:  number | null
  nextPaymentDate:    string | null
}

const STATUS_META: Record<SubscriptionStatus, { label: string; badge: string; icon: typeof CircleCheck }> = {
  none:       { label: 'Sem assinatura',        badge: 'badge-muted',   icon: CircleOff },
  pending:    { label: 'Aguardando cartão',     badge: 'badge-gold',    icon: CircleDashed },
  authorized: { label: 'Ativa',                 badge: 'badge-success', icon: CircleCheck },
  paused:     { label: 'Pausada',               badge: 'badge-warning', icon: CircleAlert },
  cancelled:  { label: 'Cancelada',             badge: 'badge-muted',   icon: CircleOff },
  rejected:   { label: 'Rejeitada',             badge: 'badge-warning', icon: CircleAlert },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtAmount(n: number | null) {
  if (n === null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Admin-only screen (see /api/admin/subscriptions — gated on role==='admin'):
// billing status for every one of the 19 contracted agencies in one place,
// so the network doesn't have to be checked one payment-gateway page at a time.
export default function AdminSubscriptionsPanel() {
  const [agencies, setAgencies] = useState<AgencySubscriptionRow[] | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    (async () => {
      const res  = await fetch('/api/admin/subscriptions')
      const data = await res.json()
      if (res.ok) setAgencies(data.agencies)
      else setError(data.error ?? 'Erro ao carregar assinaturas.')
    })()
  }, [])

  if (!agencies && !error) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader size={18} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
      </div>
    )
  }

  if (error) return <p className="text-xs" style={{ color: 'var(--tdgflow-error)' }}>{error}</p>

  const activeCount = agencies!.filter(a => a.status === 'authorized').length

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--tdgflow-text-muted)' }}>
        {activeCount} de {agencies!.length} agências com assinatura ativa. Status sincronizado direto do gateway de pagamento via webhook.
      </p>

      <div className="space-y-2">
        {agencies!.map(a => {
          const meta = STATUS_META[a.status]
          const Icon = meta.icon
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 rounded-xl flex-wrap"
              style={{ background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)' }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium" style={{ color: 'var(--tdgflow-text-primary)' }}>{a.name}</span>
              </div>
              <span className={`badge ${meta.badge}`} style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Icon size={11} /> {meta.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--tdgflow-text-muted)', minWidth: 76, textAlign: 'right' }}>
                {fmtAmount(a.transactionAmount)}
              </span>
              <span className="text-xs" style={{ color: 'var(--tdgflow-text-faint)', minWidth: 96, textAlign: 'right' }}>
                {a.status === 'authorized' ? `próx.: ${fmtDate(a.nextPaymentDate)}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
