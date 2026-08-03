'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Sparkles, Tag, Lightbulb, FileText, Search,
  LogOut, MoreHorizontal, X, Users, BarChart2, MessageSquarePlus, CreditCard, Network, UserPlus, Globe
} from 'lucide-react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { APP_VERSION } from '@/lib/version'
import { type Lang, LANG_LABELS } from '@/lib/i18n'
import { sounds } from '@/lib/sounds'
import { ToastProvider } from '@/contexts/ToastContext'
import NotificationBell from '@/components/NotificationBell'
import UserAvatar from '@/components/UserAvatar'
import GlobalSearch from '@/components/GlobalSearch'

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
  assistente: 'Pergunte sobre hotéis, promoções ou dúvidas do sistema — resposta na hora',
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

// Ordem dos grupos — Referência antes de Gestão (decisão da Carla + painel
// arquiteto/designer/UX, 01/08): Referência (Docs, TDG Knowledge Base) é
// consulta do dia a dia durante uma venda; Gestão (Analytics, Equipe,
// Billing) é ritual semanal/mensal — a sidebar ordena por frequência de
// uso real, não por hierarquia administrativa.
const NAV_GROUPS_AGENT: NavGroup[] = [
  { labelKey: 'nav.groupReferencia', items: REFERENCE_ITEMS },
  { labelKey: 'nav.groupGestao', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    BILLING_ITEM,
  ] },
]

const NAV_GROUPS_ADMIN: NavGroup[] = [
  { labelKey: 'nav.groupReferencia', items: REFERENCE_ITEMS },
  { labelKey: 'nav.groupGestao', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    { href: '/flow/gestao', icon: Users, tkey: 'gestao' },
    BILLING_ITEM,
  ] },
]

