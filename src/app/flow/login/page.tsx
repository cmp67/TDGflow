'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Email ou senha incorretos.')
    } else {
      router.push('/flow/chat')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--tdgflow-bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo — mark real do TDG (mesmo asset do favicon/nav do site), não
            mais um badge de texto simulado em CSS. */}
        <div className="text-center mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--tdgflow-navy)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tdg-mark-white.png" alt="TDG" style={{ height: 18, objectFit: 'contain' }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
            TDG Flow
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
            Acesso exclusivo para agências credenciadas
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
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
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
            <div className="text-right mt-1.5">
              <Link href="/flow/esqueci-senha" className="text-xs no-underline" style={{ color: 'var(--tdgflow-text-muted)' }}>
                Esqueci minha senha
              </Link>
            </div>
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
              ? <><Loader2 size={14} className="animate-spin" /> Entrando...</>
              : <>Entrar <ArrowRight size={14} /></>
            }
          </button>
        </form>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Acesso restrito — Travel Designers Group
        </p>
      </motion.div>
    </div>
  )
}
