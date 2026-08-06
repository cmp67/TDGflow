'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setLoading(false)
    // Sempre mostra a mesma confirmação, sucesso ou erro de rede — a API já
    // responde genérico por design, não revelar mais informação aqui.
    setSent(true)
  }

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
            className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm mx-auto mb-5"
            style={{ background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', letterSpacing: '0.04em' }}
          >
            TDG
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
            Esqueci minha senha
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
            {sent
              ? 'Confira seu e-mail'
              : 'Informe o e-mail da sua conta pra receber um link de redefinição'}
          </p>
        </div>

        {sent ? (
          <p className="text-sm text-center" style={{ color: 'var(--tdgflow-text-secondary)', lineHeight: 1.6 }}>
            Se esse e-mail tiver uma conta aqui, você vai receber um link de redefinição — ele expira em 1 hora.
          </p>
        ) : (
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
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full mt-2"
              style={{ justifyContent: 'center', padding: '12px' }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <>Enviar link <ArrowRight size={14} /></>
              }
            </button>
          </form>
        )}

        <div className="text-center mt-8">
          <Link
            href="/flow/login"
            className="inline-flex items-center gap-1.5 text-xs no-underline"
            style={{ color: 'var(--tdgflow-text-muted)' }}
          >
            <ArrowLeft size={12} /> Voltar para o login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
