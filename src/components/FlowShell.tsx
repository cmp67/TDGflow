'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Sparkles, Tag, Lightbulb, FileText,
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
  rede:       'Fornecedores parceiros e contatos da rede — reps, DMCs, pessoas',
  analytics:  'Seu desempenho e o da rede',
  agencia:    'Seu perfil e dados da agência',
  gestao:     'Usuários e permissões da agência',
  equipe:     'Convide e gerencie sua equipe',
  docs:       'Documentação e materiais de apoio',
  destinos:   'Conhecimento prático por país — vistos, costumes, avisos',
  inbox:      'Em breve',
  sugestoes:  'Documentos, atas e roadmap da parceria — e suas sugestões',
  billing:    'Assinatura e uso de Lumis',
}

// Regrupado por natureza de uso (achado da Carla, 29/07): Gestão (uso
// administrativo recorrente sobre a própria operação — "como está minha
// agência") e Referência (consulta pontual, conteúdo de apoio — "preciso
// checar algo"). Billing entra em Gestão — antes vivia isolado no rodapé
// por convenção genérica de SaaS ("billing fica perto do perfil"), mas aqui
// é dado de negócio da agência, não conta pessoal.
//
// 'agencia' (Meu Perfil) fica de fora daqui de propósito — já é acessível pelo
// card de identidade no rodapé (avatar + nome + agência). Tê-lo duplicado aqui
// sob o rótulo "Minha Agência" confundia: o destino real é uma tela de perfil
// pessoal (nome, senha), não configurações de agência — dois links, dois
// rótulos, o mesmo lugar.
// "Da mesa" saiu daqui (Fase 6) — o próprio texto da página já dizia "não é
// conteúdo pra navegar direto" (só 2 botões modais, zero conteúdo pra rolar).
// Virou ação "Gravar" dentro de "Na prática".
const REFERENCE_ITEMS: NavItem[] = [
  { href: '/flow/docs',      icon: FileText, tkey: 'docs' },
  { href: '/flow/destinos',  icon: Globe,    tkey: 'destinos' },
  { href: '/flow/inbox',     icon: Mail,     tkey: 'inbox', soon: true },
]

const BILLING_ITEM: NavItem = { href: '/flow/billing', icon: CreditCard, tkey: 'billing' }

const NAV_GROUPS_AGENT: NavGroup[] = [
  { labelKey: 'nav.groupGestao', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    BILLING_ITEM,
  ] },
  { labelKey: 'nav.groupReferencia', items: REFERENCE_ITEMS },
]

const NAV_GROUPS_ADMIN: NavGroup[] = [
  { labelKey: 'nav.groupGestao', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    { href: '/flow/gestao', icon: Users, tkey: 'gestao' },
    BILLING_ITEM,
  ] },
  { labelKey: 'nav.groupReferencia', items: REFERENCE_ITEMS },
]

// agency_admin: administra só a equipe da própria agência (nunca entre
// agências — isso fica exclusivo do admin global via NAV_GROUPS_ADMIN acima).
const NAV_GROUPS_AGENCY_ADMIN: NavGroup[] = [
  { labelKey: 'nav.groupGestao', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    { href: '/flow/equipe', icon: UserPlus, tkey: 'equipe' },
    BILLING_ITEM,
  ] },
  { labelKey: 'nav.groupReferencia', items: REFERENCE_ITEMS },
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

