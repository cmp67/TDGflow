'use client'

import React, { useEffect, useState } from 'react'
import { Coins, X } from 'lucide-react'
import { TIERS, type TierId } from '@/lib/credits'
import {
  fetchOwnBalance, buyTopUp,
  type AgencyBalance, type OwnBalanceResult,
} from '@/lib/topup-client'

function numFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Tier picker modal ─────────────────────────────────────────────────────

function TopUpModal({ currentTier, onClose, onBought }: {
  currentTier: TierId
  onClose:     () => void
  onBought:    (balance: AgencyBalance) => void
}) {
  const [selected, setSelected] = useState<TierId | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const buyableTiers = TIERS.filter(t => t.credits !== null)

  async function handleConfirm() {
    if (!selected) return
    setLoading(true); setError('')

    const result = await buyTopUp(selected)

    if (result.status === 'ok') {
      onBought(result.balance)
    } else if (result.status === 'unauthenticated') {
      setError('Sessão expirada — atualize a página e tente novamente.')
    } else if (result.status === 'no_agency') {
      setError('Sua conta não está vinculada a uma agência. Fale com o suporte.')
    } else if (result.status === 'invalid_tier') {
      setError(result.message)
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(17,38,48,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#112630', margin: 0 }}>Comprar top-up de Lumis</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B8D0D5' }}>
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#7BA8B2', margin: '0 0 18px' }}>
          Selecione o pacote para o saldo da sua agência.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {buyableTiers.map(t => {
            const active  = selected === t.id
            const current = t.id === currentTier
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left',
                  border: active ? `2px solid ${t.color}` : '1.5px solid #D8E6EA',
                  background: active ? t.bg : '#fff', transition: 'all 0.12s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#112630' }}>{t.name}</span>
                    {current && <span style={{ fontSize: '0.5rem', fontWeight: 700, color: t.color, background: t.bg, borderRadius: 20, padding: '1px 6px' }}>atual</span>}
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#7BA8B2', margin: '2px 0 0' }}>{t.label}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: t.color, margin: 0 }}>{numFmt(t.credits!)}</p>
                  <p style={{ fontSize: '0.5rem', color: '#7BA8B2', margin: '1px 0 0' }}>Lumis</p>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#112630', margin: '3px 0 0' }}>{t.priceLabel}</p>
                </div>
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: '0.625rem', color: '#B8D0D5', lineHeight: 1.5, margin: '0 0 14px' }}>
          A cobrança deste pacote é combinada e processada separadamente com a Bemgsy — os Lumis já entram no saldo da sua agência assim que a compra é confirmada aqui.
        </p>

        {error && <p style={{ fontSize: '0.75rem', color: '#C62828', marginBottom: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid #D8E6EA', background: '#fff', fontSize: '0.875rem', color: '#4A7580', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: selected && !loading ? '#008C94' : '#B8D0D5', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: selected && !loading ? 'pointer' : 'default', transition: 'background 0.12s' }}
          >
            {loading ? 'Processando…' : 'Confirmar compra'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main card ──────────────────────────────────────────────────────────────

export default function MyLumisTopUp() {
  const [state, setState]         = useState<OwnBalanceResult>({ status: 'ready', balance: { balance: 0, tier: 'starter' } })
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [justBought, setJustBought] = useState(false)

  function load() {
    setLoading(true)
    fetchOwnBalance().then(result => { setState(result); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function handleBought(balance: AgencyBalance) {
    setState({ status: 'ready', balance })
    setShowModal(false)
    setJustBought(true)
    setTimeout(() => setJustBought(false), 3500)
  }

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #E4EEF0', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: '0.75rem', color: '#7BA8B2', margin: 0 }}>Carregando saldo…</p>
      </div>
    )
  }

  if (state.status === 'unauthenticated') {
    return (
      <div style={{ background: '#FEF3E2', border: '1px solid #F5D9A8', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: '0.75rem', color: '#7A4F10', margin: 0 }}>Sua sessão expirou. Atualize a página para continuar.</p>
      </div>
    )
  }

  if (state.status === 'no_agency') {
    return (
      <div style={{ background: '#F8FBFC', border: '1px dashed #D8E6EA', borderRadius: 14, padding: '14px 16px' }}>
        <p style={{ fontSize: '0.75rem', color: '#4A7580', margin: 0 }}>
          Sua conta ainda não está vinculada a uma agência — fale com o suporte para habilitar a compra de Lumis.
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={{ background: '#FFEBEE', border: '1px solid #F5C6CB', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontSize: '0.75rem', color: '#C62828', margin: 0 }}>{state.message}</p>
        <button
          onClick={load}
          style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#C62828', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const { balance } = state
  const tierDef = TIERS.find(t => t.id === balance.tier)

  return (
    <>
      {showModal && (
        <TopUpModal
          currentTier={balance.tier}
          onClose={() => setShowModal(false)}
          onBought={handleBought}
        />
      )}
      <div style={{ background: '#fff', border: '1px solid #E4EEF0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #F0F5F7', background: '#F8FBFC', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Coins size={12} style={{ color: '#008C94' }} />
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7BA8B2', margin: 0, flex: 1 }}>
            Saldo comprado da agência
          </p>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {justBought && (
            <p style={{ fontSize: '0.75rem', color: '#2E7D32', background: '#E8F5E9', borderRadius: 7, padding: '6px 10px', margin: 0 }}>
              Compra confirmada — Lumis já adicionados ao saldo da sua agência.
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#112630', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {numFmt(balance.balance)}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#7BA8B2', marginLeft: 4 }}>lm</span>
              </p>
              {tierDef && (
                <p style={{ fontSize: '0.6875rem', color: '#7BA8B2', margin: '4px 0 0' }}>
                  Plano atual: <strong style={{ color: '#112630' }}>{tierDef.name}</strong>
                </p>
              )}
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: 'none', background: '#C97B20', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              <Coins size={12} />
              Comprar top-up
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
