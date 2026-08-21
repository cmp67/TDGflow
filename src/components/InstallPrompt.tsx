'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'

/* Prompt de instalação do PWA — pedido da Carla, 20/08: "quero que a
   pessoa quando entra no site apareça aquela pergunta de quer instalar".

   Chrome/Android dispara o evento `beforeinstallprompt` sozinho quando o
   site já atende os critérios de instalabilidade (manifest + service
   worker + ícones + HTTPS) — mas o navegador NÃO garante mostrar isso de
   forma visível/imediata por conta própria em todo contexto; o padrão
   correto é capturar o evento, segurar (preventDefault) e mostrar nosso
   próprio banner, chamando `.prompt()` só quando a pessoa clica.

   iOS Safari não dispara beforeinstallprompt — a Apple não deixa nenhum
   site acionar o prompt nativo de "Adicionar à Tela de Início" via JS, só
   existe pelo menu de Compartilhar, manual. Pro iPhone, o único caminho
   honesto é mostrar a instrução de como fazer, não um botão que instala
   sozinho — dois ramos de UI bem diferentes, não dá pra fingir que é a
   mesma coisa nos dois sistemas. */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'tdgflow-install-dismissed-at'
const DISMISS_DAYS = 14

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24)
  return elapsedDays < DISMISS_DAYS
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    if (isStandalone() || recentlyDismissed()) return

    if (isIOS()) {
      setShowIOSHint(true)
      setVisible(true)
      return
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 200,
        maxWidth: 420, margin: '0 auto',
        background: 'var(--tdgflow-navy-dim)', color: '#EAF1F5',
        borderRadius: 14, padding: '14px 14px 14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'var(--tdgflow-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {showIOSHint ? <Share size={17} color="var(--tdgflow-navy-dim)" /> : <Download size={17} color="var(--tdgflow-navy-dim)" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>Instalar o TDG Flow</p>
        <p style={{ fontSize: '0.75rem', opacity: 0.75, margin: '2px 0 0' }}>
          {showIOSHint
            ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".'
            : 'Acesso direto na tela inicial, sem abrir o navegador.'}
        </p>
      </div>

      {!showIOSHint && (
        <button
          onClick={install}
          style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '8px 14px', borderRadius: 999,
            background: 'var(--tdgflow-gold)', color: 'var(--tdgflow-navy-dim)', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Instalar
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Fechar"
        style={{ background: 'none', border: 'none', color: '#EAF1F5', opacity: 0.6, cursor: 'pointer', padding: 4, flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
