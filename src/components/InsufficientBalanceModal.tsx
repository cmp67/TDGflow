'use client'

import { Coins, ShoppingCart, ArrowLeftRight, Clock } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function InsufficientBalanceModal({ onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(17,38,48,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 360,
          padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent-warm-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Coins size={22} style={{ color: 'var(--accent-warm)' }} />
          </div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Saldo de Lumis esgotado
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
            A sua agência não tem Lumis suficientes para esta ação. Escolha uma das opções abaixo.
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--gold-subtle)', borderRadius: 12, border: '1px solid #B8E0E3' }}>
            <ShoppingCart size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Comprar Lumis</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>O admin da sua agência pode adquirir Lumis adicionais em <strong>Serviços & Custos</strong>.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--accent-info-subtle)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <ArrowLeftRight size={15} style={{ color: 'var(--accent-info)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Solicitar transferência</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Outra agência do grupo pode transferir Lumis para a sua conta.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <Clock size={15} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Aguardar recarga</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>O saldo é recarregado mensalmente pelo admin TDG. Você continua com acesso a tudo que não consome Lumis.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
