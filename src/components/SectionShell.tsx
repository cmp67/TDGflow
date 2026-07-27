'use client'

import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  description: string
  icon: LucideIcon
  soon?: boolean
  soonMessage?: string
  children?: React.ReactNode
}

export default function SectionShell({ title, description, icon: Icon, soon, soonMessage, children }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid var(--tdgflow-border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy-ring)' }}
        >
          <Icon size={15} style={{ color: 'var(--tdgflow-navy)' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>{title}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tdgflow-text-muted)' }}>{description}</p>
        </div>
        {soon && (
          <span
            className="ml-auto text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--tdgflow-surface-high)', color: 'var(--tdgflow-text-muted)', fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Em breve
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children ?? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)' }}
            >
              <Icon size={24} style={{ color: 'var(--tdgflow-text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--tdgflow-text-secondary)' }}>
              {soon ? soonMessage : `${title} em desenvolvimento`}
            </p>
            {!soon && (
              <p className="text-xs max-w-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>
                Esta seção estará disponível em breve com dados reais dos parceiros.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
