'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Sparkles, Tag, Lightbulb, FileText, Building2,
  LogOut, MoreHorizontal, X, Users, BarChart2, MessageSquarePlus, CreditCard, Network, UserPlus, Globe
} from 'lucide-react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { APP_VERSION } from '@/lib/version'
import { type Lang, LANG_LABELS } from '@/lib/i18n'
import { sounds } from '@/lib/sounds'
import { ToastProvider } from '@/contexts/ToastContext'
import NotificationBell from '@/components/NotificationBell'
import UserAvatar from '@/components/UserAvatar'

interface NavItem {
  href: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>
  tkey: string   // translation key suffix e.g. 'assistente' → tr('nav.assistente')
  soon?: boolean
}

interface NavGroup {
  labelKey: string   // i18n key for the group header, e.g. 'nav.groupFerramentas'
  items: NavItem[]
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/flow/chat',    icon: Sparkles,  tkey: 'assistente' },
  { href: '/flow/ofertas', icon: Tag,       tkey: 'ofertas' },
  { href: '/flow/dicas',   icon: Lightbulb, tkey: 'dicas' },
  { href: '/flow/hoteis',  icon: Building2, tkey: 'hoteis' },
  { href: '/flow/rede',    icon: Network,   tkey: 'rede' },
]

// Dica de uma linha por item — autoexplicação antes do clique (achado da
// Carla: nomes com personalidade própria, tipo "Na prática", não dizem o
// que tem lá até você entrar). Só PT por ora — é um reforço supplementary,
// não texto crítico de UI.
const NAV_HINTS: Record<string, string> = {
  assistente: 'Converse com a IA — busca de hotéis, promoções e dúvidas do sistema',
  ofertas:    'Promoções ativas da rede, ordenadas por comissão e prazo',
  dicas:      'Avaliações reais de fornecedores, por quem visitou de verdade',
  hoteis:     'Catálogo de hotéis parceiros — contatos, contratos, avaliações',
  rede:       'Contatos da rede — reps, DMCs, fornecedores',
  analytics:  'Seu desempenho e o da rede',
  agencia:    'Seu perfil e dados da agência',
  gestao:     'Usuários e permissões da agência',
  equipe:     'Convide e gerencie sua equipe',
  docs:       'Documentação e materiais de apoio',
  destinos:   'Conhecimento prático por país — vistos, costumes, avisos',
  inbox:      'Em breve',
  sugestoes:  'Sugestões e melhorias pro Flow',
  billing:    'Assinatura e uso de Lumis',
}

// Regrupado por contexto de uso real (não mais um "Ferramentas" catch-all
// misturando insight + gestão + referência): Desempenho (acompanhar como vai
// o uso), Gestão (quem tem acesso — só pra quem administra alguém) e Recursos
// (ferramentas de apoio/consulta ocasional).
//
// 'agencia' (Meu Perfil) fica de fora daqui de propósito — já é acessível pelo
// card de identidade no rodapé (avatar + nome + agência). Tê-lo duplicado aqui
// sob o rótulo "Minha Agência" confundia: o destino real é uma tela de perfil
// pessoal (nome, senha), não configurações de agência — dois links, dois
// rótulos, o mesmo lugar.
// "Da mesa" saiu daqui (Fase 6) — o próprio texto da página já dizia "não é
// conteúdo pra navegar direto" (só 2 botões modais, zero conteúdo pra rolar).
// Virou ação "Gravar" dentro de "Na prática".
const RESOURCE_ITEMS: NavItem[] = [
  { href: '/flow/docs',      icon: FileText, tkey: 'docs' },
  { href: '/flow/destinos',  icon: Globe,    tkey: 'destinos' },
  { href: '/flow/inbox',     icon: Mail,     tkey: 'inbox', soon: true },
]

