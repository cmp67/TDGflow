'use client'

import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { fetchSubscriptionStatus, type SubscriptionStatusResult } from '@/lib/subscription-status-client'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 12 // ~36s — o webhook do Asaas geralmente chega em poucos segundos

const PLAN_NAMES: Record<string, string> = { growth: 'Growth' }

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtAmount(n: number | null) {
  if (n === null) return null
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SubscriptionConfirmation() {
  const [result, setResult] = useState<SubscriptionStatusResult>({ status: 'pending' })
  const [gaveUp, setGaveUp] = useState(false)
  const attemptsRef = useRef(0)

  async function poll() {
    const r = await fetchSubscriptionStatus()
    setResult(r)
    return r
  }

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function tick() {
      const r = await poll()
      if (cancelled) return

      const terminal = r.status === 'authorized' || r.status === 'rejected' || r.status === 'cancelled'
                     || r.status === 'unauthenticated' || r.status === 'no_agency' || r.status === 'not_found'
                     || r.status === 'error'
      if (terminal) return

      attemptsRef.current += 1
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setGaveUp(true)
        return
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  function retryNow() {
    setGaveUp(false)
    attemptsRef.current = 0
    poll()
  }

  const stillChecking = (result.status === 'pending' || result.status === 'none') && !gaveUp

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tdgflow-bg)' }}>
      <div className="w-full max-w-sm text-center" style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 16, padding: '32px 24px' }}>

        {stillChecking && (
          <>
            <Loader2 className="animate-spin mx-auto mb-4" size={32} style={{ color: 'var(--tdgflow-navy)' }} />
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
              Confirmando sua assinatura…
            </h1>
            <p className="text-sm" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Estamos aguardando a confirmação do pagamento. Isso leva só alguns segundos.
            </p>
          </>
        )}

        {(result.status === 'pending' || result.status === 'none') && gaveUp && (
          <>
            <Clock className="mx-auto mb-4" size={32} style={{ color: 'var(--tdgflow-accent-warm)' }} />
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
              Ainda processando
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--tdgflow-text-muted)' }}>
              A confirmação está demorando um pouco mais que o normal. Você recebe acesso automaticamente assim que for aprovado — pode fechar esta página com segurança.
            </p>
            <button
              onClick={retryNow}
              style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Verificar novamente
            </button>
          </>
        )}

        {result.status === 'authorized' && (
          <>
            <CheckCircle2 className="mx-auto mb-4" size={32} style={{ color: 'var(--tdgflow-success)' }} />
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
              Assinatura {PLAN_NAMES[result.planTier] ?? result.planTier} ativada
            </h1>
            <p className="text-sm mb-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
              Sua agência já está com acesso liberado.
            </p>
            {fmtAmount(result.transactionAmount) && (
              <p className="text-sm mb-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
                Cobrança mensal: <strong style={{ color: 'var(--tdgflow-text-primary)' }}>{fmtAmount(result.transactionAmount)}</strong>
              </p>
            )}
            {fmtDate(result.nextPaymentDate) && (
              <p className="text-sm mb-4" style={{ color: 'var(--tdgflow-text-muted)' }}>
                Próxima cobrança: <strong style={{ color: 'var(--tdgflow-text-primary)' }}>{fmtDate(result.nextPaymentDate)}</strong>
              </p>
            )}
            <Link href="/flow/billing" style={{ display: 'inline-block', marginTop: 8, padding: '9px 16px', borderRadius: 9, background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
              Ir para o painel de billing
            </Link>
          </>
        )}

        {(result.status === 'rejected' || result.status === 'cancelled') && (
          <>
            <XCircle className="mx-auto mb-4" size={32} style={{ color: 'var(--tdgflow-error)' }} />
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
              {result.status === 'rejected' ? 'Pagamento recusado' : 'Assinatura cancelada'}
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--tdgflow-text-muted)' }}>
              {result.status === 'rejected'
                ? 'Não conseguimos confirmar o pagamento. Verifique os dados do cartão e tente novamente.'
                : 'Esta assinatura foi cancelada antes de ser concluída.'}
            </p>
            <Link href="/flow/billing" style={{ display: 'inline-block', padding: '9px 16px', borderRadius: 9, background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
              Tentar novamente
            </Link>
          </>
        )}

        {(result.status === 'unauthenticated' || result.status === 'no_agency' || result.status === 'not_found' || result.status === 'error') && (
          <>
            <XCircle className="mx-auto mb-4" size={32} style={{ color: 'var(--tdgflow-error)' }} />
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
              Não foi possível confirmar
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--tdgflow-text-muted)' }}>
              {result.status === 'unauthenticated' && 'Sua sessão expirou — atualize a página e faça login novamente.'}
              {result.status === 'no_agency' && 'Sua conta não está vinculada a uma agência. Fale com o suporte.'}
              {result.status === 'not_found' && 'Não encontramos essa assinatura vinculada à sua agência.'}
              {result.status === 'error' && result.message}
            </p>
            <Link href="/flow/billing" style={{ display: 'inline-block', padding: '9px 16px', borderRadius: 9, background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
              Voltar para billing
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
