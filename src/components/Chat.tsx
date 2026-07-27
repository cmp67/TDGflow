'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Loader2, List, Sparkles, Clock, Lightbulb, Zap, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
// ReactMarkdown kept for assistant conversation messages
import AudioRecord from './AudioRecord'
import UserAvatar from './UserAvatar'
import InsufficientBalanceModal from './InsufficientBalanceModal'

/** Renders text with **bold** markers as actual bold spans — avoids ReactMarkdown CSS conflicts */
function GoldBoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} style={{ color: 'var(--tdgflow-navy)', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
import AudioQueue from './AudioQueue'
import { sounds } from '@/lib/sounds'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentContext {
  agent_name: string
  avatar_url: string | null
  pending_recordings: number
  reviews_this_week: number
  expiring_promotions: { hotel_name: string; title: string; booking_deadline: string; commission_rate: number }[]
  last_review_date: string | null
}

interface ActionCard {
  icon: React.ReactNode
  label: string
  sublabel: string
  prompt: string
  urgent?: boolean
}

function buildGreeting(ctx: AgentContext): string {
  const firstName = ctx.agent_name.split(' ')[0]
  const hour = new Date().getHours()
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const lines: string[] = [`${period}, **${firstName}**.`]

  if (ctx.pending_recordings > 0) {
    lines.push(`Você tem **${ctx.pending_recordings} gravação${ctx.pending_recordings > 1 ? 'ões' : ''} pendente${ctx.pending_recordings > 1 ? 's' : ''}** aguardando transcrição.`)
  }

  if (ctx.expiring_promotions.length > 0) {
    const hotels = ctx.expiring_promotions.slice(0, 2).map(p => p.hotel_name).join(' e ')
    lines.push(`**${ctx.expiring_promotions.length} promoção${ctx.expiring_promotions.length > 1 ? 'ões expirando' : ' expirando'} esta semana** — ${hotels}.`)
  }

  if (ctx.reviews_this_week === 0 && !ctx.last_review_date) {
    lines.push('Nenhuma dica de hotel registrada ainda. Que tal começar?')
  } else if (ctx.reviews_this_week === 0) {
    lines.push('Nenhuma dica registrada esta semana.')
  } else {
    lines.push(`**${ctx.reviews_this_week} dica${ctx.reviews_this_week > 1 ? 's' : ''}** registrada${ctx.reviews_this_week > 1 ? 's' : ''} esta semana pela rede. ✓`)
  }

  lines.push('\nEm que posso ajudar hoje?')
  return lines.join('\n\n')
}

function buildActionCards(ctx: AgentContext): ActionCard[] {
  const cards: ActionCard[] = []

  if (ctx.pending_recordings > 0) {
    cards.push({
      icon: <Clock size={14} />,
      label: `${ctx.pending_recordings} gravação${ctx.pending_recordings > 1 ? 'ões' : ''} pendente${ctx.pending_recordings > 1 ? 's' : ''}`,
      sublabel: 'Transcrever agora',
      prompt: 'Tenho gravações pendentes. Como processo a transcrição?',
      urgent: true,
    })
  }

  if (ctx.expiring_promotions.length > 0) {
    cards.push({
      icon: <Zap size={14} />,
      label: 'Promoções expirando',
      sublabel: `${ctx.expiring_promotions.length} offer${ctx.expiring_promotions.length > 1 ? 's' : ''} esta semana`,
      prompt: 'Quais promoções estão expirando esta semana? Me dá os detalhes para eu comunicar aos clientes.',
      urgent: true,
    })
  }

  cards.push({
    icon: <Search size={14} />,
    label: 'Buscar hotel',
    sublabel: 'Por perfil de cliente',
    prompt: '',
  })

  cards.push({
    icon: <Lightbulb size={14} />,
    label: 'Registrar dica',
    sublabel: 'Visita a hotel',
    prompt: 'Quero registrar uma dica de hotel que visitei recentemente.',
  })

  return cards.slice(0, 4)
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [ctx, setCtx] = useState<AgentContext | null>(null)
  const [greeting, setGreeting] = useState('')
  const [greetingReady, setGreetingReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    fetch('/api/context')
      .then(r => r.json())
      .then((data: AgentContext) => {
        setCtx(data)
        setGreeting(buildGreeting(data))
        setQueueCount(data.pending_recordings)
        // Small delay so it feels like the assistant is "thinking"
        setTimeout(() => setGreetingReady(true), 600)
      })
      .catch(() => {
        setGreeting('Olá! Em que posso ajudar hoje?')
        setTimeout(() => setGreetingReady(true), 300)
      })
  }, [])

  async function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return

    // If it's the "buscar hotel" card, just focus the input
    if (content === '') {
      inputRef.current?.focus()
      return
    }

    sounds.send()
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      if (res.status === 402) {
        setMessages(newMessages.slice(0, -1)) // remove user message
        setInput(content)
        setShowBalanceModal(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      sounds.reply()
      setMessages([...newMessages, { role: 'assistant', content: data.content }])
    } catch {
      sounds.error()
      setMessages([...newMessages, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }])
    }
    setLoading(false)
  }

  const actionCards = ctx ? buildActionCards(ctx) : []

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--tdgflow-bg)' }}>
      {showBalanceModal && <InsufficientBalanceModal onClose={() => setShowBalanceModal(false)} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-3"
        style={{ background: 'var(--tdgflow-surface)', borderBottom: '1px solid var(--tdgflow-border)' }}
      >
        <div>
          <h1 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>Modo Flow</h1>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>Recomendações · Promoções · Orientação</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAudio(true)}
            className="btn-gold"
            style={{ padding: '7px 12px', fontSize: '0.8125rem' }}
          >
            <Mic size={13} /> Gravar
          </button>
          <button
            onClick={() => setShowQueue(true)}
            className="btn-ghost relative"
            style={{ padding: '7px 12px', fontSize: '0.8125rem' }}
          >
            <List size={13} /> Fila
            {queueCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center font-bold rounded-full"
                style={{ width: 16, height: 16, background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.5625rem' }}
              >
                {queueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        <AnimatePresence initial={false}>

          {/* Proactive greeting */}
          {messages.length === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              {/* Assistant greeting bubble */}
              <div className="flex justify-start mb-5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mr-3 mt-1 shrink-0"
                  style={{ background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.5625rem', letterSpacing: '0.05em' }}
                >
                  TDG
                </div>
                <div
                  className="px-4 py-3 rounded-2xl max-w-[90%] text-sm leading-relaxed"
                  style={{
                    background: 'var(--tdgflow-surface)',
                    border: '1px solid var(--tdgflow-border)',
                    color: 'var(--tdgflow-text-secondary)',
                    borderRadius: '4px 18px 18px 18px',
                    minHeight: 52,
                  }}
                >
                  {!greetingReady ? (
                    <div className="flex items-center gap-1.5 py-1">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="rounded-full"
                          style={{ width: 6, height: 6, background: 'var(--tdgflow-navy)', display: 'inline-block' }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      {greeting.split('\n\n').map((line, i) => (
                        <p key={i} style={{ margin: i === 0 ? 0 : '0.6em 0 0', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.55 }}>
                          <GoldBoldText text={line} />
                        </p>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Action cards */}
              {greetingReady && actionCards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="grid grid-cols-2 gap-2 mb-2 ml-10"
                >
                  {actionCards.map((card, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(card.prompt)}
                      className="text-left rounded-xl transition-all"
                      style={{
                        padding: '11px 13px',
                        background: card.urgent ? 'rgba(212,165,116,0.06)' : 'var(--tdgflow-surface)',
                        border: `1px solid ${card.urgent ? 'var(--tdgflow-navy-ring)' : 'var(--tdgflow-border)'}`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-navy-dim)'
                        ;(e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-navy-subtle)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = card.urgent ? 'var(--tdgflow-navy-ring)' : 'var(--tdgflow-border)'
                        ;(e.currentTarget as HTMLElement).style.background = card.urgent ? 'rgba(212,165,116,0.06)' : 'var(--tdgflow-surface)'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1" style={{ color: card.urgent ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)' }}>
                        {card.icon}
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.01em', color: card.urgent ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-primary)' }}>
                          {card.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.4 }}>{card.sublabel}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Conversation messages */}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-3xl mx-auto w-full`}
            >
              {/* Assistant avatar */}
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0"
                  style={{ background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.5625rem', letterSpacing: '0.05em' }}
                >
                  TDG
                </div>
              )}

              <div
                className="px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? { background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', borderRadius: '18px 18px 4px 18px' }
                    : { background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', color: 'var(--tdgflow-text-secondary)', borderRadius: '4px 18px 18px 18px' }
                }
              >
                {msg.role === 'assistant' ? (
                  <div className="prose-dark">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <UserAvatar name={ctx?.agent_name ?? ''} avatarUrl={ctx?.avatar_url} size={28} />
              )}
            </motion.div>
          ))}

          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start max-w-3xl mx-auto w-full"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold mr-3 mt-1 shrink-0"
                style={{ background: 'var(--tdgflow-navy)', color: 'var(--tdgflow-surface)', fontSize: '0.5625rem', letterSpacing: '0.05em' }}>
                TDG
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)', borderRadius: '4px 18px 18px 18px' }}>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="rounded-full"
                      style={{ width: 6, height: 6, background: 'var(--tdgflow-navy)', display: 'inline-block' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ background: 'var(--tdgflow-surface)', borderTop: '1px solid var(--tdgflow-border)' }}
      >
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              className="input pr-10"
              placeholder="Perfil do cliente, destino, dúvida..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            {input.length > 0 && (
              <Sparkles size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--tdgflow-navy-dim)' }} />
            )}
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-gold"
            style={{ padding: '10px 13px' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {showAudio && (
        <AudioRecord
          defaultAgentName={ctx?.agent_name ?? ''}
          onSaved={() => setQueueCount(c => c + 1)}
          onClose={() => setShowAudio(false)}
        />
      )}
      {showQueue && <AudioQueue onClose={() => { setShowQueue(false); setQueueCount(0) }} />}
    </div>
  )
}
