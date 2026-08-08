'use client'

import { useEffect, useState } from 'react'
import { Loader, CircleDashed } from 'lucide-react'

interface ActivityRow {
  id: string
  name: string
  email: string
  agency_name: string
  role: string
  active: boolean
  last_login: string | null
  login_count_30d: number
  last_activity: string | null
  active_days_30d: number
  reviews_total: number
  chat_total: number
}

function fmtRelative(dateStr: string | null): string {
  if (!dateStr) return 'nunca'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
}

// Admin-only (ver /api/admin/activity — gated on role==='admin'): quem logou,
// quando, e quanto está usando o produto — não existia nenhuma visibilidade
// disso antes (achado da Carla, 08/08). "Dias ativos" no lugar de "tempo de
// sessão" — com auth JWT sem tabela de sessão, duração exata não é medível
// de forma confiável; dias distintos com alguma ação é o sinal real que dá
// pra calcular.
export default function AdminActivityPanel() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/activity')
      const data = await res.json()
      if (res.ok) setRows(data.users)
      else setError(data.error ?? 'Erro ao carregar atividade.')
    })()
  }, [])

  if (!rows && !error) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader size={18} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />
      </div>
    )
  }
  if (error) {
    return <p className="text-sm" style={{ color: 'var(--tdgflow-error)' }}>{error}</p>
  }

  const byAgency = (rows ?? []).reduce<Record<string, ActivityRow[]>>((acc, u) => {
    if (!acc[u.agency_name]) acc[u.agency_name] = []
    acc[u.agency_name].push(u)
    return acc
  }, {})

  const neverLogged = (rows ?? []).filter(u => !u.last_login)

  return (
    <div className="space-y-5">
      {neverLogged.length > 0 && (
        <div className="card" style={{ padding: '12px 14px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <CircleDashed size={13} style={{ color: 'var(--tdgflow-warning)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>
              {neverLogged.length} conta{neverLogged.length > 1 ? 's' : ''} ainda sem primeiro login
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>
            {neverLogged.map(u => `${u.name} (${u.agency_name})`).join(' · ')}
          </p>
        </div>
      )}

      {Object.entries(byAgency).sort(([a], [b]) => a.localeCompare(b)).map(([agency, members]) => (
        <div key={agency}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--tdgflow-text-muted)' }}>
            {agency}
          </p>
          <div className="space-y-2">
            {members.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl flex-wrap"
                style={{ background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', opacity: u.active ? 1 : 0.5 }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--tdgflow-text-primary)' }}>{u.name}</span>
                  <p className="text-xs truncate" style={{ color: 'var(--tdgflow-text-muted)' }}>{u.email}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                  <p style={{ color: 'var(--tdgflow-text-secondary)' }}>Último login: {fmtRelative(u.last_login)}</p>
                  <p style={{ color: 'var(--tdgflow-text-muted)' }}>
                    {u.active_days_30d} {u.active_days_30d === 1 ? 'dia ativo' : 'dias ativos'} (30d) · {u.reviews_total} review{u.reviews_total !== 1 ? 's' : ''} · {u.chat_total} chat{u.chat_total !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
