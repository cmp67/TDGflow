'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, Zap, Megaphone, Radar, ChevronDown } from 'lucide-react'
import { motion, useInView } from 'framer-motion'

/* ── Marca TDG (manual de identidade visual, recebido 02/08/2026) ────────
   Paleta própria do Travel Designers Group — distinta da paleta estrutural
   Bemgsy (--tdgflow-navy #1A2B4C / --tdgflow-gold #D4AF37) usada no produto
   TDG Flow em si. Esta página representa a marca TDG, não o produto — por
   isso usa as cores oficiais do manual, escopadas aqui e não nos tokens
   globais (que continuam servindo o "esqueleto" do app interno). */
const TDG = {
  navy:       '#112630',
  tealDark:   '#104C64',
  teal:       '#008C94',
  sage:       '#93A889',
  terracotta: '#B6410F',
}

/* Estrela de 4 pontas — asset de marca próprio (página "Pattern" do manual),
   reaproveitado como textura de fundo no hero e como glifo ao lado dos
   rótulos de seção, no lugar do dot-grid genérico anterior. */
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

/* ── Data ──────────────────────────────────────────────────────────── */
const PROGRAMS = [
  'Embark Beyond',
  'Traveller Made',
  'Club Med',
  'Teresa Perez Group',
]

/* Pilares do TDG Flow — texto oficial recebido da Carla 02/08/2026
   ("SITE TDG FLOW.docx"), verbatim. */
const FLOW_PILLARS = [
  {
    icon: Users,
    title: 'Curadoria Compartilhada',
    desc: 'Avaliações de hotéis, vilas, serviços receptivos e gastronomia sob o rigoroso crivo do padrão TDG, gerando um feedback construtivo para o segmento.',
  },
  {
    icon: Zap,
    title: 'Agilidade Operacional',
    desc: 'Respostas rápidas a cenários complexos de viagens globais com base no histórico e conexões do grupo.',
  },
  {
    icon: Megaphone,
    title: 'Promoção Eficiente',
    desc: 'Novidades, renovações, ofertas e experiências inéditas dos fornecedores ganham tração na rede das agências.',
  },
  {
    icon: Radar,
    title: 'Tendências Antecipadas',
    desc: 'Monitoramento em tempo real dos destinos e experiências que estão entrando no radar dos viajantes mais exigentes.',
  },
]

/* ── Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [navOpaque, setNavOpaque] = useState(false)

  useEffect(() => {
    const onScroll = () => setNavOpaque(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: 'var(--tdgflow-bg)', color: 'var(--tdgflow-text-primary)', fontFamily: 'var(--tdgflow-font-sans)' }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${navOpaque ? 'nav-opaque' : ''}`}
        style={{ borderBottom: '1px solid transparent' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold"
              style={{ background: TDG.navy, color: '#fff', fontSize: '0.625rem', letterSpacing: '0.05em' }}
            >
              TDG
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.01em' }}>
              Travel Designers Group
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {['#flow', '#grupo'].map((href, i) => (
              <a
                key={href}
                href={href}
                className="no-underline transition-colors duration-150"
                style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--tdgflow-text-muted)', letterSpacing: '0.01em' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--tdgflow-text-primary)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--tdgflow-text-muted)')}
              >
                {['TDG Flow', 'O Grupo'][i]}
              </a>
            ))}
          </nav>

          <Link
            href="/flow"
            className="no-underline flex items-center gap-1.5 transition-colors duration-150"
            style={{ fontSize: '0.8125rem', fontWeight: 500, color: TDG.teal }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = TDG.tealDark)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = TDG.teal)}
          >
            Acessar o Flow
            <ArrowRight size={13} />
          </Link>
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
        {/* Textura de fundo — estrela de 4 pontas da identidade TDG, no lugar
            do dot-grid genérico anterior */}
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
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center justify-center gap-2 mb-8"
            style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EAF1F5' }}
          >
            <StarGlyph />
            Travel Designers Group · Brasil
          </motion.p>

          {/* Headline */}
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
            Dezenove agências.
            <br />
            <span style={{ color: TDG.terracotta, fontWeight: 300 }}>Uma visão do luxo.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ fontSize: '1rem', color: '#A8C2CB', lineHeight: 1.8, fontWeight: 300, maxWidth: '460px', margin: '0 auto 2.5rem' }}
          >
            Uma rede colaborativa das principais agências boutique e consultores de turismo de alto padrão do Brasil.
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
              Sobre o grupo <ArrowRight size={15} />
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
              Conhecer o TDG Flow
            </a>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={18} style={{ color: '#A8C2CB' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Programs strip ───────────────────────────────────────── */}
      <section style={{ background: 'var(--tdgflow-bg)', borderTop: '1px solid var(--tdgflow-border)', borderBottom: '1px solid var(--tdgflow-border)', padding: '18px 24px' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-10 text-center">
          <p style={{ fontSize: '0.625rem', fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', whiteSpace: 'nowrap' }}>
            Reconhecidos por
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {PROGRAMS.map((name, i) => (
              <span
                key={name}
                style={{ fontSize: '0.75rem', fontWeight: 300, color: 'var(--tdgflow-text-secondary)', letterSpacing: '0.02em' }}
              >
                {name}{i < PROGRAMS.length - 1 && <span style={{ margin: '0 0 0 32px', color: 'var(--tdgflow-border-light)' }} />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TDG Flow ─────────────────────────────────────────────── */}
      <section
        id="flow"
        className="py-24 px-6 relative overflow-hidden"
        style={{ background: TDG.navy }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: STAR_PATTERN_URL, backgroundSize: '72px 72px', opacity: 0.04 }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <FadeUp className="mb-4">
            <p className="flex items-center justify-center gap-2" style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: TDG.terracotta, textAlign: 'center' }}>
              <StarGlyph />O ecossistema
            </p>
          </FadeUp>
          <FadeUp delay={0.06} className="text-center">
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 200, letterSpacing: '-0.03em', color: '#fff', marginBottom: '1.5rem', lineHeight: 1.15 }}>
              TDG Flow
            </h2>
          </FadeUp>
          <FadeUp delay={0.1} className="text-center">
            <p style={{ fontSize: '0.9375rem', color: '#A8C2CB', lineHeight: 1.85, fontWeight: 300, maxWidth: '700px', margin: '0 auto 3.5rem' }}>
              Estruturado em contrato com a Bemgsy — com know-how em operação de luxury travel — o TDG Flow funciona como um ecossistema digital colaborativo fechado, no qual o banco de dados alimentado diariamente pelo grupo de experts é conectado a agentes de inteligência artificial especialmente treinados para otimizar conhecimento, cruzar informações e buscar recomendações lastreadas nessa genuína curadoria de experiências exclusivas globais.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-14">
            {FLOW_PILLARS.map(({ icon: Icon, title, desc }, i) => (
              <FadeUp key={title} delay={0.14 + i * 0.07}>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'rgba(0,140,148,0.16)', border: `1px solid rgba(0,140,148,0.35)` }}
                >
                  <Icon size={16} style={{ color: TDG.teal }} />
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: '0.8125rem', color: '#A8C2CB', lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.4}>
            <div style={{ borderTop: '1px solid rgba(234,241,245,0.14)', paddingTop: '2.5rem', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: '#EAF1F5', lineHeight: 1.85, fontWeight: 300 }}>
                Diferente de sistemas de busca ou agentes de IA que pesquisam na rede mundial informações majoritariamente produzidas por robôs — muitas falsas e quase todas com interesse comercial — o TDG Flow trabalha em ambiente exclusivo e curado, priorizando a qualidade do dado humano e o &ldquo;olhar do designer&rdquo; que caracteriza o grupo. A plataforma apresenta uma vitrine qualificada e hipersegmentada, otimizando o relacionamento comercial ao garantir que as qualidades técnicas e os diferenciais de cada serviço sejam mapeados e compreendidos instantaneamente por todo o comitê de agências.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section
        id="grupo"
        className="relative grain overflow-hidden py-24 px-6 text-center"
        style={{ background: 'var(--tdgflow-surface)', borderTop: '1px solid var(--tdgflow-border)' }}
      >
        <div className="max-w-xl mx-auto">
          <FadeUp>
            <p className="flex items-center justify-center gap-2 mb-5" style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: TDG.terracotta }}>
              <StarGlyph />O grupo
            </p>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.2, color: 'var(--tdgflow-text-primary)', marginBottom: '1.25rem' }}>
              Algumas parcerias chegam<br />a uma agência. Esta<br />chega a dezenove.
            </h2>
          </FadeUp>
          <FadeUp delay={0.12}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.85, fontWeight: 300, marginBottom: '2rem' }}>
              Somos uma rede colaborativa das principais agências boutique e consultores de turismo de alto padrão do Brasil. Compartilhamos conhecimentos estratégicos, percepções colhidas em viagens de inspeção pelo mundo e experiências vivenciadas por nossos clientes, com o objetivo de proporcionar a cada viajante experiências de viagem ainda mais exclusivas e inesquecíveis.
            </p>
          </FadeUp>
          <FadeUp delay={0.16} className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="mailto:contact@traveldesignersgroup.com.br"
              className="no-underline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px',
                background: TDG.terracotta, color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                borderRadius: 'var(--tdgflow-radius-md)',
              }}
            >
              Falar com o grupo
            </a>
            <a href="https://www.instagram.com/traveldesignersgroup" target="_blank" rel="noreferrer" className="btn-ghost no-underline" style={{ padding: '12px 24px' }}>
              Instagram
            </a>
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
              { label: 'TDG Flow', href: '#flow' },
              { label: 'O Grupo', href: '#grupo' },
              { label: 'contact@traveldesignersgroup.com.br', href: 'mailto:contact@traveldesignersgroup.com.br' },
              { label: 'Instagram', href: 'https://www.instagram.com/traveldesignersgroup' },
            ].map(({ label, href }) => (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
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

        {/* Powered by Bemgsy — assinatura discreta (pedido da Carla, 03/08),
            mesmo padrão/tooltip já usado no rodapé da sidebar interna
            (FlowShell.tsx): "Powered by" nunca só no hover, mark invertida
            pra branco porque o arquivo original é navy sólido (pensado pra
            fundo claro), aqui o rodapé é escuro. */}
        <div
          className="max-w-6xl mx-auto flex items-center justify-center"
          style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(234,241,245,0.08)', gap: 6 }}
          title="Bemgsy — Amplifying Human Hospitality"
        >
          <span style={{ fontSize: '0.5rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5E8590' }}>
            Powered by
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/bemgsy-mark.png"
            alt="Bemgsy"
            style={{ height: 13, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }}
          />
        </div>
      </footer>
    </div>
  )
}
