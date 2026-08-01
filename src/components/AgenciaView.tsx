'use client'

import { useState } from 'react'
import { Save, Loader, Eye, EyeOff, CheckCircle } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import GuestActivationCard from '@/components/billing/GuestActivationCard'
import BrandSettings from '@/components/BrandSettings'
import { useLanguage } from '@/contexts/LanguageContext'
import { type Lang, LANG_LABELS } from '@/lib/i18n'

/* ── Ícones próprios — traço só (regra de personalidade Bemgsy). ──── */
function IconAgency({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="5" y="3.5" width="14" height="17" rx="1.2" />
      <path d="M9.5 20.5v-4h5v4M9 8h.01M9 11.5h.01M14 8h.01M14 11.5h.01" />
    </svg>
  )
}
function IconFounder({ size = 11, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M4 8l4 3 4-6 4 6 4-3-2 10H6z" />
    </svg>
  )
}
function IconCalendar({ size = 10, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="4" y="5.5" width="16" height="15" rx="1.6" /><path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" />
    </svg>
  )
}

interface Member {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface Props {
  user: { name: string; email: string; agency: string; role: string; avatar_url?: string | null }
  members: Member[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export default function AgenciaView({ user, members }: Props) {
  const { lang, setLang } = useLanguage()
  const [name,        setName]        = useState(user.name)
  const [currentPw,  setCurrentPw]   = useState('')
  const [newPw,      setNewPw]       = useState('')
  const [showCur,    setShowCur]     = useState(false)
  const [showNew,    setShowNew]     = useState(false)
  const [saving,     setSaving]      = useState(false)
  const [savingPw,   setSavingPw]    = useState(false)
  const [nameOk,     setNameOk]      = useState(false)
  const [pwOk,       setPwOk]        = useState(false)
  const [nameErr,    setNameErr]     = useState('')
  const [pwErr,      setPwErr]       = useState('')

  async function saveName() {
    if (!name.trim()) { setNameErr('Nome não pode ser vazio.'); return }
    setSaving(true); setNameErr(''); setNameOk(false)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) { setNameOk(true); setTimeout(() => setNameOk(false), 3000) }
    else { const d = await res.json(); setNameErr(d.error ?? 'Erro ao salvar.') }
    setSaving(false)
  }

  async function savePassword() {
    if (!currentPw || newPw.length < 6) {
      setPwErr('Senha atual obrigatória e nova senha com mínimo 6 caracteres.')
      return
    }
    setSavingPw(true); setPwErr(''); setPwOk(false)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    if (res.ok) {
      setPwOk(true); setCurrentPw(''); setNewPw('')
      setTimeout(() => setPwOk(false), 3000)
    } else {
      const d = await res.json(); setPwErr(d.error ?? 'Erro ao alterar senha.')
    }
    setSavingPw(false)
  }

  const roleBadge = user.role === 'admin' ? 'Administrador' : 'Travel Advisor'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div>
        <p className="section-label mb-1">Configurações</p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
          Meu Perfil
        </h1>
      </div>

      {/* Identity card */}
      <div className="card card-gold">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={52} editable />
          <div className="min-w-0">
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>{user.name}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {user.role === 'admin' && <IconFounder size={11} style={{ color: 'var(--tdgflow-navy)' }} />}
              <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>{roleBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Nome de exibição</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome completo"
          />
          <button
            onClick={saveName}
            disabled={saving || name.trim() === user.name}
            className="btn-gold"
            style={{ padding: '10px 14px', fontSize: '0.8125rem', flexShrink: 0 }}
          >
            {saving
              ? <Loader size={13} className="animate-spin" />
              : nameOk
                ? <CheckCircle size={13} />
                : <Save size={13} />}
            {nameOk ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
        {nameErr && <p className="text-xs" style={{ color: 'var(--tdgflow-error)' }}>{nameErr}</p>}
      </div>

      {/* Change password */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Alterar senha</h3>
        <div className="space-y-2">
          {/* Current password */}
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showCur ? 'text' : 'password'}
              placeholder="Senha atual"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowCur(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--tdgflow-text-muted)', display: 'flex', alignItems: 'center' }}
              tabIndex={-1}
            >
              {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {/* New password */}
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showNew ? 'text' : 'password'}
              placeholder="Nova senha (mín. 6 caracteres)"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--tdgflow-text-muted)', display: 'flex', alignItems: 'center' }}
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {pwErr && <p className="text-xs" style={{ color: 'var(--tdgflow-error)' }}>{pwErr}</p>}
        <button
          onClick={savePassword}
          disabled={savingPw || !currentPw || newPw.length < 6}
          className="btn-gold"
          style={{ padding: '9px 16px', fontSize: '0.8125rem' }}
        >
          {savingPw
            ? <Loader size={13} className="animate-spin" />
            : pwOk
              ? <CheckCircle size={13} />
              : <Save size={13} />}
          {pwOk ? 'Senha alterada!' : 'Alterar senha'}
        </button>
      </div>

      {/* Idioma — mudou pra cá (01/08, painel arquiteto/designer/UX): preferência
          escolhida uma vez na vida do usuário não merece imóvel fixo na
          sidebar; era 1 dos 6 blocos que sobrecarregavam o rodapé lá. */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Idioma</h3>
        <div className="flex items-center gap-2">
          {(['pt-BR', 'en', 'es'] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? 'var(--tdgflow-navy-subtle)' : 'none',
                border: lang === l ? '1px solid var(--tdgflow-navy-ring)' : '1px solid var(--tdgflow-border)',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: lang === l ? 700 : 400,
                letterSpacing: '0.04em',
                color: lang === l ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)',
                transition: 'all 150ms',
              }}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Agency */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)' }}
          >
            <IconAgency size={16} style={{ color: 'var(--tdgflow-navy)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>{user.agency || '—'}</p>
            <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>Travel Designers Group</p>
          </div>
        </div>

        {members.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Advisors ({members.length})
            </p>
            <div className="space-y-1.5">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', color: 'var(--tdgflow-text-secondary)' }}
                  >
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--tdgflow-text-primary)' }}>{m.name}</span>
                      {m.email === user.email && (
                        <span className="badge badge-gold" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>você</span>
                      )}
                      {m.role === 'admin' && <IconFounder size={10} style={{ color: 'var(--tdgflow-navy)' }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--tdgflow-text-muted)' }}>
                    <IconCalendar size={10} />
                    <span style={{ fontSize: '0.625rem' }}>{formatDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* DNA de marca — logo + cor de destaque da agência */}
      <BrandSettings userRole={user.role} />

      {/* GUEST showcase + activation request */}
      <GuestActivationCard userRole={user.role} />

    </div>
  )
}