function NavTooltip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      style={{
        position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)',
        background: 'var(--tdgflow-navy-dim)', color: 'var(--tdgflow-surface)',
        fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.4,
        padding: '6px 10px', borderRadius: 8, whiteSpace: 'nowrap',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)', pointerEvents: 'none', zIndex: 50,
      }}
    >
      {text}
    </span>
  )
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

  // Tooltip próprio, não o `title` nativo do navegador — nativo só aparece
  // depois de hover sustentado e não é capturável em print de tela (achado
  // da Carla testando). Renderizado no DOM, some rápido, some previsível.
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  // Antecipação: quantas descobertas da rede aguardam teste real, visível
  // na sidebar sem precisar entrar em "Na prática" pra saber que existem.
  const [pendingLeads, setPendingLeads] = useState(0)
  // Pedidos de ativação GUEST pendentes — fila de trabalho do Admin da Rede
  // (0 pra qualquer outro papel, o backend já filtra). Saiu do sino (29/07):
  // vira badge no item onde se resolve de fato, não aviso passageiro.
  const [pendingGuestRequests, setPendingGuestRequests] = useState(0)
  useEffect(() => {
    fetch('/api/context')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        setPendingLeads(data.pending_leads ?? 0)
        setPendingGuestRequests(data.pending_guest_requests ?? 0)
      })
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
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: 'var(--tdgflow-bg)',
        // Pele da agência (achado 29/07: cor configurada nunca era aplicada
        // em nada) — sobrescreve --tdgflow-agency-accent pra essa sessão
        // inteira quando a agência configurou uma cor; sem cor, o token
        // mantém o default (navy) definido em globals.css.
        ...(brand?.primaryColor ? { ['--tdgflow-agency-accent' as string]: brand.primaryColor } : {}),
      }}
    >

      {/* ── Sidebar — desktop only ─────────────────────────────────── */}
      <aside
        className="desktop-only"
        style={{ flexDirection: 'column', flexShrink: 0, width: 208, background: 'var(--tdgflow-surface)', borderRight: '1px solid var(--tdgflow-border)' }}
      >
        {/* Logotype — pele da agência é sempre o protagonista (achado da
            Carla, 29/07: logo pequeno + "powered by" em texto puro não
            comunicava marca nenhuma de verdade). Logo da agência grande e
            sozinho; TDG (rede) vira selo pequeno abaixo, substituindo o
            texto; Bemgsy (motor invisível) só aparece discreto no rodapé,
            perto da versão — nunca disputando espaço aqui em cima.
            Sino sobe pra cá (29/07) — antes vivia no rodapé colado ao "Sair",
            posição que sinalizava baixa prioridade mesmo sem intenção. Único
            lugar de notificação no desktop agora (sidebar não tem topbar). */}
        <div className="px-6 pt-7 flex-shrink-0 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {brand?.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={brand.logoUrl}
                alt={user.agency || 'Logo da agência'}
                style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <p style={{
                fontFamily: 'var(--tdgflow-font-sans)', fontSize: '1.0625rem', fontWeight: 700,
                letterSpacing: '-0.01em', color: 'var(--tdgflow-text-primary)', lineHeight: 1.25,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
              }}>
                {user.agency || 'TDG'}
              </p>
            )}
          </div>
          <div style={{ flexShrink: 0, marginTop: -2 }}>
            <NotificationBell align="left" />
          </div>
        </div>
        <div className="px-6 pb-6 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/tdg-logo.jpg" alt="Rede TDG" style={{ height: 14, objectFit: 'contain', display: 'block' }} />
          <div style={{
            marginTop: 8, height: '1px', width: 48,
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
                onClick={() => !active && sounds.nav()}
                className="flex items-center gap-3 no-underline relative"
                style={{
                  padding: '8px 10px 8px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)',
                  background: active ? 'var(--tdgflow-agency-accent-subtle)' : 'transparent',
                  borderLeft: active ? '2px solid var(--tdgflow-agency-accent)' : '2px solid transparent',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { setHoveredNav(tkey); if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' } }}
                onMouseLeave={e => { setHoveredNav(null); if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
              >
                {hoveredNav === tkey && NAV_HINTS[tkey] && <NavTooltip text={NAV_HINTS[tkey]} />}
                <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--tdgflow-agency-accent)' : 'inherit' }}>
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
                    onClick={e => { if (soon) e.preventDefault(); else if (!active) sounds.nav() }}
                    className="flex items-center gap-3 no-underline relative"
                    style={{
                      padding: '8px 10px 8px 10px',
                      borderRadius: 8,
                      marginBottom: 2,
                      color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)',
                      background: active ? 'var(--tdgflow-agency-accent-subtle)' : 'transparent',
                      borderLeft: active ? '2px solid var(--tdgflow-agency-accent)' : '2px solid transparent',
                      transition: 'all 150ms',
                      opacity: soon ? 0.55 : 1,
                      cursor: soon ? 'default' : 'pointer',
                    }}
                    onMouseEnter={e => { setHoveredNav(tkey); if (!active && !soon) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' } }}
                    onMouseLeave={e => { setHoveredNav(null); if (!active && !soon) { (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
                  >
                    {hoveredNav === tkey && NAV_HINTS[tkey] && <NavTooltip text={NAV_HINTS[tkey]} />}
                    <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--tdgflow-agency-accent)' : 'inherit' }}>
                      {tr(`nav.${tkey}`)}
                    </span>
                    {soon && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>{tr('nav.breve')}</span>}
                    {tkey === 'billing' && pendingGuestRequests > 0 && (
                      <span style={{
                        marginLeft: 'auto', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--tdgflow-accent-warm)', color: '#fff',
                        fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
                      }}>
                        {pendingGuestRequests}
                      </span>
                    )}
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

          {/* Sugestões de Melhoria — junto ao perfil (Billing agora mora no grupo Gestão, na nav principal) */}
          <Link
            href="/flow/sugestoes"
            className="flex items-center gap-2 no-underline mb-2"
            style={{
              padding: '6px 8px',
              margin: '0 -8px',
              borderRadius: 8,
              background: isActive('/flow/sugestoes') ? 'var(--tdgflow-agency-accent-subtle)' : 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (!isActive('/flow/sugestoes')) (e.currentTarget as HTMLElement).style.background = 'var(--tdgflow-surface-high)' }}
            onMouseLeave={e => { if (!isActive('/flow/sugestoes')) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <MessageSquarePlus size={12} style={{ color: isActive('/flow/sugestoes') ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: isActive('/flow/sugestoes') ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-muted)', fontWeight: isActive('/flow/sugestoes') ? 600 : 400 }}>
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
          <button
            onClick={() => signOut({ callbackUrl: '/flow/login' })}
            className="flex items-center gap-1.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.02em', transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--tdgflow-error)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--tdgflow-text-muted)')}
          >
            <LogOut size={11} /> {tr('auth.signout')}
          </button>
          {/* Bemgsy — motor invisível do produto (achado da Carla, 29/07: não
              havia NENHUMA menção à Bemgsy em lugar nenhum da UI). Discreto
              de propósito — não disputa com agência (protagonista) nem TDG
              (selo de rede). Tagline só no hover, não ocupa espaço permanente. */}
          <div className="flex justify-center" style={{ marginTop: 10 }} title="Bemgsy — Amplifying Human Hospitality">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/bemgsy-logo.png" alt="Bemgsy — Amplifying Human Hospitality" style={{ height: 10, objectFit: 'contain', opacity: 0.55 }} />
          </div>
          <p style={{ marginTop: 4, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)', textAlign: 'center' }}>
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
              {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 1, background: 'var(--tdgflow-agency-accent)', borderRadius: '0 0 2px 2px' }} />}
              <span style={{ position: 'relative' }}>
                <Icon size={18} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-muted)', transition: 'color 0.15s' }} />
                {tkey === 'dicas' && pendingLeads > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -6, width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--tdgflow-accent-warm)', border: '1.5px solid var(--tdgflow-surface)',
                  }} />
                )}
              </span>
              <span style={{ fontSize: '0.5rem', fontWeight: active ? 600 : 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-muted)', transition: 'color 0.15s' }}>
                {tr(`nav.${tkey}`)}
              </span>
            </Link>
          )
        })}

        <button onClick={() => setShowMore(true)} className="flex-1 flex flex-col items-center justify-center gap-1 relative" style={{ paddingTop: 2 }}>
          {secondaryActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 1, background: 'var(--tdgflow-agency-accent)', borderRadius: '0 0 2px 2px' }} />}
          <MoreHorizontal size={18} strokeWidth={1.5} style={{ color: secondaryActive ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-muted)' }} />
          <span style={{ fontSize: '0.5rem', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: secondaryActive ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-muted)' }}>
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
                      style={{ padding: '12px 14px', color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)', borderLeft: active ? '1px solid var(--tdgflow-agency-accent)' : '1px solid transparent', borderRadius: 2, opacity: soon ? 0.45 : 1 }}
                    >
                      <Icon size={16} strokeWidth={active ? 2 : 1.5} style={{ color: 'inherit', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9375rem', fontWeight: active ? 500 : 400 }}>{tr(`nav.${tkey}`)}</span>
                      {soon && <span style={{ marginLeft: 'auto', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>{tr('nav.breve')}</span>}
                      {tkey === 'billing' && pendingGuestRequests > 0 && (
                        <span style={{
                          marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--tdgflow-accent-warm)', color: '#fff',
                          fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1,
                        }}>
                          {pendingGuestRequests}
                        </span>
                      )}
                    </Link>
                  )
                })}

                <div style={{ height: 1, background: 'var(--tdgflow-border)', margin: '8px 14px' }} />

                {/* Sugestões — junto ao perfil no mobile também (Billing agora mora em SECONDARY_NAV, grupo Gestão) */}
                <Link
                  href="/flow/sugestoes"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3.5 no-underline"
                  style={{ padding: '12px 14px', color: isActive('/flow/sugestoes') ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)', borderLeft: isActive('/flow/sugestoes') ? '1px solid var(--tdgflow-agency-accent)' : '1px solid transparent', borderRadius: 2 }}
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
              <div className="flex justify-center" style={{ marginTop: 6 }} title="Bemgsy — Amplifying Human Hospitality">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/bemgsy-logo.png" alt="Bemgsy — Amplifying Human Hospitality" style={{ height: 10, objectFit: 'contain', opacity: 0.55 }} />
              </div>
              <p style={{ textAlign: 'center', paddingBottom: 8, paddingTop: 4, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)' }}>
                {APP_VERSION}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
