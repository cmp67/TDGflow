'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

/* Copiar o deep link interno (?reviewId=/?contactId=/?tipId=/?hotelId=) pra
   mandar pra alguém já logado na rede — não é o compartilhamento público
   externo (aquele exigiria página sem login, deixado de lado por causa da
   marca Lilamonde no Bemgsy Central). */
export default function CopyLinkButton({ path, size = 13, dark = false }: { path: string; size?: number; dark?: boolean }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
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
