'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Sparkles, Tag, Lightbulb, FileText, Building2,
  Mic, LogOut, MoreHorizontal, X, Users, BriefcaseBusiness, BarChart2
} from 'lucide-react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { type Lang, LANG_LABELS } from '@/lib/i18n'
import { sounds } from '@/lib/sounds'
import { ToastProvider } from '@/contexts/ToastContext'
import NotificationBell from '@/components/NotificationBell'

interface NavItem {
  href: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>
  tkey: string   // translation key suffix e.g. 'assistente' → tr('nav.assistente')
  soon?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/flow/chat',    icon: Sparkles,  tkey: 'assistente' },
  { href: '/flow/ofertas', icon: Tag,       tkey: 'ofertas' },
  { href: '/flow/dicas',   icon: Lightbulb, tkey: 'dicas' },
  { href: '/flow/hoteis',  icon: Building2, tkey: 'hoteis' },
]

const SECONDARY_NAV_AGENT: NavItem[] = [
  { href: '/flow/analytics', icon: BarChart2,         tkey: 'analytics' },
  { href: '/flow/agencia',   icon: BriefcaseBusiness, tkey: 'agencia' },
  { href: '/flow/gravacoes', icon: Mic,               tkey: 'gravacoes' },
  { href: '/flow/docs',      icon: FileText,          tkey: 'docs' },
  { href: '/flow/inbox',     icon: Mail,              tkey: 'inbox', soon: true },
]

const SECONDARY_NAV_ADMIN: NavItem[] = [
  { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
  { href: '/flow/gestao',    icon: Users,     tkey: 'gestao' },
  { href: '/flow/gravacoes', icon: Mic,       tkey: 'gravacoes' },
  { href: '/flow/docs',      icon: FileText,  tkey: 'docs' },
  { href: '/flow/inbox',     icon: Mail,      tkey: 'inbox', soon: true },
]

interface Props {
  children: React.ReactNode
  user: { name: string; agency: string; role: string }
}

export default function FlowShell({ children, user }: Props) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <FlowShellInner user={user}>{children}</FlowShellInner>
      </ToastProvider>
    </LanguageProvider>
  )
}