// agency_admin: administra só a equipe da própria agência (nunca entre
// agências — isso fica exclusivo do admin global via NAV_GROUPS_ADMIN acima).
const NAV_GROUPS_AGENCY_ADMIN: NavGroup[] = [
  { labelKey: 'nav.groupReferencia', items: REFERENCE_ITEMS },
  { labelKey: 'nav.groupGestao', items: [
    { href: '/flow/analytics', icon: BarChart2, tkey: 'analytics' },
    { href: '/flow/equipe', icon: UserPlus, tkey: 'equipe' },
    BILLING_ITEM,
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

// Abre embaixo do item (ou em cima, pro último item da lista — `openUp` —
// pra nunca cortar no fim da sidebar). Largura presa a 176px (208px da
// sidebar menos o padding do nav) com quebra de linha: nunca vaza pro
// conteúdo principal ao lado, que era o bug reportado pela Carla quando o
// tooltip abria lateralmente.
function NavTooltip({ text, openUp = false }: { text: string; openUp?: boolean }) {
  return (
    <span
      role="tooltip"
      style={{
        position: 'absolute', left: 0,
        ...(openUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
        width: 'max-content', maxWidth: 176, whiteSpace: 'normal',
        background: 'var(--tdgflow-navy-dim)', color: 'var(--tdgflow-surface)',
        fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.35,
        padding: '6px 10px', borderRadius: 8,
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)', pointerEvents: 'none', zIndex: 60,
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

  // Super Busca global (Fase 8d) — atalho de qualquer tela, não só Destinos.
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

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
  // Reports de erro pendentes (Linha Direta Bemgsy) — mesmo padrão de
  // pendingGuestRequests: fila de trabalho do admin, badge no item onde se
  // resolve, não aviso passageiro no sino.
  const [pendingBugReports, setPendingBugReports] = useState(0)
  // Fila de confirmação (Fase 6) — dois contadores, cada um no seu lugar:
  // pendingImportConfirmations é a fila do admin (Rede TDG/Billing, mesmo
  // badge de pendingGuestRequests); pendingMyConfirmations é a fila do
  // próprio usuário ("você disse isso, confirma?"), em Na prática/TDG
  // Knowledge Base — hoje sempre 0 pra qualquer conta real (ver
  // pending-content/route.ts), acende sozinha quando a rede tiver contas
  // com nome batendo nos autores importados.
  const [pendingImportConfirmations, setPendingImportConfirmations] = useState(0)
  const [pendingMyReviewConfirmations, setPendingMyReviewConfirmations] = useState(0)
  const [pendingMyKnowledgeConfirmations, setPendingMyKnowledgeConfirmations] = useState(0)
  useEffect(() => {
    fetch('/api/context')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        setPendingLeads(data.pending_leads ?? 0)
        setPendingGuestRequests(data.pending_guest_requests ?? 0)
        setPendingBugReports(data.pending_bug_reports ?? 0)
        setPendingImportConfirmations(data.pending_import_confirmations ?? 0)
        setPendingMyReviewConfirmations(data.pending_my_review_confirmations ?? 0)
        setPendingMyKnowledgeConfirmations(data.pending_my_knowledge_confirmations ?? 0)
      })
      .catch(() => {})
  }, [])

  const isAdmin = user.role === 'admin'
  const isAgencyAdmin = user.role === 'agency_admin'
  const NAV_GROUPS = isAdmin ? NAV_GROUPS_ADMIN : isAgencyAdmin ? NAV_GROUPS_AGENCY_ADMIN : NAV_GROUPS_AGENT
  const SECONDARY_NAV = NAV_GROUPS.flatMap(g => g.items)
  const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]
  // Posicional, não hardcoded num tkey — a reordenação dos grupos (01/08) já
  // mudou quem é o último item real (era 'inbox', virou 'billing'); calcular
  // aqui evita que uma reordenação futura quebre o tooltip silenciosamente.
  const lastSecondaryHref = SECONDARY_NAV[SECONDARY_NAV.length - 1]?.href

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
        {/* Header do produto — decisão da Carla, 30/07: o canto superior
            esquerdo passa a ser o lockup do PRÓPRIO PRODUTO ("TDG · Flow"),
            não mais o logo da agência individual (esse desce pro card de
            perfil/rankings). Conceito aprovado depois de 2 rodadas —
            tipografia real limpa, onda como traço único e discreto (nunca
            substituindo uma letra — 1ª tentativa ficou "gráfica demais",
            reprovada). Zona navy dedicada porque dourado como texto direto
            em fundo branco reprova contraste (mesmo princípio que já
            baniu dourado puro como texto no resto do design system) — aqui
            replica o mesmo palco escuro que o Guest já usa no login,
            consistência de família. Onda anima uma vez só ao carregar
            (nunca em loop — regra do design system: animação é pra
            momento de feedback, nunca decorativa/ambiente). */}
        <div style={{
          position: 'relative', overflow: 'hidden', flexShrink: 0,
          background: 'radial-gradient(ellipse at 50% 0%, #172431 0%, var(--tdgflow-navy-dim) 75%)',
          padding: '20px 20px 16px',
        }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/tdg-mark-white.png" alt="TDG" style={{ height: 20, objectFit: 'contain', flexShrink: 0 }} />
              <div style={{ width: 1, height: 20, background: 'rgba(234,241,245,0.22)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '1.5rem', color: 'var(--tdgflow-gold)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                Flow
              </span>
            </div>
            <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setShowGlobalSearch(true)}
                title="Buscar em tudo"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }}
              >
                <Search size={16} style={{ color: 'rgba(234,241,245,0.75)' }} />
              </button>
              <NotificationBell align="left" theme="dark" />
            </div>
          </div>
          <svg className="flow-wave-once" width="96" height="10" viewBox="0 0 96 10" style={{ display: 'block', marginTop: 8 }}>
            <path d="M 3 5 C 26 -2, 38 12, 62 5 C 72 1, 82 1, 93 5"
              fill="none" stroke="var(--tdgflow-gold)" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
          </svg>
          {/* Só "Rede TDG" aqui — "powered by Bemgsy" já tem crédito próprio
              (com logo de verdade) no rodapé da sidebar; repetir os dois
              nessa legenda pequena quebrava em 2 linhas e era redundante. */}
          <p style={{ marginTop: 8, fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(234,241,245,0.5)', whiteSpace: 'nowrap' }}>
            Rede TDG
          </p>
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
                {tkey === 'dicas' && (pendingLeads + pendingMyReviewConfirmations) > 0 && (
                  <span style={{
                    marginLeft: 'auto', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--tdgflow-accent-warm)', color: '#fff',
                    fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
                  }}>
                    {pendingLeads + pendingMyReviewConfirmations}
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
                    {hoveredNav === tkey && NAV_HINTS[tkey] && <NavTooltip text={NAV_HINTS[tkey]} openUp={href === lastSecondaryHref} />}
                    <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color: active ? 'var(--tdgflow-agency-accent)' : 'var(--tdgflow-text-secondary)', flexShrink: 0, transition: 'color 150ms' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, letterSpacing: '-0.005em', color: active ? 'var(--tdgflow-agency-accent)' : 'inherit' }}>
                      {tr(`nav.${tkey}`)}
                    </span>
                    {soon && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>{tr('nav.breve')}</span>}
                    {tkey === 'billing' && (pendingGuestRequests + pendingImportConfirmations) > 0 && (
                      <span style={{
                        marginLeft: 'auto', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--tdgflow-accent-warm)', color: '#fff',
                        fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
                      }}>
                        {pendingGuestRequests + pendingImportConfirmations}
                      </span>
                    )}
                    {tkey === 'destinos' && pendingMyKnowledgeConfirmations > 0 && (
                      <span style={{
                        marginLeft: 'auto', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--tdgflow-accent-warm)', color: '#fff',
                        fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
                      }}>
                        {pendingMyKnowledgeConfirmations}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer — idioma saiu daqui (01/08, painel arquiteto/designer/UX):
            rodapé de 6 blocos empilhados não cabia sem scroll em viewport
            curto/espanhol. Idioma é preferência que se escolhe uma vez, não
            merece imóvel permanente — mudou pra Meu Perfil (`/flow/agencia`),
            já a um clique daqui. Mobile mantém o seletor (sobra espaço lá). */}
        <div className="flex-shrink-0 px-4 pb-5 pt-4" style={{ borderTop: '1px solid var(--tdgflow-border)' }}>
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
            {isAdmin && pendingBugReports > 0 && (
              <span style={{
                marginLeft: 'auto', minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--tdgflow-error)', color: '#fff',
                fontSize: '0.625rem', fontWeight: 700, lineHeight: 1,
              }}>
                {pendingBugReports}
              </span>
            )}
          </Link>

          {/* Identidade + Sair na mesma linha (01/08) — eram 2 blocos
              empilhados; Link e button ficam irmãos, nunca aninhados
              (interativo dentro de interativo quebra semântica/a11y). */}
          <div className="flex items-center gap-1 mb-2" style={{ margin: '0 -8px 8px' }}>
            <Link
              href="/flow/agencia"
              className="flex items-center gap-2.5 no-underline rounded-xl flex-1 min-w-0"
              style={{
                padding: '7px 8px',
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
                {/* Badge Membro Fundador — encurtado 01/08 ("TDG Flow" era
                    redundante dentro do próprio TDG Flow, e quebrava em 2
                    linhas mesmo em espanhol). Reusa o sistema .badge já existente. */}
                <span className="badge badge-gold" style={{ marginTop: 3, fontSize: '0.5625rem', borderRadius: 6, lineHeight: 1.35 }}>
                  Membro Fundador
                </span>
              </div>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/flow/login' })}
              title={tr('auth.signout')}
              aria-label={tr('auth.signout')}
              style={{
                flexShrink: 0, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer',
                color: 'var(--tdgflow-text-muted)', transition: 'color 150ms, background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--tdgflow-error)'; e.currentTarget.style.background = 'var(--tdgflow-surface-high)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--tdgflow-text-muted)'; e.currentTarget.style.background = 'none' }}
            >
              <LogOut size={14} />
            </button>
          </div>
          {/* Bemgsy — motor invisível do produto (achado da Carla, 29/07: não
              havia NENHUMA menção à Bemgsy em lugar nenhum da UI; 1ª tentativa
              a 10px/opacity 0.55 era abaixo do piso de legibilidade tipográfica,
              não só "discreta" — achado técnico do arquiteto, não gosto).
              Rótulo "Powered by" garante o significado mesmo sem hover — a
              tooltip nativa continua existindo como bônus, não como único canal.
              Junto com a versão numa linha só (01/08, eram 2 linhas).
              03/08: variante "compacta" do padrão oficial (skill bemgsy-design)
              — sem tagline/onda porque isso aparece em TODA navegação (chrome
              persistente, não um placement único); wordmark um pouco maior
              que antes (16→18) mas limitado pela largura real da sidebar
              (208px), não pelo tamanho "rico" usado no rodapé do site. */}
          <div className="flex items-center justify-center" style={{ marginTop: 6, gap: 6 }} title="Bemgsy — Amplifying Human Hospitality">
            <span style={{ fontSize: '0.5rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)' }}>
              Powered by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/bemgsy-mark.png" alt="Bemgsy" style={{ height: 18, objectFit: 'contain', opacity: 0.6 }} />
            <span style={{ fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)' }}>
              · {APP_VERSION}
            </span>
          </div>
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
              TDG Flow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGlobalSearch(true)}
              title="Buscar em tudo"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <Search size={17} style={{ color: 'var(--tdgflow-text-muted)' }} />
            </button>
            <NotificationBell />
            <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={28} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 56 }}>
          {children}
        </div>

        {showGlobalSearch && <GlobalSearch onClose={() => setShowGlobalSearch(false)} />}
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
                  {isAdmin && pendingBugReports > 0 && (
                    <span style={{
                      marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--tdgflow-error)', color: '#fff',
                      fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1,
                    }}>
                      {pendingBugReports}
                    </span>
                  )}
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
              <div className="flex items-center justify-center" style={{ marginTop: 8, gap: 6 }} title="Bemgsy — Amplifying Human Hospitality">
                <span style={{ fontSize: '0.5rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tdgflow-text-faint)' }}>
                  Powered by
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/bemgsy-mark.png" alt="Bemgsy" style={{ height: 20, objectFit: 'contain', opacity: 0.6 }} />
              </div>
              <p style={{ textAlign: 'center', paddingBottom: 8, paddingTop: 6, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--tdgflow-text-faint)' }}>
                {APP_VERSION}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
