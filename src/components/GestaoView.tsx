'use client'

import { useState } from 'react'
import { Users, Plus, Crown, UserCheck, UserX, Loader, Check, X } from 'lucide-react'

interface TdgUser {
  id: string
  name: string
  email: string
  agency_name: string
  role: string
  active: boolean
  created_at: string
}

interface Props {
  users: TdgUser[]
}

export default function GestaoView({ users: initial }: Props) {
  const [users, setUsers] = useState<TdgUser[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', agency_name: '', password: '', role: 'agent' })
  const [error, setError] = useState('')

  // Group by agency
  const byAgency = users.reduce<Record<string, TdgUser[]>>((acc, u) => {
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
    if (!form.name || !form.email || !form.agency_name || !form.password) {
      setError('Preencha todos os campos.')
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
      setForm({ name: '', email: '', agency_name: '', password: '', role: 'agent' })
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
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Gestão de Usuários
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {users.length} usuário{users.length !== 1 ? 's' : ''} · {Object.keys(byAgency).length} agênci{Object.keys(byAgency).length !== 1 ? 'as' : 'a'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-gold"
          style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
        >
          <Plus size={14} /> Novo usuário
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Novo usuário</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className="input" placeholder="Nome completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <input className="input" placeholder="Nome da agência" value={form.agency_name} onChange={e => setForm(p => ({ ...p, agency_name: e.target.value }))} />
            <input className="input" placeholder="Senha provisória" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.role === 'admin'}
                onChange={e => setForm(p => ({ ...p, role: e.target.checked ? 'admin' : 'agent' }))}
                style={{ accentColor: 'var(--gold)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Permissão de administrador</span>
            </label>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
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
      {Object.entries(byAgency).sort(([a], [b]) => a.localeCompare(b)).map(([agency, members]) => (
        <div key={agency}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            {agency} ({members.length})
          </p>
          <div className="space-y-2">
            {members.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'var(--surface-high)',
                  border: '1px solid var(--border)',
                  opacity: u.active ? 1 : 0.5,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                    {u.role === 'admin' && <Crown size={11} style={{ color: 'var(--gold)' }} />}
                    {!u.active && <span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>inativo</span>}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
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
                    : u.active ? <UserX size={13} style={{ color: 'var(--error)' }} /> : <UserCheck size={13} style={{ color: 'var(--success)' }} />
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
