'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, Zap, Megaphone, Radar } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { type Lang, LANG_LABELS } from '@/lib/i18n'
import { LANDING_COPY } from '@/lib/landing-i18n'

/* ── Marca TDG (manual de identidade visual, recebido 02/08/2026) ────────
   Paleta própria do Travel Designers Group — distinta da paleta estrutural
   Bemgsy (--tdgflow-navy #1A2B4C / --tdgflow-gold #D4AF37) usada no produto
   TDG Flow em si. Esta página representa a marca TDG, não o produto — por
   isso usa as cores oficiais do manual, escopadas aqui e não nos tokens
   globais (que continuam servindo o "esqueleto" do app interno).

   03/08/2026 — reestruturação pós-revisão de design: a página existe para
   atrair fornecedores/experiências que queiram conceder benefícios
   exclusivos ao grupo — não para vender a tecnologia. "O Grupo" passa a
   seção dominante logo após o hero; "TDG Flow" encolhe para uma seção
   secundária e curta, que prova como o grupo opera (e ganha o logotipo
   real do Flow). Também corrige os achados de contraste da revisão:
   terracotta fica reservado a glifos e fundo de botão, nunca texto pequeno
   sobre navy; o nav ganha estado claro/escuro real (antes ficava invisível
   sobre o hero escuro); e a faixa "Reconhecidos por" foi incorporada ao
   hero para não deixar um respiro claro isolado entre duas seções escuras.

   03/08/2026 — idioma: página ganha PT/EN/ES, mesmo padrão de seletor já
   usado no app interno (FlowShell.tsx via @/lib/i18n), mas com dicionário
   próprio em @/lib/landing-i18n — o texto da página institucional é
   diferente da UI do app logado. Persiste em localStorage na mesma chave
   do app ('tdg-lang'), assim a escolha de idioma acompanha quem visita o
   site e depois acessa o Flow. EN/ES são traduções novas (ver comentário
   no topo de landing-i18n.ts) — ainda sem revisão de falante nativo.

   04/08/2026 — pivô de fase (pedido da Carla): a página deixa de ser um
   pitch de parceria comercial e vira puramente explicativa. Nenhuma
   menção ao número de agências; TDG Group ganha mais destaque no hero
   (o nome do grupo passa a ser a própria headline); removido todo CTA
   que convida fornecedor/experiência a virar parceiro comercial. Ver
   comentário no topo de landing-i18n.ts pro detalhe de cada mudança de
   copy. */
const TDG = {
  navy:       '#112630',
  tealDark:   '#104C64',
  teal:       '#008C94',
  sage:       '#93A889',
  terracotta: '#B6410F',
}

/* Estrela de 4 pontas — asset de marca próprio (página "Pattern" do manual),
   reaproveitado como textura de fundo no hero e como glifo ao lado dos
   rótulos de seção. Uso puramente decorativo (o rótulo ao lado já carrega
   a informação em texto), por isso mantém a cor de marca mesmo sobre fundo
   navy sem risco de reprovar contraste de texto. */
const STAR_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M20 4 L23 17 L36 20 L23 23 L20 36 L17 23 L4 20 L17 17 Z' fill='${TDG.terracotta}'/></svg>`
const STAR_PATTERN_URL = `url("data:image/svg+xml,${encodeURIComponent(STAR_SVG)}")`

function StarGlyph({ size = 9 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <path d="M20 4 L23 17 L36 20 L23 23 L20 36 L17 23 L4 20 L17 17 Z" fill={TDG.terracotta} />
    </svg>
  )
}

/* ── Fade-up on scroll ─────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Seletor PT/EN/ES — mesmo desenho visual do switcher já usado no app
   interno (FlowShell.tsx), adaptado às duas cores de fundo do nav (claro
   quando navOpaque, escuro/transparente sobre o hero). */
