'use client'

import { Building2, User, Crown, Calendar } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface Props {
  user: { name: string; agency: string; role: string }
  members: Member[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export default function AgenciaView({ user, members }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div>
        <p className="section-label mb-1">Perfil</p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Minha Agência
        </h1>
      </div>

      {/* Agency card */}
      <div className="card card-gold">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-ring)' }}
          >
            <Building2 size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{user.agency}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Travel Designers Group — Consórcio</p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Advisors da agência ({members.length})
        </p>
        <div className="space-y-2">
          {members.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--surface-high)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {m.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                  {m.name === user.name && (
                    <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>você</span>
                  )}
                  {m.role === 'admin' && (
                    <Crown size={11} style={{ color: 'var(--gold)' }} />
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={11} />
                <span style={{ fontSize: '0.6875rem' }}>{formatDate(m.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface-high)', border: '1px solid var(--border)' }}>
        <div className="flex items-start gap-2.5">
          <User size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Para adicionar ou remover advisors da sua agência, entre em contato com o administrador do TDG Flow.
          </p>
        </div>
      </div>
    </div>
  )
}
