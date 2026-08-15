'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

interface Props {
  token:       string
  agencyName:  string
  role:        string
}

const MIN_PASSWORD_LENGTH = 8

export default function SignupView({ token, agencyName, role }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const roleLabel = role === 'agency_admin' ? 'administrador(a) da agência' : 'membro da equipe'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name: name.trim(), email: email.trim(), password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar conta.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/flow/login'), 2200)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tdgflow-bg)' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <CheckCircle2 size={32} style={{ color: 'var(--tdgflow-success)', margin: '0 auto 12px' }} />
          <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
            Conta criada!
          </h1>
          <p className="text-sm" style={{ color: 'var(--tdgflow-text-muted)' }}>
            Redirecionando para o login...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tdgflow-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--tdgflow-navy)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tdg-mark.png" alt="TDG" style={{ height: 18, objectFit: 'contain' }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
            Bem-vindo(a), {agencyName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
            Crie sua conta como {roleLabel} no TDG Flow.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Nome completo
            </label>
            <input
              className="input"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Email
            </label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Confirmar senha
            </label>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--tdgflow-error)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full mt-2"
            style={{ justifyContent: 'center', padding: '12px' }}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Criando conta...</>
              : <>Criar conta <ArrowRight size={14} /></>
            }
          </button>
        </form>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Travel Designers Group · TDG Flow
        </p>
      </motion.div>
    </div>
  )
}
