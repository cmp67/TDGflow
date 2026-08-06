'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

/* ── Ícones próprios — traço só, sem lucide genérico pros marcadores de
   conteúdo/categoria (regra de personalidade Bemgsy). Utilitários puros
   (enviar, spinner) continuam lucide. ──────────────────────────────── */
function IconPending({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
    </svg>
  )
}
function IconExpiring({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
    </svg>
  )
}
function IconSearch({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" />
    </svg>
  )
}
function IconTip({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.7h5.6c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3z" />
    </svg>
  )
}
import { motion, AnimatePresence } from 'framer-motion'
// ReactMarkdown kept for assistant conversation messages
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
  expiring_promotions: { hotel_name: string; title: string; image_url: string | null; booking_deadline: string; commission_rate: number }[]
  last_review_date: string | null
  pending_leads: number
}

interface ActionCard {
  icon: React.ReactNode
  image?: string | null
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

  if (ctx.pending_leads > 0) {
    lines.push(`**${ctx.pending_leads} descoberta${ctx.pending_leads > 1 ? 's' : ''}** da rede ainda ${ctx.pending_leads > 1 ? 'aguardam' : 'aguarda'} teste real.`)
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
      icon: <IconPending size={14} />,
      label: `${ctx.pending_recordings} gravação${ctx.pending_recordings > 1 ? 'ões' : ''} pendente${ctx.pending_recordings > 1 ? 's' : ''}`,
      sublabel: 'Transcrever agora',
      prompt: 'Tenho gravações pendentes. Como processo a transcrição?',
      urgent: true,
    })
  }

  if (ctx.expiring_promotions.length > 0) {
    cards.push({
      icon: <IconExpiring size={14} />,
      image: ctx.expiring_promotions[0].image_url,
      label: 'Promoções expirando',
      sublabel: `${ctx.expiring_promotions.length} offer${ctx.expiring_promotions.length > 1 ? 's' : ''} esta semana`,
      prompt: 'Quais promoções estão expirando esta semana? Me dá os detalhes para eu comunicar aos clientes.',
      urgent: true,
    })
  }

  // Prateleira — mesma descoberta visível na sidebar agora também aqui,
  // com CTA direto pra virar teste real (achado: "Na prática" sozinho não
  // basta como antecipação, o app inteiro devia lembrar disso).
  if (ctx.pending_leads > 0) {
    cards.push({
      icon: <IconExpiring size={14} />,
      label: 'Descobertas aguardando teste',
      sublabel: `${ctx.pending_leads} da rede, ainda sem visita real`,
      prompt: 'Quais fornecedores a rede descobriu recentemente e ainda estão aguardando alguém testar de perto?',
      urgent: true,
    })
  }

  cards.push({
    icon: <IconSearch size={14} />,
    label: 'Buscar hotel',
    sublabel: 'Por perfil de cliente',
    prompt: '',
  })

  cards.push({
    icon: <IconTip size={14} />,
    label: 'Registrar visita',
    sublabel: 'Visita a hotel',
    prompt: 'Quero registrar uma visita a um hotel que fiz recentemente.',
  })

  return cards.slice(0, 4)
}

interface Props {
  // Nome vindo da sessão (server-side), usado só se /api/context falhar —
  // achado da Carla, 30/07: sempre pelo nome, nunca genérico, mesmo no
  // caminho de erro raro de rede.
  fallbackName?: string | null
  // Achado da Carla, 06/08: o histórico sumia ao trocar de tela porque
  // `messages` era estado só do componente, perdido no unmount. Persiste em
  // localStorage escopado por e-mail (nunca vaza entre contas diferentes no
  // mesmo navegador) até o logout — ver limpeza em FlowShell.tsx.
  userEmail?: string | null
}

function chatHistoryKey(email: string | null | undefined): string | null {
  return email ? `tdg-chat-history:${email}` : null
}

export default function Chat({ fallbackName, userEmail }: Props = {}) {
  const storageKey = chatHistoryKey(userEmail)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined' || !storageKey) return []
    try {
      const saved = window.localStorage.getItem(storageKey)
      return saved ? (JSON.parse(saved) as Message[]) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [ctx, setCtx] = useState<AgentContext | null>(null)
  const [greeting, setGreeting] = useState('')
  const [greetingReady, setGreetingReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!storageKey) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch { /* localStorage cheio/indisponível — histórico só não persiste, não quebra o chat */ }
  }, [messages, storageKey])

  useEffect(() => {
    fetch('/api/context')
      .then(r => r.json())
      .then((data: AgentContext) => {
        setCtx(data)
        setGreeting(buildGreeting(data))
        // Small delay so it feels like the assistant is "thinking"
        setTimeout(() => setGreetingReady(true), 600)
      })
      .catch(() => {
        const firstName = fallbackName?.split(' ')[0]
        setGreeting(firstName ? `Olá, **${firstName}**! Em que posso ajudar hoje?` : 'Olá! Em que posso ajudar hoje?')
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
      if (!res.ok) {
        // Achado testando com conta sem agência vinculada (admin global):
        // antes disso caía direto em data.content (undefined), virando uma
        // bolha de resposta vazia sem explicação nenhuma pro usuário.
        sounds.error()
        const message = data.error === 'NO_AGENCY'
          ? 'Sua conta não está vinculada a uma agência — fale com o suporte para habilitar o Modo Flow.'
          : 'Não foi possível processar sua mensagem agora. Tente novamente.'
        setMessages([...newMessages, { role: 'assistant', content: message }])
        setLoading(false)
        return
      }
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
      {/* Gravar/Fila removidos daqui (01/08) — duplicava "Na prática", que já
          é o lugar oficial pra registrar reunião/visita desde a Fase 6
          (mesmos componentes AudioRecord/AudioQueue, ver DicasView.tsx). */}
      <div
        className="flex-shrink-0 flex items-center px-5 py-3"
        style={{ background: 'var(--tdgflow-surface)', borderBottom: '1px solid var(--tdgflow-border)' }}
      >
        <div>
          <h1 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>Modo Flow</h1>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>Recomendações · Promoções · Orientação</p>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      {/* Estado vazio centraliza o convite na área disponível — antes ficava
        tudo colado no topo com um vazio grande embaixo ("folha em branco",
        achado da Carla). Assim que a conversa começa, volta ao fluxo normal
        de cima pra baixo. */}
      <div className={messages.length === 0
        ? 'flex-1 overflow-y-auto px-4 flex items-center justify-center'
        : 'flex-1 overflow-y-auto px-4 py-6 space-y-5'
      }>
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
                      className="text-left rounded-xl transition-all overflow-hidden"
                      style={{
                        padding: card.image ? 0 : '11px 13px',
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
                      {card.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={card.image} alt="" style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }} />
                      )}
                      <div style={{ padding: card.image ? '9px 13px 11px' : 0 }}>
                        <div className="flex items-center gap-2 mb-1" style={{ color: card.urgent ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)' }}>
                          {card.icon}
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.01em', color: card.urgent ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-primary)' }}>
                            {card.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.4 }}>{card.sublabel}</p>
                      </div>
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
    </div>
  )
}
