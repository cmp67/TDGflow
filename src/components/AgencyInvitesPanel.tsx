'use client'

import { useEffect, useState } from 'react'
import { Loader, Copy, Check, LinkIcon, RefreshCw, CircleCheck, CircleDashed } from 'lucide-react'

interface AgencyInviteRow {
  id:         string
  name:       string
  status:     'none' | 'pending' | 'registered'
  token:      string | null
  expiresAt:  string | null
}

// Admin-only screen (see /api/admin/invites — gated on role==='admin'): one
// self-registration link per one of the 19 contracted agencies. Clicking
// "Gerar link" mints an agency_admin invite; the indicated person uses it to
// become the admin of their OWN agency (never the network).
export default function AgencyInvitesPanel() {
  const [agencies, setAgencies] = useState<AgencyInviteRow[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/admin/invites')
    const data = await res.json()
    if (res.ok) setAgencies(data.agencies)
    else setError(data.error ?? 'Erro ao carregar convites.')
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [])

  async function generate(agencyId: string, force = false) {
    setBusyId(agencyId)
    setError('')
    const res = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency_id: agencyId, force }),
    })
    const data = await res.json()
    if (res.ok) {
      await load()
      await copyToClipboard(agencyId, data.token)
    } else {
      setError(data.error ?? 'Erro ao gerar convite.')
    }
    setBusyId(null)
  }

  async function copyToClipboard(agencyId: string, token: string) {
    const url = `${window.location.origin}/flow/signup/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(agencyId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!agencies && !error) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Gere um link único de auto-cadastro para cada agência. Quem clicar vira administrador(a) da própria agência e passa a convidar a própria equipe.
      </p>

      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}

      <div className="space-y-2">
        {agencies?.map(a => (
          <div
            key={a.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface-high)', border: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                {a.status === 'registered' && (
                  <span className="badge badge-success" style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CircleCheck size={11} /> registrada
                  </span>
                )}
                {a.status === 'pending' && (
                  <span className="badge badge-gold" style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CircleDashed size={11} /> convite pendente
                  </span>
                )}
              </div>
            </div>

            {a.status !== 'registered' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.status === 'pending' && a.token && (
                  <button
                    onClick={() => copyToClipboard(a.id, a.token!)}
                    className="btn-ghost"
                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    title="Copiar link existente"
                  >
                    {copiedId === a.id ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                    {copiedId === a.id ? 'Copiado!' : 'Copiar link'}
                  </button>
                )}
                <button
                  onClick={() => generate(a.id, a.status === 'pending')}
                  disabled={busyId === a.id}
                  className="btn-gold"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title={a.status === 'pending' ? 'Invalidar o link atual e gerar um novo' : 'Gerar link de convite'}
                >
                  {busyId === a.id
                    ? <Loader size={12} className="animate-spin" />
                    : a.status === 'pending' ? <RefreshCw size={12} /> : <LinkIcon size={12} />}
                  {a.status === 'pending' ? 'Gerar novo' : 'Gerar link'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
