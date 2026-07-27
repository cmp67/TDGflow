'use client'

import { useState } from 'react'
import AudioRecord from '@/components/AudioRecord'
import AudioQueue from '@/components/AudioQueue'

/* ── Ícones próprios — traço só (regra de personalidade Bemgsy). ──── */
function IconMic({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  )
}
function IconQueue({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}

export default function GravacoesPage() {
  const [showRecord, setShowRecord] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [queueCount, setQueueCount] = useState(0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--tdgflow-border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Da mesa</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tdgflow-text-muted)' }}>
            Matéria-prima que vira dica, review ou contato depois de processada — não é conteúdo pra navegar direto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecord(true)}
            className="btn-gold"
            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <IconMic size={14} /> Nova gravação
          </button>
          <button
            onClick={() => setShowQueue(true)}
            className="btn-ghost relative"
            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <IconQueue size={14} /> Fila
            {queueCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none"
                style={{ background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.625rem' }}
              >
                {queueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-center py-16" style={{ color: 'var(--tdgflow-text-muted)' }}>
          Clique em "Nova gravação" para registrar uma reunião.
        </p>
      </div>

      {showRecord && (
        <AudioRecord
          onSaved={() => { setQueueCount(c => c + 1); setShowRecord(false) }}
          onClose={() => setShowRecord(false)}
        />
      )}
      {showQueue && <AudioQueue onClose={() => { setShowQueue(false); setQueueCount(0) }} />}
    </div>
  )
}