function FlowShellInner({ children, user }: Props) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const { lang, setLang, tr } = useLanguage()

  const isAdmin = user.role === 'admin'
  const SECONDARY_NAV = isAdmin ? SECONDARY_NAV_ADMIN : SECONDARY_NAV_AGENT
  const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const secondaryActive = SECONDARY_NAV.some(n => isActive(n.href))
  const initial = (user.name || 'A')[0].toUpperCase()
  void ALL_NAV

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar — desktop only ─────────────────────────────────── */}
      <aside
        className="desktop-only"
        style={{ flexDirection: 'column', flexShrink: 0, width: 208, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logotype */}
        <div className="px-6 pt-7 pb-6 flex-shrink-0">
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase' }}>
              TDG
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 300, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Flow
            </span>
          </div>
          <div style={{ marginTop: 6, height: '1px', background: 'linear-gradient(90deg, var(--gold-dim) 0%, transparent 100%)', width: 48 }} />
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-0">
          <p className="mb-2" style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 8 }}>
            {tr('nav.principal')}
          </p>
          {PRIMARY_NAV.map(({ href, icon: Icon, tkey }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => !active && sounds.nav()}
                className="flex items-center gap-3 no-underline relative"
                style={{
                  padding: '8px 10px 8px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: active ? 'var(--gold-dim)' : 'var(--text-secondary)',
                  background: active ? 'var(--gold-subtle)' : 'transparent',
                  borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-high)' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--gold)' : 'var(--text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--gold-dim)' : 'inherit' }}>
                  {tr(`nav.${tkey}`)}
                </span>
              </Link>
            )
          })}

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <p className="mb-2" style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: 8 }}>
            {tr('nav.ferramentas')}
          </p>
          {SECONDARY_NAV.map(({ href, icon: Icon, tkey, soon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={soon ? '#' : href}
                onClick={e => { if (soon) e.preventDefault(); else if (!active) sounds.nav() }}
                className="flex items-center gap-3 no-underline"
                style={{
                  padding: '8px 10px 8px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: active ? 'var(--gold-dim)' : 'var(--text-secondary)',
                  background: active ? 'var(--gold-subtle)' : 'transparent',
                  borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all 150ms',
                  opacity: soon ? 0.55 : 1,
                  cursor: soon ? 'default' : 'pointer',
                }}
                onMouseEnter={e => { if (!active && !soon) { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-high)' } }}
                onMouseLeave={e => { if (!active && !soon) { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--gold)' : 'var(--text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--gold-dim)' : 'inherit' }}>
                  {tr(`nav.${tkey}`)}
                </span>
                {soon && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{tr('nav.breve')}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + Language footer */}
        <div className="flex-shrink-0 px-4 pb-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Language switcher */}
          <div className="flex items-center gap-1 mb-3" style={{ paddingLeft: 4 }}>
            {(['pt-BR', 'en', 'es'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? 'var(--gold-subtle)' : 'none',
                  border: lang === l ? '1px solid var(--gold-ring)' : '1px solid transparent',
                  borderRadius: 4,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '0.5625rem',
                  fontWeight: lang === l ? 700 : 400,
                  letterSpacing: '0.08em',
                  color: lang === l ? 'var(--gold)' : 'var(--text-muted)',
                  transition: 'all 150ms',
                }}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 mb-3">
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-high)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
              {initial}
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'Agente'}
              </p>
              <p style={{ fontSize: '0.625rem', letterSpacing: '0.04em', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.agency}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => signOut({ callbackUrl: '/flow/login' })}
              className="flex items-center gap-1.5"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.02em', transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={11} /> {tr('auth.signout')}
            </button>
            <NotificationBell />
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Mobile header — hidden on desktop */}
        <div className="mobile-only" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 44, flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase' }}>TDG</span>
            <span style={{ fontSize: '0.5625rem', fontWeight: 300, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-high)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {initial}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 56 }}>
          {children}
        </div>
      </main>

      {/* ── Bottom nav — mobile only ──────────────────────────────────── */}
      <nav
        className="mobile-only"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, alignItems: 'stretch', background: 'rgba(253,252,250,0.96)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 40, height: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {PRIMARY_NAV.map(({ href, icon: Icon, tkey }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-1 no-underline relative" style={{ minWidth: 0, paddingTop: 2 }}>
              {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 1, background: 'var(--gold)', borderRadius: '0 0 2px 2px' }} />}
              <Icon size={18} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', transition: 'color 0.15s' }} />
              <span style={{ fontSize: '0.5rem', fontWeight: active ? 600 : 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? 'var(--gold)' : 'var(--text-muted)', transition: 'color 0.15s' }}>
                {tr(`nav.${tkey}`)}
              </span>
            </Link>
          )
        })}

        <button onClick={() => setShowMore(true)} className="flex-1 flex flex-col items-center justify-center gap-1 relative" style={{ paddingTop: 2 }}>
          {secondaryActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 1, background: 'var(--gold)', borderRadius: '0 0 2px 2px' }} />}
          <MoreHorizontal size={18} strokeWidth={1.5} style={{ color: secondaryActive ? 'var(--gold)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.5rem', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: secondaryActive ? 'var(--gold)' : 'var(--text-muted)' }}>
            {tr('nav.mais')}
          </span>
        </button>
      </nav>

      {/* ── "Mais" bottom sheet ───────────────────────────────────────── */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(28,20,16,0.40)' }} onClick={() => setShowMore(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 38 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, borderRadius: '20px 20px 0 0', overflow: 'hidden', background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--border-light)' }} />
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{user.name}</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.04em', marginTop: 2 }}>{user.agency}</p>
                </div>
                <button onClick={() => setShowMore(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Language switcher — mobile */}
              <div className="flex items-center gap-1.5 px-6 pb-3">
                {(['pt-BR', 'en', 'es'] as Lang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      background: lang === l ? 'var(--gold-subtle)' : 'none',
                      border: lang === l ? '1px solid var(--gold-ring)' : '1px solid var(--border)',
                      borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
                      fontSize: '0.625rem', fontWeight: lang === l ? 700 : 400, letterSpacing: '0.08em',
                      color: lang === l ? 'var(--gold)' : 'var(--text-muted)', transition: 'all 150ms',
                    }}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 8px' }} />

              <div className="px-4 pb-4 space-y-0.5">
                {SECONDARY_NAV.map(({ href, icon: Icon, tkey, soon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={soon ? '#' : href}
                      onClick={e => { if (soon) e.preventDefault(); else setShowMore(false) }}
                      className="flex items-center gap-3.5 no-underline"
                      style={{ padding: '12px 14px', color: active ? 'var(--gold)' : 'var(--text-secondary)', borderLeft: active ? '1px solid var(--gold)' : '1px solid transparent', borderRadius: 2, opacity: soon ? 0.45 : 1 }}
                    >
                      <Icon size={16} strokeWidth={active ? 2 : 1.5} style={{ color: 'inherit', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9375rem', fontWeight: active ? 500 : 400 }}>{tr(`nav.${tkey}`)}</span>
                      {soon && <span style={{ marginLeft: 'auto', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{tr('nav.breve')}</span>}
                    </Link>
                  )
                })}

                <div style={{ height: 1, background: 'var(--border)', margin: '8px 14px' }} />

                <button
                  onClick={() => signOut({ callbackUrl: '/flow/login' })}
                  className="flex items-center gap-3.5 w-full"
                  style={{ padding: '12px 14px', background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 2, transition: 'color 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <LogOut size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem' }}>{tr('auth.signout')}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
