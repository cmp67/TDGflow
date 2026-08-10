'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Tag, Lightbulb, Mic, Megaphone, Award, X } from 'lucide-react'
import { sounds } from '@/lib/sounds'

interface Notification {
  id: string
  type: 'offer' | 'review' | 'recording' | 'content' | 'badge'
  title: string
  body: string
  time: string
  read: boolean
}

// Decisão #20 (Fase 7) — nunca tom de perda/fracasso, mesmo quando o
// título de "Voz de.../Referência em..." trocou de dono.
const BADGE_TYPE_LABEL: Record<string, (ctx: string) => string> = {
  voz_do_destino: ctx => `Voz de ${ctx}`,
  referencia_categoria: ctx => `Referência em ${ctx}`,
  pioneira: () => 'Pioneira',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `há ${days}d`
  if (hours > 0) return `há ${hours}h`
  if (mins > 0) return `há ${mins}min`
  return 'agora'
}

const ICON: Record<string, React.ReactNode> = {
  offer:     <Tag size={13} />,
  review:    <Lightbulb size={13} />,
  recording: <Mic size={13} />,
  content:   <Megaphone size={13} />,
  badge:     <Award size={13} />,
}

const ICON_COLOR: Record<string, string> = {
  offer:     'var(--tdgflow-navy)',
  review:    '#7DD3FC',
  recording: '#86EFAC',
  content:   'var(--tdgflow-gold-dim)',
  badge:     'var(--tdgflow-gold-dim)',
}

const CONTENT_CATEGORY_LABEL: Record<string, string> = {
  documento: 'Novo documento',
  video_ata: 'Novo vídeo/ata',
  comunicado: 'Novo comunicado',
}

interface Props {
  // 'right' (default) ancora o dropdown pela direita e abre pra esquerda —
  // seguro no header mobile (sino perto da borda direita da tela inteira).
  // 'left' ancora pela esquerda e abre pra direita — necessário na sidebar
  // desktop (208px de largura só; abrir pra esquerda sai da tela e é
  // cortado pelo overflow-hidden do shell raiz — bug real reportado 29/07).
  align?: 'left' | 'right'
  // 'light' (default) é o ícone escuro de sempre, pra fundo claro. 'dark' é
  // pro header navy do produto (30/07) — ícone claro, senão fica invisível.
  theme?: 'light' | 'dark'
}

const PANEL_WIDTH = 300

