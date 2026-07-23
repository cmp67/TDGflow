'use client'

import { useState } from 'react'
import AudioRecord from '@/components/AudioRecord'
import AudioQueue from '@/components/AudioQueue'
import { Mic, List } from 'lucide-react'

export default function GravacoesPage() {
  const [showRecord, setShowRecord] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [queueCount, setQueueCount] = useState(0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#112630' }}>Gravações</h2>
          <p className="text-xs mt-0.5" style={{ color: '#4A7580' }}>
            Reuniões gravadas, transcritas e sumarizadas pela IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecord(true)}
            className="btn-gold"
            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <Mic size={14} /> Nova gravação
          </button>
          <button
            onClick={() => setShowQueue(true)}
            className="btn-ghost relative"
            style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <List size={14} /> Fila
            {queueCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none"
                style={{ background: 'var(--gold)', color: '#FFFFFF', fontSize: '0.625rem' }}
              >
                {queueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-center py-16" style={{ color: '#4A7580' }}>
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
