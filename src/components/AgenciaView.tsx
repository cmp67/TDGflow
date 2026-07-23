'use client'

import { useState } from 'react'
import { Building2, Crown, Calendar, Save, Loader, Eye, EyeOff, CheckCircle, Users2, FileText, Palette, Image, BookOpen, Camera, UserSquare2, Sparkles, Bot } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'

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
        <h1 className="text-xl font-semibold" style={{ color: '#112630', letterSpacing: '-0.02em' }}>
          Meu Perfil
        </h1>
      </div>

      {/* Identity card */}
      <div className="card card-gold">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={52} editable />
          <div className="min-w-0">
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#112630', letterSpacing: '-0.01em' }}>{user.name}</p>
            <p style={{ fontSize: '0.8125rem', color: '#4A7580', marginTop: 2 }}>{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {user.role === 'admin' && <Crown size={11} style={{ color: '#008C94' }} />}
              <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>{roleBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: '#112630' }}>Nome de exibição</h3>
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
        {nameErr && <p className="text-xs" style={{ color: '#C0392B' }}>{nameErr}</p>}
      </div>

      {/* Change password */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: '#112630' }}>Alterar senha</h3>
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
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4A7580', display: 'flex', alignItems: 'center' }}
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
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4A7580', display: 'flex', alignItems: 'center' }}
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {pwErr && <p className="text-xs" style={{ color: '#C0392B' }}>{pwErr}</p>}
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

      {/* Agency */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-ring)' }}
          >
            <Building2 size={16} style={{ color: '#008C94' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#112630' }}>{user.agency || '—'}</p>
            <p className="text-xs" style={{ color: '#4A7580' }}>Travel Designers Group</p>
          </div>
        </div>

        {members.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#4A7580' }}>
              Advisors ({members.length})
            </p>
            <div className="space-y-1.5">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: 'var(--surface-high)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: '#104C64' }}
                  >
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium" style={{ color: '#112630' }}>{m.name}</span>
                      {m.email === user.email && (
                        <span className="badge badge-gold" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>você</span>
                      )}
                      {m.role === 'admin' && <Crown size={10} style={{ color: '#008C94' }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" style={{ color: '#4A7580' }}>
                    <Calendar size={10} />
                    <span style={{ fontSize: '0.625rem' }}>{formatDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Roadmap */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <p className="section-label mb-1">Em desenvolvimento</p>
          <h2 className="text-base font-semibold" style={{ color: '#112630', letterSpacing: '-0.01em' }}>Roadmap da plataforma</h2>
          <p className="text-xs mt-1" style={{ color: '#4A7580' }}>Funcionalidades previstas para a sua agência credenciada.</p>
        </div>

        <div className="space-y-3">

          {/* CRM */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E6F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users2 size={16} style={{ color: '#008C94' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#112630' }}>CRM</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FEF3E2', color: '#C97B20', borderRadius: 999, padding: '2px 7px', border: '1px solid #F5D99A' }}>Em breve</span>
                </div>
                <p className="text-xs" style={{ color: '#4A7580', lineHeight: 1.55 }}>
                  Gestão de clientes, histórico de viagens, preferências e oportunidades de upsell — tudo centralizado para a sua equipe.
                </p>
              </div>
            </div>
          </div>

          {/* Proposta Maker */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3EEF9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={16} style={{ color: '#6B4FA0' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#112630' }}>Proposta Maker</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FEF3E2', color: '#C97B20', borderRadius: 999, padding: '2px 7px', border: '1px solid #F5D99A' }}>Em breve</span>
                </div>
                <p className="text-xs" style={{ color: '#4A7580', lineHeight: 1.55 }}>
                  Geração automática de propostas personalizadas com base nas dicas dos advisors, ofertas ativas e perfil do cliente.
                </p>
              </div>
            </div>
          </div>

          {/* AI Crew */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E8F1F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={16} style={{ color: '#004A7C' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#112630' }}>AI Crew</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FEF3E2', color: '#C97B20', borderRadius: 999, padding: '2px 7px', border: '1px solid #F5D99A' }}>Em breve</span>
                </div>
                <p className="text-xs" style={{ color: '#4A7580', lineHeight: 1.55 }}>
                  Agentes de IA dedicados à sua agência — atendimento automatizado via WhatsApp, qualificação de leads e suporte 24/7 com a voz e identidade da sua marca.
                </p>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Palette size={16} style={{ color: '#C0406B' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#112630' }}>Branding</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FEF3E2', color: '#C97B20', borderRadius: 999, padding: '2px 7px', border: '1px solid #F5D99A' }}>Em breve</span>
                </div>
                <p className="text-xs" style={{ color: '#4A7580', lineHeight: 1.55, marginBottom: 10 }}>
                  Gestão de marca completa para a sua agência — todos os ativos num só lugar.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { icon: Sparkles,    label: 'Logótipo' },
                    { icon: BookOpen,    label: 'Brand Guideline' },
                    { icon: Camera,      label: 'Fotografias' },
                    { icon: UserSquare2, label: 'Bios' },
                    { icon: Image,       label: 'Manifestos' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: '#FEF0F5', borderRadius: 8, border: '1px solid #FAD5E3' }}>
                      <Icon size={11} style={{ color: '#C0406B', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.6875rem', color: '#7A1F40', fontWeight: 500 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