function LangSwitcher({ lang, setLang, navOpaque }: { lang: Lang; setLang: (l: Lang) => void; navOpaque: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {(['pt-BR', 'en', 'es'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            background: lang === l ? (navOpaque ? 'rgba(17,38,48,0.08)' : 'rgba(234,241,245,0.14)') : 'none',
            border: lang === l
              ? `1px solid ${navOpaque ? 'rgba(17,38,48,0.25)' : 'rgba(234,241,245,0.35)'}`
              : '1px solid transparent',
            borderRadius: 4, padding: '3px 7px', cursor: 'pointer',
            fontSize: '0.625rem', fontWeight: lang === l ? 700 : 400, letterSpacing: '0.06em',
            color: lang === l
              ? (navOpaque ? 'var(--tdgflow-text-primary)' : '#ffffff')
              : (navOpaque ? 'var(--tdgflow-text-muted)' : 'rgba(234,241,245,0.6)'),
            transition: 'all 150ms',
          }}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  )
}

/* ── Data ──────────────────────────────────────────────────────────── */
const FLOW_PILLAR_ICONS = [Users, Zap, Megaphone, Radar]

/* ── Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [navOpaque, setNavOpaque] = useState(false)
  const [lang, setLangState] = useState<Lang>('pt-BR')

  useEffect(() => {
    const onScroll = () => setNavOpaque(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('tdg-lang') as Lang | null
    if (stored && stored in LANDING_COPY) setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('tdg-lang', l)
  }

  const T = LANDING_COPY[lang]
  const flowPillars = FLOW_PILLAR_ICONS.map((icon, i) => ({
    icon,
    title: T[`flow.pillar${i + 1}Title`],
    desc: T[`flow.pillar${i + 1}Desc`],
  }))

  return (
    <div style={{ background: 'var(--tdgflow-bg)', color: 'var(--tdgflow-text-primary)', fontFamily: 'var(--tdgflow-font-sans)' }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${navOpaque ? 'nav-opaque' : ''}`}
        style={{ borderBottom: '1px solid transparent' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={navOpaque ? '/brand/tdg-mark.png' : '/brand/tdg-mark-white.png'}
              alt="TDG"
              style={{ height: 16, objectFit: 'contain' }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: navOpaque ? 'var(--tdgflow-text-primary)' : '#F4F7F8', letterSpacing: '-0.01em', transition: 'color 200ms' }}>
              Travel Designers Group
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {['#grupo', '#flow'].map((href, i) => (
              <a
                key={href}
                href={href}
                className="no-underline transition-colors duration-150"
                style={{ fontSize: '0.8125rem', fontWeight: 400, color: navOpaque ? 'var(--tdgflow-text-muted)' : 'rgba(234,241,245,0.78)', letterSpacing: '0.01em' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = navOpaque ? 'var(--tdgflow-text-primary)' : '#ffffff')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = navOpaque ? 'var(--tdgflow-text-muted)' : 'rgba(234,241,245,0.78)')}
              >
                {[T['nav.grupo'], T['nav.flow']][i]}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <LangSwitcher lang={lang} setLang={setLang} navOpaque={navOpaque} />
            <Link
              href="/flow"
              className="no-underline flex items-center gap-1.5 transition-colors duration-150"
              style={{ fontSize: '0.8125rem', fontWeight: 500, color: navOpaque ? TDG.tealDark : '#EAF1F5' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = navOpaque ? TDG.navy : '#ffffff')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = navOpaque ? TDG.tealDark : '#EAF1F5')}
            >
              {T['nav.cta']}
              <ArrowRight size={13} style={{ color: TDG.teal }} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center grain overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: '56px' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 55% at 50% 45%, rgba(182,65,15,0.07) 0%, transparent 65%),
              linear-gradient(180deg, ${TDG.navy} 0%, #0B1A21 50%, ${TDG.navy} 100%)
            `,
          }}
        />
        {/* Textura de fundo — estrela de 4 pontas da identidade TDG */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: STAR_PATTERN_URL,
            backgroundSize: '72px 72px',
            opacity: 0.05,
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 0%, transparent 100%)',
          }}
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex items-center justify-center mb-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tdg-mark-white.png" alt="TDG" style={{ height: 'clamp(40px, 7vw, 64px)', objectFit: 'contain' }} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center justify-center gap-2 mb-8"
            style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EAF1F5' }}
          >
            <StarGlyph />
            {T['hero.eyebrow']}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 5rem)',
              fontWeight: 200,
              letterSpacing: '-0.035em',
              lineHeight: 1.08,
              color: '#F4F7F8',
              marginBottom: '1.75rem',
            }}
          >
            {T['hero.h1a']}
            <br />
            <span style={{ fontWeight: 300 }}>{T['hero.h1b']}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ fontSize: '1rem', color: '#A8C2CB', lineHeight: 1.8, fontWeight: 300, maxWidth: '460px', margin: '0 auto 2.5rem' }}
          >
            {T['hero.sub']}
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            <a
              href="#grupo"
              className="no-underline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 26px',
                background: TDG.terracotta, color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                borderRadius: 'var(--tdgflow-radius-md)', transition: 'transform 150ms var(--tdgflow-ease-smooth), background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              {T['hero.cta1']} <ArrowRight size={15} />
            </a>
            <a
              href="#flow"
              className="no-underline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px',
                background: 'transparent', color: '#EAF1F5', fontWeight: 500, fontSize: '0.875rem',
                borderRadius: 'var(--tdgflow-radius-md)', border: '1px solid rgba(234,241,245,0.25)',
                transition: 'all 150ms var(--tdgflow-ease-smooth)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,241,245,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {T['hero.cta2']}
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── O Grupo — seção dominante ────────────────────────────── */}
      <section
        id="grupo"
        className="relative grain overflow-hidden py-28 px-6 text-center"
        style={{ background: 'var(--tdgflow-surface)' }}
      >
        <div className="max-w-2xl mx-auto">
          <FadeUp>
            <p className="flex items-center justify-center gap-2 mb-5" style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: TDG.terracotta }}>
              <StarGlyph />{T['grupo.eyebrow']}
            </p>
          </FadeUp>

          <FadeUp delay={0.06}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.25, color: 'var(--tdgflow-text-primary)', maxWidth: 560, margin: '0 auto 1.25rem' }}>
              {T['grupo.h2']}
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.85, fontWeight: 300, marginBottom: '2rem' }}>
              {T['grupo.p1']}
            </p>
          </FadeUp>

          <FadeUp delay={0.16} className="flex items-center justify-center">
            <a href="https://www.instagram.com/traveldesignersgroup" target="_blank" rel="noreferrer" className="btn-ghost no-underline" style={{ padding: '12px 24px' }}>
              {T['grupo.instagram']}
            </a>
          </FadeUp>
        </div>
      </section>

      {/* ── TDG Flow — seção secundária, curta ──────────────────── */}
      <section
        id="flow"
        className="py-16 px-6 relative overflow-hidden"
        style={{ background: TDG.navy }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: STAR_PATTERN_URL, backgroundSize: '72px 72px', opacity: 0.04 }}
        />
        <div className="max-w-4xl mx-auto relative z-10">
          <FadeUp className="flex items-center justify-center gap-2 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tdg-mark-white.png" alt="TDG" style={{ height: 20, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '1.375rem', color: 'var(--tdgflow-gold)', lineHeight: 1 }}>
              Flow
            </span>
          </FadeUp>

          <FadeUp delay={0.05} className="text-center">
            <p style={{ fontSize: '0.875rem', color: '#A8C2CB', lineHeight: 1.85, fontWeight: 300, maxWidth: '640px', margin: '0 auto 2.75rem' }}>
              {T['flow.p1']}
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {flowPillars.map(({ icon: Icon, title, desc }, i) => (
              <FadeUp key={title} delay={0.12 + i * 0.06}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'rgba(0,140,148,0.16)', border: `1px solid rgba(0,140,148,0.35)` }}
                >
                  <Icon size={14} style={{ color: TDG.teal }} />
                </div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 5 }}>{title}</p>
                <p style={{ fontSize: '0.75rem', color: '#A8C2CB', lineHeight: 1.65, fontWeight: 300 }}>{desc}</p>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.35}>
            <div style={{ borderTop: '1px solid rgba(234,241,245,0.14)', paddingTop: '2rem', maxWidth: '700px', margin: '0 auto 2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: '#A8C2CB', lineHeight: 1.8, fontWeight: 300 }}>
                {T['flow.p2']}
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.4} className="text-center">
            <Link
              href="/flow"
              className="no-underline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                background: 'transparent', color: '#EAF1F5', fontWeight: 500, fontSize: '0.8125rem',
                borderRadius: 'var(--tdgflow-radius-md)', border: '1px solid rgba(234,241,245,0.25)',
              }}
            >
              {T['flow.cta']} <ArrowRight size={13} style={{ color: TDG.teal }} />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ background: TDG.navy, borderTop: '1px solid rgba(234,241,245,0.1)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold" style={{ background: '#fff', color: TDG.navy, fontSize: '0.625rem' }}>TDG</div>
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#EAF1F5' }}>Travel Designers Group</span>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: T['footer.grupo'], href: '#grupo' },
              { label: T['footer.flow'], href: '#flow' },
              { label: 'contact@traveldesignersgroup.com.br', href: 'mailto:contact@traveldesignersgroup.com.br' },
              { label: T['footer.instagram'], href: 'https://www.instagram.com/traveldesignersgroup' },
            ].map(({ label, href }) => (
              <a key={href} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                className="no-underline transition-colors duration-150" style={{ fontSize: '0.8125rem', color: '#A8C2CB', fontWeight: 300 }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = '#EAF1F5')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = '#A8C2CB')}
              >{label}</a>
            ))}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#7A9AA5' }}>
            © {new Date().getFullYear()} Travel Designers Group
          </p>
        </div>

        {/* Powered by Bemgsy — variante "rica" (skill bemgsy-design,
            corrigido 03/08/2026): a Carla viu o resultado ao vivo do
            wordmark grande (24px/opacity 0.75) e pediu mais sutileza —
            "não quero brigar por protagonismo com TDG". Mantém a estrutura
            completa (onda + tagline), mas o wordmark cai pro piso da
            variante rica (15-16px, opacity 0.55-0.65) — "placement único"
            não é licença pra dominância visual. */}
        <div className="max-w-6xl mx-auto flex flex-col items-center" style={{ marginTop: 28, paddingTop: 24 }}>
          <svg className="flow-wave-once" width="96" height="10" viewBox="0 0 96 10" style={{ display: 'block', marginBottom: 10 }}>
            <path d="M 3 5 C 26 -2, 38 12, 62 5 C 72 1, 82 1, 93 5"
              fill="none" stroke="rgba(234,241,245,0.28)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <div className="flex items-center justify-center flex-wrap" style={{ gap: 8 }} title="Bemgsy — Amplifying Human Hospitality">
            <span style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A9AA5' }}>
              Powered by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/bemgsy-mark.png"
              alt="Bemgsy"
              style={{ height: 16, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.6 }}
            />
            <span style={{ fontSize: '0.6875rem', fontWeight: 300, fontStyle: 'italic', color: '#7A9AA5', letterSpacing: '0.02em' }}>
              · Amplifying Human Hospitality
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
