'use client'

import { useEffect, useState } from 'react'
import { BookUser, ScanLine, Wallet, MessageCircle, Loader2, CheckCircle2, Clock3, Send, Mail } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { fetchGuestAccessStatus, requestGuestAccess, type GuestAccessResult } from '@/lib/guest-access-client'

interface Props {
  userRole: string
}

const ADMIN_ROLES = new Set(['agency_admin', 'admin'])

const FEATURES = [
  {
    icon: BookUser,
    iconColor: 'var(--tdgflow-navy)',
    iconBg: 'var(--tdgflow-navy-subtle)',
    title: 'Cardex por pessoa',
    description: 'Histórico completo de cada cliente ou hóspede — viagens, preferências e documentos — sempre à mão, não apenas a última transação.',
  },
  {
    icon: ScanLine,
    iconColor: 'var(--tdgflow-accent-info)',
    iconBg: 'var(--tdgflow-accent-info-subtle)',
    title: 'Cotações profissionais em PDF',
    description: 'Moodboard visual e leitura automática de passaporte por OCR deixam cada proposta pronta para impressionar em minutos.',
  },
  {
    icon: Wallet,
    iconColor: 'var(--tdgflow-success)',
    iconBg: 'var(--tdgflow-success-subtle)',
    title: 'Controle financeiro completo',
    description: 'Comissões, splits entre agências e centro de custo organizados automaticamente, sem planilhas paralelas.',
  },
  {
    icon: MessageCircle,
    iconColor: 'var(--tdgflow-gold-dim)',
    iconBg: 'var(--tdgflow-gold-subtle)',
    title: 'Leads qualificados automaticamente',
    description: 'Leads são qualificados automaticamente e o cadastro do cliente é enriquecido a cada conversa, sem trabalho manual.',
  },
] as const

function formatDateTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function GuestActivationCard({ userRole }: Props) {
  const [state, setState]         = useState<GuestAccessResult>({ status: 'none', requestedAt: null, requestedByName: null })
  const [loading, setLoading]     = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    fetchGuestAccessStatus().then(r => { setState(r); setLoading(false) })
  }, [])

  async function handleRequest() {
    setRequesting(true); setRequestError('')
    const result = await requestGuestAccess()
    if (result.status === 'error') { setRequestError(result.message); setRequesting(false); return }
    setState(result)
    setRequesting(false)
  }

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <Skeleton width={110} height={9} />
          <div style={{ height: 8 }} />
          <Skeleton width={220} height={16} />
          <div style={{ height: 8 }} />
          <Skeleton width={280} height={11} />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: '14px 16px' }}>
              <div className="flex items-start gap-3">
                <Skeleton width={36} height={36} borderRadius={10} />
                <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton width={160} height={13} />
                  <Skeleton width="100%" height={11} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state.status === 'no_agency') return null

  const canRequest = ADMIN_ROLES.has(userRole)
  // 'rejected' and a failed status fetch both fall back to the same
  // "not yet requested" experience — never dead-end the user.
  const effectiveStatus: 'none' | 'pending' | 'approved' =
    state.status === 'pending' || state.status === 'approved' ? state.status : 'none'

  const requestedAtLabel = effectiveStatus !== 'none' && state.status !== 'error' ? formatDateTime(state.requestedAt) : null
  const requestedByName  = effectiveStatus !== 'none' && state.status !== 'error' ? state.requestedByName : null

  let statusPanel: React.ReactNode

  if (effectiveStatus === 'pending') {
    statusPanel = (
      <div className="card" style={{ marginTop: 12 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tdgflow-accent-warm-subtle)', border: '1px solid #F5D99A' }}>
            <Clock3 size={16} style={{ color: 'var(--tdgflow-accent-warm)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Pedido enviado</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.55 }}>
          Nossa equipe vai entrar em contato para ativar o GUEST da sua agência.
          {requestedByName && <> Solicitado por <strong style={{ color: 'var(--tdgflow-text-secondary)' }}>{requestedByName}</strong>{requestedAtLabel && <> em {requestedAtLabel}</>}.</>}
        </p>
      </div>
    )
  } else if (effectiveStatus === 'approved') {
    statusPanel = (
      <div className="card" style={{ marginTop: 12 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tdgflow-success-subtle)', border: '1px solid var(--tdgflow-success)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--tdgflow-success)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>GUEST ativado para a sua agência</p>
        </div>
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.55 }}>
          <Mail size={11} style={{ flexShrink: 0 }} /> Acesso enviado por e-mail pela nossa equipe.
        </p>
      </div>
    )
  } else if (canRequest) {
    statusPanel = (
      <div className="card" style={{ marginTop: 12 }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tdgflow-text-primary)' }}>Ative o GUEST para a sua agência</p>
        <p className="text-xs mb-3" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.55 }}>
          O GUEST está incluso sem custo por 12 meses para agências membro TDG. Hoje o GUEST e o TDG Flow são sistemas independentes — ao solicitar, nossa equipe entra em contato para ativar o acesso manualmente.
        </p>
        {requestError && <p className="text-xs mb-2" style={{ color: 'var(--tdgflow-error)' }}>{requestError}</p>}
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="btn-gold"
          style={{ padding: '10px 16px', fontSize: '0.8125rem' }}
        >
          {requesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {requesting ? 'Enviando pedido…' : 'Solicitar ativação do GUEST'}
        </button>
      </div>
    )
  } else {
    statusPanel = (
      <div className="card" style={{ marginTop: 12 }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tdgflow-text-primary)' }}>GUEST — CRM da sua agência</p>
        <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.55 }}>
          Peça para o administrador da sua agência ativar o GUEST.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p className="section-label mb-1">Incluso no seu plano</p>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>Conheça o GUEST</h2>
          <span className="badge badge-gold" style={{ fontSize: '0.55rem' }}>GUEST</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--tdgflow-text-muted)' }}>
          O CRM da Bemgsy para agências Founder Member — histórico de clientes, cotações profissionais e leads qualificados automaticamente, tudo em um só lugar.
        </p>
      </div>

      <div className="space-y-3">
        {FEATURES.map(({ icon: Icon, iconColor, iconBg, title, description }) => (
          <div key={title} className="card" style={{ padding: '14px 16px' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>{title}</span>
                <p className="text-xs mt-1" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.55 }}>{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {statusPanel}
    </div>
  )
}