export default function NotificationBell({ align = 'right', theme = 'light' }: Props) {
  const iconColor = theme === 'dark' ? 'rgba(234,241,245,0.7)' : 'var(--tdgflow-text-muted)'
  const iconColorHover = theme === 'dark' ? '#EAF1F5' : 'var(--tdgflow-text-primary)'
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [mounted, setMounted] = useState(false)
  // Achado da Carla, 10/08 (bug tinha "voltado" — na verdade nunca tinha
  // sido corrigido de verdade): o dropdown vivia dentro do header navy, que
  // tem overflow:hidden pra recortar a animação da onda decorativa —
  // qualquer painel absoluto ali dentro é cortado, não importa align left ou
  // right. Fix real: portal pro body, posicionado pelas coordenadas de tela
  // do próprio sino, escapando de qualquer overflow ancestral.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const READ_KEY = 'tdg-notif-read'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    try {
      // Fetch context data for notifications
      const res = await fetch('/api/context')
      if (!res.ok) return
      const ctx = await res.json()

      const readIds: string[] = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')
      const notifs: Notification[] = []

      // Pending recordings — só da própria agência (escopado no /api/context)
      if (ctx.pending_recordings > 0) {
        const id = 'pending-recordings'
        notifs.push({
          id,
          type: 'recording',
          title: 'Gravações pendentes',
          body: `${ctx.pending_recordings} gravação${ctx.pending_recordings > 1 ? 'ões' : ''} da sua agência aguarda${ctx.pending_recordings > 1 ? 'm' : ''} processamento`,
          time: new Date().toISOString(),
          read: readIds.includes(id),
        })
      }

      // Expiring offers
      if (ctx.expiring_promotions?.length > 0) {
        ctx.expiring_promotions.forEach((p: { title: string; hotel_name: string; booking_deadline: string }) => {
          const id = `offer-${p.title}`
          const deadline = new Date(p.booking_deadline)
          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000)
          notifs.push({
            id,
            type: 'offer',
            title: `Oferta expira em ${daysLeft}d`,
            body: `${p.title} · ${p.hotel_name}`,
            time: p.booking_deadline,
            read: readIds.includes(id),
          })
        })
      }

      // Pedidos de ativação GUEST saíram do sino (29/07) — é fila de
      // aprovação/trabalho, não aviso passageiro. Agora é badge no item
      // "Billing" da nav (ver FlowShell.tsx), onde se resolve de fato.

      // Reviews this week — só da própria agência (escopado no /api/context)
      if (ctx.reviews_this_week > 0) {
        const id = 'reviews-week'
        notifs.push({
          id,
          type: 'review',
          title: 'Atividade da sua agência',
          body: `${ctx.reviews_this_week} nova${ctx.reviews_this_week > 1 ? 's' : ''} dica${ctx.reviews_this_week > 1 ? 's' : ''} registrada${ctx.reviews_this_week > 1 ? 's' : ''} esta semana`,
          time: new Date().toISOString(),
          read: readIds.includes(id),
        })
      }

      // Conteúdo novo na Central Bemgsy — broadcast pra rede inteira, não
      // escopado por agência (é a Bemgsy avisando todo mundo de propósito).
      if (ctx.new_partnership_content?.length > 0) {
        ctx.new_partnership_content.forEach((c: { id: string; category: string; title: string; created_at: string }) => {
          const id = `content-${c.id}`
          notifs.push({
            id,
            type: 'content',
            title: CONTENT_CATEGORY_LABEL[c.category] ?? 'Novo conteúdo da Bemgsy',
            body: `${c.title} — em Central Bemgsy`,
            time: c.created_at,
            read: readIds.includes(id),
          })
        })
      }

      // Badges (decisão #20) — ganho ou trocou de dono, nunca "perdeu"
      if (ctx.recent_badges_earned?.length > 0) {
        ctx.recent_badges_earned.forEach((b: { badge_type: string; context: string }) => {
          const id = `badge-earned-${b.badge_type}-${b.context}`
          const label = (BADGE_TYPE_LABEL[b.badge_type] ?? (() => b.badge_type))(b.context)
          notifs.push({
            id, type: 'badge',
            title: `Novo selo: ${label}`,
            body: 'Reconhecimento pela sua expertise real, visível pra rede.',
            time: new Date().toISOString(),
            read: readIds.includes(id),
          })
        })
      }
      if (ctx.recent_badges_lost?.length > 0) {
        ctx.recent_badges_lost.forEach((b: { badge_type: string; context: string }) => {
          const id = `badge-changed-${b.badge_type}-${b.context}`
          const label = (BADGE_TYPE_LABEL[b.badge_type] ?? (() => b.badge_type))(b.context)
          notifs.push({
            id, type: 'badge',
            title: `${label} tem novo titular`,
            body: 'A rede está crescendo — a sua experiência ainda conta muito por lá.',
            time: new Date().toISOString(),
            read: readIds.includes(id),
          })
        })
      }

      setNotifications(notifs)
    } catch { /* silently ignore */ }
  }

  function markAllRead() {
    const ids = notifications.map(n => n.id)
    localStorage.setItem(READ_KEY, JSON.stringify(ids))
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleOpen() {
    sounds.nav()
    if (!open && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      const left = align === 'left' ? rect.left : rect.right - PANEL_WIDTH
      const clampedLeft = Math.min(Math.max(left, 8), window.innerWidth - PANEL_WIDTH - 8)
      setPos({ top: rect.bottom + 8, left: clampedLeft })
      setTimeout(markAllRead, 1500)
    }
    setOpen(v => !v)
  }

  // Close on outside click — o painel agora vive num portal fora da árvore
  // do wrapper, então precisa checar os dois refs (botão + painel).
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (wrapRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter(n => !n.read).length

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 6, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          transition: 'color 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = iconColorHover)}
        onMouseLeave={e => (e.currentTarget.style.color = iconColor)}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: 2, right: 2,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--tdgflow-error)',
              border: '1.5px solid var(--tdgflow-surface)',
            }}
          />
        )}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: PANEL_WIDTH,
                background: 'var(--tdgflow-surface)',
                border: '1px solid var(--tdgflow-border)',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(28,20,16,0.14)',
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>
                Notificações
              </p>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 2 }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ height: 1, background: 'var(--tdgflow-border)' }} />

            {/* Items */}
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Bell size={20} style={{ color: 'var(--tdgflow-border-light)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>Sem notificações</p>
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--tdgflow-border)',
                      background: n.read ? 'transparent' : 'var(--tdgflow-navy-subtle)',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: ICON_COLOR[n.type],
                    }}>
                      {ICON[n.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', marginBottom: 2 }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', flexShrink: 0, paddingTop: 2 }}>
                      {timeAgo(n.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
