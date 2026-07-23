'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={15} />,
    error:   <AlertCircle size={15} />,
    info:    <Info size={15} />,
  }

  const colors: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: 'var(--surface)', border: 'rgba(46,125,79,0.35)', text: '#112630', icon: '#2E7D4F' },
    error:   { bg: 'var(--surface)', border: 'rgba(192,57,43,0.35)', text: '#112630', icon: '#C0392B' },
    info:    { bg: 'var(--surface)', border: 'var(--border)',        text: '#112630', icon: '#008C94' },
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: 'fixed', bottom: 72, right: 16, zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map(t => {
            const c = colors[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  pointerEvents: 'auto',
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  padding: '11px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 220,
                  maxWidth: 320,
                  boxShadow: '0 4px 20px rgba(28,20,16,0.12)',
                }}
              >
                <span style={{ color: c.icon, flexShrink: 0 }}>{icons[t.type]}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: c.text, flex: 1, lineHeight: 1.4 }}>
                  {t.message}
                </span>
                <button
                  onClick={() => dismiss(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#4A7580', flexShrink: 0 }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
