'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import AudioUpload from './AudioUpload'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Casal, lua de mel, agosto, praia, desportivo',
  'Família, 2 adultos 2 crianças, Verão, piscina, Europa',
  'Quais hotéis têm promoções activas este mês?',
  'Melhores comissões para Julho — onde reservar?',
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return
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
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.content }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            TDG
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">TDG Flow</h1>
            <p className="text-xs text-gray-400">Assistente de Destinos</p>
          </div>
        </div>
        <button
          onClick={() => setShowAudio(true)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <Mic size={15} />
          Registar Audio
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                TDG
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Bom dia, agente</h2>
              <p className="text-gray-500 text-sm">
                Diz-me o perfil do cliente e encontro os melhores hotéis com as melhores comissões.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 bg-white border rounded-xl text-sm text-gray-600 hover:border-amber-400 hover:text-amber-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-3xl mx-auto w-full`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold mr-3 mt-1 shrink-0">
                T
              </div>
            )}
            <div
              className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-white rounded-tr-sm'
                  : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-headings:text-gray-800 prose-strong:text-gray-900 max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start max-w-3xl mx-auto w-full">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold mr-3 mt-1">
              T
            </div>
            <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 size={16} className="text-amber-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
            placeholder="Perfil do cliente, destino, período..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-amber-500 text-white p-3 rounded-xl hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {showAudio && <AudioUpload onClose={() => setShowAudio(false)} />}
    </div>
  )
}
