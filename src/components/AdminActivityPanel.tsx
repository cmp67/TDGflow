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

// Saúde da agência = do membro mais recentemente ativo. Verde: alguém usou
// nos últimos 7 dias. Âmbar: já usou, mas faz tempo. Cinza: ninguém logou
// ainda — nada a "cuidar", só aguardando ativação.
function agencyHealth(members: ActivityRow[]): { color: string; label: string } {
  const mostRecent = members
    .map(m => (m.last_activity ? new Date(m.last_activity).getTime() : null))
    .filter((t): t is number => t !== null)
    .sort((a, b) => b - a)[0]
  if (!mostRecent) return { color: 'var(--tdgflow-border-light)', label: 'Sem atividade ainda' }
  const days = Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24))
  if (days <= 7) return { color: '#16a34a', label: 'Ativa esta semana' }
  if (days <= 30) return { color: '#d97706', label: 'Ativa este mês' }
  return { color: '#94a3b8', label: 'Inativa há mais de 30 dias' }
}

function StatBlock({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 100 }}>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>{label}</p>
    </div>
  )
}

// Barra de engajamento — dias ativos nos últimos 30 como proporção
// preenchida, em vez de só o número em texto. Leitura visual instantânea
// em vez de precisar ler cada linha (achado da Carla, 10/08: "mais sexy").
function EngagementBar({ activeDays }: { activeDays: number }) {
  const pct = Math.min(100, Math.round((activeDays / 30) * 100))
  const color = pct >= 50 ? '#16a34a' : pct >= 15 ? '#d97706' : 'var(--tdgflow-border-light)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 96 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--tdgflow-surface)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>{activeDays}d</span>
    </div>
  )
}

// Admin-only (ver /api/admin/activity — gated on role==='admin'): quem logou,
// quando, e quanto está usando o produto — não existia nenhuma visibilidade
// disso antes (achado da Carla, 08/08). "Dias ativos" no lugar de "tempo de
// sessão" — com auth JWT sem tabela de sessão, duração exata não é medível
// de forma confiável; dias distintos com alguma ação é o sinal real que dá
// pra calcular. Redesenho 10/08 — resumo no topo, agências com selo de
// saúde, barra de engajamento em vez de texto plano.
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

  const all = rows ?? []
  const byAgency = all.reduce<Record<string, ActivityRow[]>>((acc, u) => {
    if (!acc[u.agency_name]) acc[u.agency_name] = []
    acc[u.agency_name].push(u)
    return acc
  }, {})

  const neverLogged = all.filter(u => !u.last_login)
  const activeThisWeek = all.filter(u => u.last_activity && Date.now() - new Date(u.last_activity).getTime() <= 7 * 86400000)
  const agencyCount = Object.keys(byAgency).length
  const agenciesActive = Object.values(byAgency).filter(m => agencyHealth(m).color === '#16a34a').length

  return (
    <div className="space-y-6">
      {/* Resumo — leitura de 3 segundos, sem precisar rolar a lista */}
      <div style={{ display: 'flex', gap: 20, padding: '16px 4px', borderBottom: '1px solid var(--tdgflow-border)' }}>
        <StatBlock value={agencyCount} label="agências" />
        <StatBlock value={agenciesActive} label="ativas esta semana" />
        <StatBlock value={activeThisWeek.length} label="usuários ativos (7d)" />
        <StatBlock value={neverLogged.length} label="sem primeiro login" />
      </div>

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

      {Object.entries(byAgency).sort(([a], [b]) => a.localeCompare(b)).map(([agency, members]) => {
        const health = agencyHealth(members)
        return (
          <div key={agency}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: health.color, flexShrink: 0 }} title={health.label} />
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tdgflow-text-muted)' }}>
                {agency}
              </p>
            </div>
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
                  <EngagementBar activeDays={u.active_days_30d} />
                  <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', minWidth: 110 }}>
                    <p>Login: {fmtRelative(u.last_login)}</p>
                    <p>{u.reviews_total} review{u.reviews_total !== 1 ? 's' : ''} · {u.chat_total} chat{u.chat_total !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