// Fase 6: "Desempenho" era um cabeçalho de grupo pra 1 item só (Analytics) —
// não ganha peso próprio no mental model de quem usa o app todo dia (achado
// do arquiteto). Um único bloco "Ferramentas" por papel, sem cabeçalho que
// não se paga.
const NAV_GROUPS_AGENT: NavGroup[] = [
  { labelKey: 'nav.groupFerramentas', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    ...RESOURCE_ITEMS,
  ] },
]

const NAV_GROUPS_ADMIN: NavGroup[] = [
  { labelKey: 'nav.groupFerramentas', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    { href: '/flow/gestao', icon: Users, tkey: 'gestao' },
    ...RESOURCE_ITEMS,
  ] },
]

// agency_admin: administra só a equipe da própria agência (nunca entre
// agências — isso fica exclusivo do admin global via NAV_GROUPS_ADMIN acima).
const NAV_GROUPS_AGENCY_ADMIN: NavGroup[] = [
  { labelKey: 'nav.groupFerramentas', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    { href: '/flow/equipe', icon: UserPlus, tkey: 'equipe' },
    ...RESOURCE_ITEMS,
  ] },
]

interface Brand {
  logoUrl:        string | null
  primaryColor:   string | null
  secondaryColor: string | null
}

interface Props {
  children: React.ReactNode
  user: { name: string; agency: string; role: string; avatar_url?: string | null }
  brand?: Brand | null
}

export default function FlowShell({ children, user, brand }: Props) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <FlowShellInner user={user} brand={brand}>{children}</FlowShellInner>
      </ToastProvider>
    </LanguageProvider>
  )
}

