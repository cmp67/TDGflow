'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

/* Copiar o deep link interno (?reviewId=/?contactId=/?tipId=/?hotelId=/
   ?offerId=) pra mandar pra alguém já logado na rede — não é o
   compartilhamento público externo (aquele exigiria página sem login,
   deixado de lado por causa da marca Lilamonde no Bemgsy Central).
   Sempre encurta via /api/short-links (idempotente — mesmo item, mesmo
   link) e prefixa com um rótulo legível, pra quem recebe saber do que se
   trata sem precisar abrir. */
export default function CopyLinkButton({ path, label, size = 13, dark = false }: {
  path: string
  label?: string
  size?: number
  dark?: boolean
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    let shareUrl = `${window.location.origin}${path}`
    try {
      const res = await fetch('/api/short-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, label }),
      })
      if (res.ok) {
        const { code } = await res.json()
        shareUrl = `${window.location.origin}/s/${code}`
      }
    } catch { /* link longo já é um fallback válido */ }

    const text = label ? `${label} — ${shareUrl}` : shareUrl
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast('Link copiado!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Não foi possível copiar o link.', 'error')
    }
  }

  const mutedColor = dark ? 'rgba(255,255,255,0.85)' : 'var(--tdgflow-text-muted)'

  return (
    <button
      onClick={handleCopy}
      title="Copiar link"
      style={{
        background: dark ? 'rgba(0,0,0,0.45)' : 'none',
        border: 'none', cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: dark ? 0 : 4,
        width: dark ? 30 : undefined, height: dark ? 30 : undefined, borderRadius: dark ? '50%' : undefined,
        color: copied ? 'var(--tdgflow-success)' : mutedColor,
      }}
    >
      {copied ? <Check size={size} /> : <Share2 size={size} />}
    </button>
  )
}
