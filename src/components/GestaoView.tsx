'use client'

import { useState } from 'react'
import { Users, Plus, Crown, UserCheck, UserX, Loader, Check, X, Eye, EyeOff, Link2, CreditCard } from 'lucide-react'
import AgencyInvitesPanel from '@/components/AgencyInvitesPanel'
import AdminSubscriptionsPanel from '@/components/AdminSubscriptionsPanel'

interface TdgUser {
  id: string
  name: string
  email: string
  agency_name: string
  role: string
  active: boolean
  whatsapp?: string
  agent_interaction_id?: string
  created_at: string
}

interface Props {
  users: TdgUser[]
}

export default function GestaoView({ users: initial }: Props) {
  const [tab, setTab] = useState<'users' | 'invites' | 'assinaturas'>('users')
  const [users, setUsers] = useState<TdgUser[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', agency_name: '', password: '', role: 'agent', whatsapp: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Group by agency — hide Bemgsy internal accounts from the list
  const byAgency = users
    .filter(u => u.agency_name.toLowerCase() !== 'bemgsy')
    .reduce<Record<string, TdgUser[]>>((acc, u) => {
      if (!acc[u.agency_name]) acc[u.agency_name] = []
      acc[u.agency_name].push(u)
      return acc
    }, {})

  async function toggleActive(user: TdgUser) {
    setTogglingId(user.id)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, active: !user.active }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u))
    }
    setTogglingId(null)
  }

  async function createUser() {
    if (!form.name || !form.email || !form.agency_name || !form.password || !form.whatsapp) {
      setError('Preencha todos os campos, incluindo WhatsApp.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.user) {
      setUsers(prev => [...prev, data.user])
      setForm({ name: '', email: '', agency_name: '', password: '', role: 'agent', whatsapp: '' })
      setShowForm(false)
    } else {
      setError(data.error ?? 'Erro ao criar usuário.')
    }
    setSaving(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Administração</p>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
            {tab === 'users' ? 'Gestão de Usuários' : tab === 'invites' ? 'Convites de Agência' : 'Assinaturas'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
            {tab === 'users'
              ? `${Object.values(byAgency).flat().length} usuário${Object.values(byAgency).flat().length !== 1 ? 's' : ''} · ${Object.keys(byAgency).length} agênci${Object.keys(byAgency).length !== 1 ? 'as' : 'a'}`
              : tab === 'invites'
              ? 'Links de auto-cadastro para as agências da rede'
              : 'Status de cobrança do plano Growth por agência'}
          </p>
        </div>
        {tab === 'users' && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-gold"
            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <Plus size={14} /> Novo usuário
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1" style={{ borderBottom: '1px solid var(--tdgflow-border)' }}>
        <button
          onClick={() => setTab('users')}
          className="flex items-center gap-1.5"
          style={{
            padding: '8px 12px', fontSize: '0.8125rem', fontWeight: tab === 'users' ? 600 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === 'users' ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
            borderBottom: tab === 'users' ? '2px solid var(--tdgflow-navy)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          <Users size={14} /> Usuários
        </button>
        <button
          onClick={() => setTab('invites')}
          className="flex items-center gap-1.5"
          style={{
            padding: '8px 12px', fontSize: '0.8125rem', fontWeight: tab === 'invites' ? 600 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === 'invites' ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
            borderBottom: tab === 'invites' ? '2px solid var(--tdgflow-navy)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          <Link2 size={14} /> Convites de Agência
        </button>
        <button
          onClick={() => setTab('assinaturas')}
          className="flex items-center gap-1.5"
          style={{
            padding: '8px 12px', fontSize: '0.8125rem', fontWeight: tab === 'assinaturas' ? 600 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === 'assinaturas' ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)',
            borderBottom: tab === 'assinaturas' ? '2px solid var(--tdgflow-navy)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          <CreditCard size={14} /> Assinaturas
        </button>
      </div>

      {tab === 'invites' && <AgencyInvitesPanel />}
      {tab === 'assinaturas' && <AdminSubscriptionsPanel />}

      {/* Create form */}
      {tab === 'users' && showForm && (
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Novo usuário</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Nome completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <input className="input" placeholder="Nome da agência" value={form.agency_name} onChange={e => setForm(p => ({ ...p, agency_name: e.target.value }))} />
            <input className="input" placeholder="WhatsApp (ex: 5511999920122)" value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} />
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Senha provisória"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--tdgflow-text-muted)', display: 'flex', alignItems: 'center',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.role === 'admin'}
                onChange={e => setForm(p => ({ ...p, role: e.target.checked ? 'admin' : 'agent' }))}
                style={{ accentColor: 'var(--tdgflow-navy)' }}
              />
              <span className="text-sm" style={{ color: 'var(--tdgflow-text-secondary)' }}>Permissão de administrador</span>
            </label>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--tdgflow-error)' }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={createUser} disabled={saving} className="btn-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem' }}>
              {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Criar
            </button>
            <button onClick={() => { setShowForm(false); setError('') }} className="btn-ghost" style={{ padding: '7px 12px', fontSize: '0.8125rem' }}>
              <X size={13} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Users by agency */}
      {tab === 'users' && Object.entries(byAgency).sort(([a], [b]) => a.localeCompare(b)).map(([agency, members]) => (
        <div key={agency}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--tdgflow-text-muted)' }}>
            {agency} ({members.length})
          </p>
          <div className="space-y-2">
            {members.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'var(--tdgflow-surface-high)',
                  border: '1px solid var(--tdgflow-border)',
                  opacity: u.active ? 1 : 0.5,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', color: 'var(--tdgflow-text-secondary)' }}
                >
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--tdgflow-text-primary)' }}>{u.name}</span>
                    {u.role === 'admin' && <Crown size={11} style={{ color: 'var(--tdgflow-navy)' }} />}
                    {!u.active && <span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>inativo</span>}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--tdgflow-text-muted)' }}>{u.email}</p>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {u.whatsapp && (
                      <span className="text-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>📱 +{u.whatsapp}</span>
                    )}
                    {u.agent_interaction_id && (
                      <span className="text-xs font-mono" style={{ color: 'var(--tdgflow-navy)' }}>ID: {u.agent_interaction_id}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(u)}
                  disabled={togglingId === u.id}
                  className="btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}
                  title={u.active ? 'Desativar acesso' : 'Ativar acesso'}
                >
                  {togglingId === u.id
                    ? <Loader size={12} className="animate-spin" />
                    : u.active ? <UserX size={13} style={{ color: 'var(--tdgflow-error)' }} /> : <UserCheck size={13} style={{ color: 'var(--tdgflow-success)' }} />
                  }
                  {u.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
