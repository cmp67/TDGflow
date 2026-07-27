// Bloco de estatística "sem card" — número-chave solto sobre o fundo, sem
// borda nem caixa. Hierarquia vem de tipografia (tamanho/peso) e espaço em
// branco, não de moldura. Reserva-se `.card` (globals.css) pra conteúdo
// genuinamente agrupado/listável (linhas de tabela, itens de fila) — não pra
// todo número solto na tela.
//
// Benchmark: Stripe migrou o dashboard de "cheio de cards" pra layout sem
// cards em 2021; Linear usa peso/opacidade tipográfica pra separar o que é
// tarefa do que é orientação. Ver skill bemgsy-design § Benchmarks Externos.

import type { ReactNode } from 'react'

interface StatBlockProps {
  label: string
  value: ReactNode
  unit?: string
  helper?: ReactNode
  align?: 'left' | 'center'
}

export default function StatBlock({ label, value, unit, helper, align = 'left' }: StatBlockProps) {
  return (
    <div style={{ textAlign: align }}>
      <p style={{
        fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--tdgflow-text-faint)', margin: '0 0 8px',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '2rem', fontWeight: 800, color: 'var(--tdgflow-text-primary)', margin: 0,
        letterSpacing: '-0.03em', lineHeight: 1,
      }}>
        {value}
        {unit && (
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--tdgflow-text-faint)', marginLeft: 5 }}>
            {unit}
          </span>
        )}
      </p>
      {helper && (
        <div style={{ marginTop: 6, fontSize: '0.6875rem', color: 'var(--tdgflow-text-faint)' }}>
          {helper}
        </div>
      )}
    </div>
  )
}
