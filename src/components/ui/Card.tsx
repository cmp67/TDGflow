// Componente compartilhado pra conteúdo genuinamente agrupado/listável
// (linhas de tabela, itens de fila, seções com cabeçalho). Não usar pra
// números-chave soltos — ver StatBlock.tsx pra esse caso.
//
// Antes desta extração, cada tela desenhava o próprio "card" do zero em style
// inline (gap estrutural identificado no benchmark Stripe/Linear, skill
// bemgsy-design § Benchmarks Externos) — este componente é o ponto único de
// verdade daqui pra frente, envolvendo a classe `.card` já existente em
// globals.css.

import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  header?: ReactNode
  padding?: number | string
  style?: CSSProperties
  className?: string
}

export default function Card({ children, header, padding, style, className = '' }: CardProps) {
  if (header) {
    return (
      <div
        className={className}
        style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border-subtle)', borderRadius: 14, overflow: 'hidden', ...style }}
      >
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--tdgflow-border-subtle)', background: 'var(--tdgflow-bg)' }}>
          {header}
        </div>
        <div style={{ padding: padding ?? '14px 16px' }}>{children}</div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`} style={{ padding, ...style }}>
      {children}
    </div>
  )
}
