'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Loader, Crown, Copy, Check, X } from 'lucide-react'

interface TeamMember {
  id:         string
  name:       string
  email:      string
  role:       string
  active:     boolean
  created_at: string
}

interface Props {
  agencyName: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EquipeView({ agencyName }: Props) {
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/team')
      const data = await res.json()
      if (res.ok) setMembers(data.members)
      else setLoadError(data.error ?? 'Erro ao carregar equipe.')
    })()
  }, [])

  async function generateInvite() {
    setGenerating(true)
    setInviteError('')
    const res = await fetch('/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteLink(`${window.location.origin}/flow/signup/${data.token}`)
    } else {
      setInviteError(data.error ?? 'Erro ao gerar convite.')
    }
    setGenerating(false)
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-1">{agencyName || 'Minha Agência'}</p>
          <h1 className="text-xl font-semibold" style={{ color: '#112630', letterSpacing: '-0.02em' }}>
            Minha Equipe
          </h1>
          <p className="text-sm mt-1" style={{ color: '#4A7580' }}>
            Convide novos membros para a sua agência — cada link é pessoal e de uso único.
          </p>
        </div>
        <button
          onClick={generateInvite}
          disabled={generating}
          className="btn-gold"
          style={{ padding: '8px 14px', fontSize: '0.8125rem', flexShrink: 0 }}
        >
          {generating ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Convidar membro
        </button>
      </div>

      {inviteError && (
        <p className="text-xs" style={{ color: '#C0392B' }}>{inviteError}</p>
      )}

      {inviteLink && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: '#112630' }}>Link de convite gerado</h3>
            <button
              onClick={() => setInviteLink(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A7580', padding: 2 }}
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs" style={{ color: '#4A7580' }}>
            Envie este link para a pessoa que você quer adicionar à equipe. Ele expira em 30 dias e só pode ser usado uma vez.
          </p>
          <div className="flex gap-2">
            <input className="input flex-1" readOnly value={inviteLink} style={{ fontSize: '0.75rem' }} />
            <button onClick={copyLink} className="btn-ghost" style={{ padding: '8px 12px', fontSize: '0.8125rem', flexShrink: 0 }}>
              {copied ? <Check size={13} style={{ color: '#2E7D4F' }} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {loadError && <p className="text-xs" style={{ color: '#C0392B' }}>{loadError}</p>}

      {members === null && !loadError && (
        <div className="flex items-center justify-center py-10">
          <Loader size={18} className="animate-spin" style={{ color: '#4A7580' }} />
        </div>
      )}

      {members && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#4A7580' }}>
            Equipe ({members.length})
          </p>
          <div className="space-y-2">
            {members.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--surface-high)', border: '1px solid var(--border)', opacity: m.active ? 1 : 0.5 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: '#104C64' }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: '#112630' }}>{m.name}</span>
                    {m.role === 'agency_admin' && <Crown size={11} style={{ color: '#008C94' }} />}
                    {!m.active && <span className="badge badge-muted" style={{ fontSize: '0.6rem' }}>inativo</span>}
                  </div>
                  <p className="text-xs truncate" style={{ color: '#4A7580' }}>{m.email}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: '#4A7580' }}>{formatDate(m.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
