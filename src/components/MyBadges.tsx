'use client'

import { useState, useEffect } from 'react'
import { Award } from 'lucide-react'

/* "Minhas conquistas" (decisão #21 do plano TDG Knowledge Base) — badges
   de expertise real (Voz de [País], Referência em [Categoria], Pioneira).
   Não é "Minha atividade" (Analytics, métrica) — é identidade/reconhecimento
   nomeado, mais parecido com o selo "Membro Fundador" do rodapé. */

interface Badge {
  badge_type: 'voz_do_destino' | 'referencia_categoria' | 'pioneira'
  context: string
  hotel_id: string | null
  hotel_name: string | null
  earned_at: string
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  hotel: 'Hotéis', beach_club: 'Beach Clubs', transfer: 'Transfers',
  guide: 'Guias', restaurant: 'Restaurantes', dmc: 'DMCs', other: 'Fornecedores',
}

function badgeLabel(b: Badge): string {
  if (b.badge_type === 'voz_do_destino') return `Voz de ${b.context}`
  if (b.badge_type === 'referencia_categoria') return `Referência em ${ENTITY_TYPE_LABEL[b.context] ?? b.context}`
  return `Pioneira${b.hotel_name ? ` · ${b.hotel_name}` : ''}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function MyBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/badges')
      .then(res => res.ok ? res.json() : { badges: [] })
      .then(data => { setBadges(data.badges ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null

  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--tdgflow-text-primary)' }}>Minhas conquistas</h3>

      {badges.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)', lineHeight: 1.55 }}>
          Nenhum selo conquistado ainda. Suas próximas dicas confirmadas pela rede podem virar um.
        </p>
      ) : (
        <div className="space-y-2">
          {badges.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: 'var(--tdgflow-gold-subtle)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-gold-dim)' }}
              >
                <Award size={14} style={{ color: 'var(--tdgflow-gold-dim)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--tdgflow-text-primary)' }}>{badgeLabel(b)}</p>
                <p className="text-xs" style={{ color: 'var(--tdgflow-text-muted)' }}>conquistado em {formatDate(b.earned_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
