'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao redefinir senha.')
      return
    }
    setDone(true)
    setTimeout(() => router.push('/flow/login'), 2000)
  }

  if (!token) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.6 }}>
        Link inválido — falta o token de redefinição. Solicite um novo link em{' '}
        <Link href="/flow/esqueci-senha" style={{ color: 'var(--tdgflow-navy)' }}>Esqueci minha senha</Link>.
      </p>
    )
  }

  if (done) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--tdgflow-text-secondary)', lineHeight: 1.6 }}>
        Senha redefinida! Levando você para o login...
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Nova senha
        </label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
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
          Confirmar nova senha
        </label>
        <input
          className="input"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
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
          ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
          : <>Redefinir senha <ArrowRight size={14} /></>
        }
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tdgflow-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--tdgflow-navy)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tdg-mark-white.png" alt="TDG" style={{ height: 18, objectFit: 'contain' }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
            Redefinir senha
          </h1>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  )
}