function FlowShellInner({ children, user, brand }: Props) {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const { lang, setLang, tr } = useLanguage()

  // Antecipação: quantas descobertas da rede aguardam teste real, visível
  // na sidebar sem precisar entrar em "Na prática" pra saber que existem.
  const [pendingLeads, setPendingLeads] = useState(0)
  useEffect(() => {
    fetch('/api/context')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setPendingLeads(data.pending_leads ?? 0) })
      .catch(() => {})
  }, [])

  const isAdmin = user.role === 'admin'
  const isAgencyAdmin = user.role === 'agency_admin'
  const NAV_GROUPS = isAdmin ? NAV_GROUPS_ADMIN : isAgencyAdmin ? NAV_GROUPS_AGENCY_ADMIN : NAV_GROUPS_AGENT
  const SECONDARY_NAV = NAV_GROUPS.flatMap(g => g.items)
  const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const secondaryActive = SECONDARY_NAV.some(n => isActive(n.href))
  const initial = (user.name || 'A')[0].toUpperCase()
  void ALL_NAV

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--tdgflow-bg)' }}>

      {/* ── Sidebar — desktop only ─────────────────────────────────── */}
      <aside
        className="desktop-only"
        style={{ flexDirection: 'column', flexShrink: 0, width: 208, background: 'var(--tdgflow-surface)', borderRight: '1px solid var(--tdgflow-border)' }}
      >
        {/* Logotype — pele da agência (logo + acento de cor) sobre o
            esqueleto Bemgsy, nunca o contrário. "powered by TDG Flow" fica
            sempre visível: white-label de pele, não de estrutura — a
            agência nunca deixa de ser reconhecível como família Bemgsy. */}
        <div className="px-6 pt-7 pb-6 flex-shrink-0">
          {brand?.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={brand.logoUrl}
              alt={user.agency || 'Logo da agência'}
              style={{ maxHeight: 28, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <p style={{
              fontFamily: 'var(--tdgflow-font-sans)', fontSize: '0.8125rem', fontWeight: 700,
              letterSpacing: '-0.01em', color: 'var(--tdgflow-text-primary)', lineHeight: 1.25,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
            }}>
              {user.agency || 'TDG'}
            </p>
          )}
          <p style={{
            fontFamily: 'var(--tdgflow-font-sans)', fontSize: '0.5625rem', fontWeight: 400,
            letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)', textTransform: 'uppercase', margin: '2px 0 0',
          }}>
            powered by TDG Flow
          </p>
          <div style={{
            marginTop: 6, height: '1px', width: 48,
            background: brand?.primaryColor
              ? `linear-gradient(90deg, ${brand.primaryColor} 0%, transparent 100%)`
              : 'linear-gradient(90deg, var(--tdgflow-navy-dim) 0%, transparent 100%)',
          }} />
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-0">
          <p className="mb-2" style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', paddingLeft: 8 }}>
            {tr('nav.principal')}
          </p>
          {PRIMARY_NAV.map(({ href, icon: Icon, tkey }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={NAV_HINTS[tkey]}
                onClick={() => !active && sounds.nav()}
                className="flex items-center gap-3 no-underline relative"
                style={{
                  padding: '8px 10px 8px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: active ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-secondary)',
                  background: active ? 'var(--tdgflow-navy-subtle)' : 'transparent',
                  borderLeft: active ? '2px solid var(--tdgflow-navy)' : '2px solid transparent',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--tdgflow-navy-dim)' : 'inherit' }}>
                  {tr(`nav.${tkey}`)}
                </span>
                {tkey === 'dicas' && pendingLeads > 0 && (
                  <span style={{
                    marginLeft: 'auto', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--tdgflow-accent-warm)', color: '#fff',
                    fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
                  }}>
                    {pendingLeads}
                  </span>
                )}
              </Link>
            )
          })}

          {NAV_GROUPS.map(group => (
            <div key={group.labelKey}>
              <div style={{ height: 1, background: 'var(--tdgflow-border)', margin: '14px 0' }} />
              <p className="mb-2" style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', paddingLeft: 8 }}>
                {tr(group.labelKey)}
              </p>
              {group.items.map(({ href, icon: Icon, tkey, soon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={soon ? '#' : href}
                    title={NAV_HINTS[tkey]}
                    onClick={e => { if (soon) e.preventDefault(); else if (!active) sounds.nav() }}
                    className="flex items-center gap-3 no-underline"
                    style={{
                      padding: '8px 10px 8px 10px',
                      borderRadius: 8,
                      marginBottom: 2,
                      color: active ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-secondary)',
                      background: active ? 'var(--tdgflow-navy-subtle)' : 'transparent',
                      borderLeft: active ? '2px solid var(--tdgflow-navy)' : '2px solid transparent',
                      transition: 'all 150ms',
                      opacity: soon ? 0.55 : 1,
                      cursor: soon ? 'default' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!active && !soon) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' } }}
                    onMouseLeave={e => { if (!active && !soon) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
                  >
                    <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--tdgflow-navy-dim)' : 'inherit' }}>
                      {tr(`nav.${tkey}`)}
                    </span>
                    {soon && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>{tr('nav.breve')}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User + Language footer */}
        <div className="flex-shrink-0 px-4 pb-5 pt-4" style={{ borderTop: '1px solid var(--tdgflow-border)' }}>
          {/* Language switcher */}
          <div className="flex items-center gap-1 mb-3" style={{ paddingLeft: 4 }}>
            {(['pt-BR', 'en', 'es'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? 'var(--tdgflow-navy-subtle)' : 'none',
                  border: lang === l ? '1px solid var(--tdgflow-navy-ring)' : '1px solid transparent',
                  borderRadius: 4,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '0.5625rem',
                  fontWeight: lang === l ? 700 : 400,
                  letterSpacing: '0.08em',
                  color: lang === l ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)',
                  transition: 'all 150ms',
                }}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          {/* Billing — junto ao perfil */}
          <Link
            href="/flow/billing"
            className="flex items-center gap-2 no-underline mb-1"
            style={{
              padding: '6px 8px', margin: '0 -8px', borderRadius: 8,
              background: isActive('/flow/billing') ? 'var(--tdgflow-navy-subtle)' : 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (!isActive('/flow/billing')) (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' }}
            onMouseLeave={e => { if (!isActive('/flow/billing')) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <CreditCard size={12} style={{ color: isActive('/flow/billing') ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: isActive('/flow/billing') ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)', fontWeight: isActive('/flow/billing') ? 600 : 400 }}>
              {tr('nav.billing')}
            </span>
          </Link>

          {/* Sugestões de Melhoria — junto ao perfil */}
          <Link
            href="/flow/sugestoes"
            className="flex items-center gap-2 no-underline mb-2"
            style={{
              padding: '6px 8px',
              margin: '0 -8px',
              borderRadius: 8,
              background: isActive('/flow/sugestoes') ? 'var(--tdgflow-navy-subtle)' : 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (!isActive('/flow/sugestoes')) (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' }}
            onMouseLeave={e => { if (!isActive('/flow/sugestoes')) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <MessageSquarePlus size={12} style={{ color: isActive('/flow/sugestoes') ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: isActive('/flow/sugestoes') ? 'var(--tdgflow-navy-dim)' : 'var(--tdgflow-text-muted)', fontWeight: isActive('/flow/sugestoes') ? 600 : 400 }}>
              {tr('nav.sugestoes')}
            </span>
          </Link>

          <Link
            href="/flow/agencia"
            className="flex items-center gap-2.5 mb-3 no-underline rounded-xl"
            style={{
              padding: '7px 8px',
              margin: '0 -8px',
              transition: 'background 150ms',
              background: isActive('/flow/agencia') ? 'var(--tdgflow-navy-subtle)' : 'transparent',
            }}
            onMouseEnter={e => { if (!isActive('/flow/agencia')) (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' }}
            onMouseLeave={e => { if (!isActive('/flow/agencia')) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={28} />
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'Agente'}
              </p>
              <p style={{ fontSize: '0.625rem', letterSpacing: '0.04em', color: 'var(--tdgflow-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.agency}
              </p>
            </div>
          </Link>
          <div className="flex items-center justify-between">
            <button
              onClick={() => signOut({ callbackUrl: '/flow/login' })}
              className="flex items-center gap-1.5"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.02em', transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--tdgflow-error)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--tdgflow-text-muted)')}
            >
              <LogOut size={11} /> {tr('auth.signout')}
            </button>
            <NotificationBell />
          </div>
          <p style={{ marginTop: 10, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)', textAlign: 'center' }}>
            {APP_VERSION}
          </p>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Mobile header — hidden on desktop */}
        <div className="mobile-only" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 44, flexShrink: 0, background: 'var(--tdgflow-surface)', borderBottom: '1px solid var(--tdgflow-border)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--tdgflow-text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.agency || 'TDG Flow'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={28} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 56 }}>
          {children}
        </div>
      </main>

      {/* ── Bottom nav — mobile only ──────────────────────────────────── */}
      <nav
        className="mobile-only"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, alignItems: 'stretch', background: 'rgba(253,252,250,0.96)', borderTop: '1px solid var(--tdgflow-border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 40, height: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {PRIMARY_NAV.map(({ href, icon: Icon, tkey }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-1 no-underline relative" style={{ minWidth: 0, paddingTop: 2 }}>
              {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 1, background: 'var(--tdgflow-navy)', borderRadius: '0 0 2px 2px' }} />}
              <span style={{ position: 'relative' }}>
                <Icon size={18} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', transition: 'color 0.15s' }} />
                {tkey === 'dicas' && pendingLeads > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -6, width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--tdgflow-accent-warm)', border: '1.5px solid var(--tdgflow-surface)',
                  }} />
                )}
              </span>
              <span style={{ fontSize: '0.5rem', fontWeight: active ? 600 : 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', transition: 'color 0.15s' }}>
                {tr(`nav.${tkey}`)}
              </span>
            </Link>
          )
        })}

        <button onClick={() => setShowMore(true)} className="flex-1 flex flex-col items-center justify-center gap-1 relative" style={{ paddingTop: 2 }}>
          {secondaryActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 1, background: 'var(--tdgflow-navy)', borderRadius: '0 0 2px 2px' }} />}
          <MoreHorizontal size={18} strokeWidth={1.5} style={{ color: secondaryActive ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)' }} />
          <span style={{ fontSize: '0.5rem', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: secondaryActive ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)' }}>
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
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, borderRadius: '20px 20px 0 0', overflow: 'hidden', background: 'var(--tdgflow-surface)', borderTop: '1px solid var(--tdgflow-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--tdgflow-border-light)' }} />
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>{user.name}</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.04em', marginTop: 2 }}>{user.agency}</p>
                </div>
                <button onClick={() => setShowMore(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--tdgflow-text-muted)' }}>
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
                      background: lang === l ? 'var(--tdgflow-navy-subtle)' : 'none',
                      border: lang === l ? '1px solid var(--tdgflow-navy-ring)' : '1px solid var(--tdgflow-border)',
                      borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
                      fontSize: '0.625rem', fontWeight: lang === l ? 700 : 400, letterSpacing: '0.08em',
                      color: lang === l ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)', transition: 'all 150ms',
                    }}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--tdgflow-border)', margin: '0 0 8px' }} />

              <div className="px-4 pb-4 space-y-0.5">
                {SECONDARY_NAV.map(({ href, icon: Icon, tkey, soon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={soon ? '#' : href}
                      onClick={e => { if (soon) e.preventDefault(); else setShowMore(false) }}
                      className="flex items-center gap-3.5 no-underline"
                      style={{ padding: '12px 14px', color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)', borderLeft: active ? '1px solid var(--tdgflow-navy)' : '1px solid transparent', borderRadius: 2, opacity: soon ? 0.45 : 1 }}
                    >
                      <Icon size={16} strokeWidth={active ? 2 : 1.5} style={{ color: 'inherit', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9375rem', fontWeight: active ? 500 : 400 }}>{tr(`nav.${tkey}`)}</span>
                      {soon && <span style={{ marginLeft: 'auto', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>{tr('nav.breve')}</span>}
                    </Link>
                  )
                })}

                <div style={{ height: 1, background: 'var(--tdgflow-border)', margin: '8px 14px' }} />

                {/* Billing */}
                <Link
                  href="/flow/billing"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3.5 no-underline"
                  style={{ padding: '12px 14px', color: isActive('/flow/billing') ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)', borderLeft: isActive('/flow/billing') ? '1px solid var(--tdgflow-navy)' : '1px solid transparent', borderRadius: 2 }}
                >
                  <CreditCard size={16} strokeWidth={isActive('/flow/billing') ? 2 : 1.5} style={{ color: 'inherit', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem', fontWeight: isActive('/flow/billing') ? 500 : 400 }}>{tr('nav.billing')}</span>
                </Link>

                {/* Sugestões — junto ao perfil no mobile também */}
                <Link
                  href="/flow/sugestoes"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3.5 no-underline"
                  style={{ padding: '12px 14px', color: isActive('/flow/sugestoes') ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)', borderLeft: isActive('/flow/sugestoes') ? '1px solid var(--tdgflow-navy)' : '1px solid transparent', borderRadius: 2 }}
                >
                  <MessageSquarePlus size={16} strokeWidth={isActive('/flow/sugestoes') ? 2 : 1.5} style={{ color: 'inherit', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem', fontWeight: isActive('/flow/sugestoes') ? 500 : 400 }}>{tr('nav.sugestoes')}</span>
                </Link>

                <div style={{ height: 1, background: 'var(--tdgflow-border)', margin: '8px 14px' }} />

                <button
                  onClick={() => signOut({ callbackUrl: '/flow/login' })}
                  className="flex items-center gap-3.5 w-full"
                  style={{ padding: '12px 14px', background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', borderRadius: 2, transition: 'color 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--tdgflow-error)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--tdgflow-text-muted)')}
                >
                  <LogOut size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9375rem' }}>{tr('auth.signout')}</span>
                </button>
              </div>
              <p style={{ textAlign: 'center', paddingBottom: 8, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)' }}>
                {APP_VERSION}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
