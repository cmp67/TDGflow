'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Tag, Lightbulb, Mic, X } from 'lucide-react'
import { sounds } from '@/lib/sounds'

interface Notification {
  id: string
  type: 'offer' | 'review' | 'recording'
  title: string
  body: string
  time: string
  read: boolean
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
}

const ICON_COLOR: Record<string, string> = {
  offer:     '#008C94',
  review:    '#7DD3FC',
  recording: '#86EFAC',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const READ_KEY = 'tdg-notif-read'

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

      // Pending recordings
      if (ctx.pending_recordings > 0) {
        const id = 'pending-recordings'
        notifs.push({
          id,
          type: 'recording',
          title: 'Gravações pendentes',
          body: `${ctx.pending_recordings} gravação${ctx.pending_recordings > 1 ? 'ões' : ''} aguarda${ctx.pending_recordings > 1 ? 'm' : ''} processamento`,
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

      // Reviews this week
      if (ctx.reviews_this_week > 0) {
        const id = 'reviews-week'
        notifs.push({
          id,
          type: 'review',
          title: 'Atividade na rede',
          body: `${ctx.reviews_this_week} nova${ctx.reviews_this_week > 1 ? 's' : ''} dica${ctx.reviews_this_week > 1 ? 's' : ''} registrada${ctx.reviews_this_week > 1 ? 's' : ''} esta semana`,
          time: new Date().toISOString(),
          read: readIds.includes(id),
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
    setOpen(v => !v)
    if (!open) setTimeout(markAllRead, 1500)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter(n => !n.read).length

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 6, color: '#4A7580',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          transition: 'color 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: 2, right: 2,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--error)',
              border: '1.5px solid var(--surface)',
            }}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 300,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(28,20,16,0.14)',
              zIndex: 200,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#112630', letterSpacing: '-0.01em' }}>
                Notificações
              </p>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A7580', padding: 2 }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Items */}
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Bell size={20} style={{ color: '#B8D0D5', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.8125rem', color: '#4A7580' }}>Sem notificações</p>
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: n.read ? 'transparent' : 'var(--gold-subtle)',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'var(--surface-high)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: ICON_COLOR[n.type],
                    }}>
                      {ICON[n.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#112630', marginBottom: 2 }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#104C64', lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.625rem', color: '#4A7580', flexShrink: 0, paddingTop: 2 }}>
                      {timeAgo(n.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
