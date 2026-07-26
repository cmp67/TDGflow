'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Star, Users, Globe, ChevronDown, TrendingUp, Sparkles } from 'lucide-react'
import { motion, useInView } from 'framer-motion'

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

const PROPERTIES = [
  { name: 'Velaa Private Island',      location: 'Maldivas',          tag: 'Private Island', bg: 'linear-gradient(135deg,#0d2535 0%,#061820 100%)', dot: '#4a9bbe' },
  { name: 'Martinhal Sagres',          location: 'Algarve, Portugal',  tag: 'Beach Resort',   bg: 'linear-gradient(135deg,#1a2510 0%,#0e1808 100%)', dot: '#7aaa5a' },
  { name: 'Martinhal Quinta do Lago',  location: 'Algarve, Portugal',  tag: 'Golf & Nature',  bg: 'linear-gradient(135deg,#251a08 0%,#180e04 100%)', dot: '#c8a060' },
  { name: 'Martinhal Lisboa',          location: 'Lisboa, Portugal',   tag: 'Urban Luxury',   bg: 'linear-gradient(135deg,#10101e 0%,#080810 100%)', dot: '#8080c8' },
]

const PILLARS = [
  {
    icon: TrendingUp,
    title: 'Curadoria com propósito',
    desc: 'Cada parceria é escolhida com critério. Quem está com o TDG está em conversas que importam — com os clientes que buscam o que poucos sabem oferecer.',
  },
  {
    icon: Star,
    title: 'Uma marca que se multiplica',
    desc: 'O que aprendemos sobre cada propriedade não fica em uma agência. Circula por toda a rede — com a mesma precisão e o mesmo entusiasmo de quem esteve lá.',
  },
  {
    icon: Globe,
    title: 'Presença que dura',
    desc: 'Não somos um canal. Somos uma relação de longo prazo, construída em confiança, renovada em cada experiência entregue com excelência.',
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
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${navOpaque ? 'nav-opaque' : ''}`}
        style={{ borderBottom: '1px solid transparent' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold"
              style={{ background: 'var(--gold)', color: 'var(--surface)', fontSize: '0.625rem', letterSpacing: '0.05em' }}
            >
              TDG
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Travel Designers Group
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {['#rede', '#parceiros', '#grupo'].map((href, i) => (
              <a
                key={href}
                href={href}
                className="no-underline transition-colors duration-150"
                style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '0.01em' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
              >
                {['A Rede', 'Parceiros', 'O Grupo'][i]}
              </a>
            ))}
          </nav>

          <Link
            href="/flow"
            className="no-underline flex items-center gap-1.5 transition-colors duration-150"
            style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--gold)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--gold-hover)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
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
              radial-gradient(ellipse 80% 55% at 50% 45%, rgba(212,165,116,0.06) 0%, transparent 65%),
              linear-gradient(180deg, #0F0E0D 0%, #131210 50%, #0F0E0D 100%)
            `,
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(212,165,116,0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 0%, transparent 100%)',
          }}
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="section-label mb-8"
          >
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
              color: 'var(--text-primary)',
              marginBottom: '1.75rem',
            }}
          >
            Dezenove agências.
            <br />
            <span style={{ color: 'var(--gold)', fontWeight: 300 }}>Uma visão do luxo.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.8, fontWeight: 300, maxWidth: '440px', margin: '0 auto 2.5rem' }}
          >
            Um grupo de especialistas que compartilham clientes, conhecimento e o mesmo padrão exigente de excelência.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            <a href="#grupo" className="btn-gold no-underline" style={{ padding: '11px 26px' }}>
              Sobre o grupo <ArrowRight size={15} />
            </a>
            <a href="#parceiros" className="btn-ghost no-underline" style={{ padding: '11px 22px' }}>
              Nossas propriedades
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
            <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section
        id="rede"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '19',       label: 'Agências' },
            { value: '80+',      label: 'Destinos' },
            { value: '200+',     label: 'Propriedades parceiras' },
            { value: '25 anos',  label: 'No setor de luxo' },
          ].map(({ value, label }, i) => (
            <FadeUp key={label} delay={i * 0.07}>
              <p style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 200, color: 'var(--gold)', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.375rem' }}>
                {value}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
                {label}
              </p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Programs strip ───────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '18px 24px' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-10 text-center">
          <p style={{ fontSize: '0.625rem', fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Reconhecidos por
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {PROGRAMS.map((name, i) => (
              <span
                key={name}
                style={{ fontSize: '0.75rem', fontWeight: 300, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}
              >
                {name}{i < PROGRAMS.length - 1 && <span style={{ margin: '0 0 0 32px', color: 'var(--border-light)' }} />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Properties ───────────────────────────────────────────── */}
      <section id="parceiros" className="py-24 px-6 relative grain overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-2">
            <p className="section-label">Onde já estivemos</p>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 200, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '2.5rem', lineHeight: 1.15 }}>
              Lugares que conhecemos<br />por dentro
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3" style={{ gridAutoRows: '180px' }}>
            {/* Feature card */}
            <FadeUp delay={0.05} className="md:col-span-7 md:row-span-2">
              <div
                className="prop-card h-full flex flex-col justify-end p-6 relative group"
                style={{ background: PROPERTIES[0].bg }}
              >
                <div className="absolute top-5 right-5 w-14 h-14 rounded-full opacity-15" style={{ background: `radial-gradient(circle, ${PROPERTIES[0].dot}, transparent)` }} />
                <div className="prop-card-overlay" />
                <div className="relative z-10">
                  <span className="badge badge-gold mb-2" style={{ fontSize: '0.6rem' }}>{PROPERTIES[0].tag}</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '0.25rem' }}>
                    {PROPERTIES[0].name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <MapPin size={11} style={{ color: 'var(--gold-dim)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{PROPERTIES[0].location}</span>
                  </div>
                </div>
              </div>
            </FadeUp>

            {PROPERTIES.slice(1).map((p, i) => (
              <FadeUp key={p.name} delay={0.1 + i * 0.07} className="md:col-span-5">
                <div
                  className="prop-card h-full flex flex-col justify-end p-5 relative group"
                  style={{ background: p.bg }}
                >
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full opacity-15" style={{ background: `radial-gradient(circle, ${p.dot}, transparent)` }} />
                  <div className="prop-card-overlay" />
                  <div className="relative z-10">
                    <span className="badge badge-muted mb-1.5" style={{ fontSize: '0.58rem' }}>{p.tag}</span>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} style={{ color: 'var(--gold-dim)' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.location}</span>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.15} className="mt-8">
            <Link href="/flow" className="btn-ghost no-underline" style={{ fontSize: '0.8125rem' }}>
              Todos os nossos parceiros <ArrowRight size={13} />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ── Pillars ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-6"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
          {PILLARS.map(({ icon: Icon, title, desc }, i) => (
            <FadeUp key={title} delay={i * 0.09}>
              <div className="space-y-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-ring)' }}
                >
                  <Icon size={16} style={{ color: 'var(--gold)' }} />
                </div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section
        id="grupo"
        className="relative grain overflow-hidden py-24 px-6 text-center"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-xl mx-auto">
          <FadeUp>
            <p className="section-label mb-5">O grupo</p>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Algumas parcerias chegam<br />a uma agência. Esta<br />chega a dezenove.
            </h2>
          </FadeUp>
          <FadeUp delay={0.12}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.85, fontWeight: 300, marginBottom: '2rem' }}>
              O TDG não é uma rede de distribuição. É uma comunidade de especialistas que viajam juntos, aprendem juntos e constroem relações duradouras com as marcas em que acreditam.
            </p>
          </FadeUp>
          <FadeUp delay={0.16} className="flex items-center justify-center gap-3 flex-wrap">
            <a href="mailto:contato@tdgbrasil.com.br" className="btn-gold no-underline" style={{ padding: '12px 28px' }}>
              Falar com o grupo
            </a>
            <a href="https://www.instagram.com/traveldesignersgroup" target="_blank" rel="noreferrer" className="btn-ghost no-underline" style={{ padding: '12px 24px' }}>
              Instagram
            </a>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ background: '#0A0909', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold" style={{ background: 'var(--gold)', color: 'var(--surface)', fontSize: '0.625rem' }}>TDG</div>
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Travel Designers Group</span>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: 'A Rede', href: '#rede' },
              { label: 'Parceiros', href: '#parceiros' },
              { label: 'O Grupo', href: '#grupo' },
              { label: 'Instagram', href: 'https://www.instagram.com/traveldesignersgroup' },
            ].map(({ label, href }) => (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                className="no-underline" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 300 }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-secondary)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
              >{label}</a>
            ))}
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Travel Designers Group
          </p>
        </div>
      </footer>
    </div>
  )
}
