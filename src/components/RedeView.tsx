'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TdgIconSprite from '@/components/TdgIconSprite'
import HoteisView from '@/components/HoteisView'
import ContatosLensView from '@/components/ContatosLensView'

type Lens = 'fornecedores' | 'contatos'

/* ── Contact Hub ───────────────────────────────────────────────────────
   Unifica o que eram dois itens de menu separados ("Fornecedores" e
   "Rede/Contatos") num único hub com duas lentes — combinado direto da
   reunião com Adriano ("diferenciar hotéis parceiros e contatos em um
   contact hub") e revisado pelo painel Tesla (designer/arquiteto/UX
   expert): segmented control sempre visível, não abas escondidas; sem
   header duplicado — cada lente já tem o próprio título/busca/filtros,
   este shell só troca qual delas está montada. */
export default function RedeView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialLens = (searchParams.get('tab') === 'contatos' ? 'contatos' : 'fornecedores') as Lens
  const [lens, setLens] = useState<Lens>(initialLens)

  useEffect(() => {
    const fromUrl = searchParams.get('tab') === 'contatos' ? 'contatos' : 'fornecedores'
    setLens(fromUrl as Lens)
  }, [searchParams])

  function selectLens(next: Lens) {
    setLens(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.replace(`/flow/rede?${params.toString()}`, { scroll: false })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TdgIconSprite />

      {/* Faixa fina — só o segmented control, nenhum título grande
          duplicando o que a lente ativa já mostra */}
      <div style={{ flexShrink: 0, padding: '14px 20px 0', borderBottom: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)' }}>
        <p style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--tdgflow-accent-warm)', marginBottom: 8,
        }}>
          <svg style={{ width: 10, height: 10, stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <use href="#i-compass" />
          </svg>
          Rede TDG
        </p>
        <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, background: 'var(--tdgflow-bg)', marginBottom: 10 }}>
          {(['fornecedores', 'contatos'] as const).map(l => (
            <button
              key={l}
              onClick={() => selectLens(l)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: lens === l ? 600 : 400,
                cursor: 'pointer', transition: 'all 150ms', border: 'none',
                background: lens === l ? 'var(--tdgflow-surface)' : 'transparent',
                color: lens === l ? 'var(--tdgflow-text-primary)' : 'var(--tdgflow-text-muted)',
                boxShadow: lens === l ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {l === 'fornecedores' ? 'Fornecedores' : 'Contatos'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {lens === 'fornecedores' ? <HoteisView /> : <ContatosLensView />}
      </div>
    </div>
  )
}
