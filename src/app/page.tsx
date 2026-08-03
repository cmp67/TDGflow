'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, Zap, Megaphone, Radar } from 'lucide-react'
import { motion, useInView } from 'framer-motion'

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
   hero para não deixar um respiro claro isolado entre duas seções escuras. */
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

/* Número que conta de 0 até o valor real uma única vez, ao entrar em vista
   — o "19" carrega a credibilidade de escala do grupo, então vale reforçar
   o momento em que o visitante o lê, sem virar ambiente/loop (pedido da
   Carla, 03/08: animação sutil que sofistique sem pesar — mesma regra já
   documentada em globals.css para o lockup "TDG · Flow": feedback, nunca
   decoração contínua). */
function NumberReveal({ value, style }: { value: number; style?: React.CSSProperties }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const duration = 900
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])

  return <span ref={ref} style={style}>{display}</span>
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
              style={{ background: TDG.navy, color: '#fff', fontSize: '0.625rem', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              TDG
            </div>
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
                {['O Grupo', 'TDG Flow'][i]}
              </a>
            ))}
          </nav>

          <Link
            href="/flow"
            className="no-underline flex items-center gap-1.5 transition-colors duration-150"
            style={{ fontSize: '0.8125rem', fontWeight: 500, color: navOpaque ? TDG.tealDark : '#EAF1F5' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = navOpaque ? TDG.navy : '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = navOpaque ? TDG.tealDark : '#EAF1F5')}
          >
            Acessar o Flow
            <ArrowRight size={13} style={{ color: TDG.teal }} />
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
            <span style={{ fontWeight: 300 }}>Uma visão do luxo.</span>
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
              Torne-se parceiro do grupo <ArrowRight size={15} />
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
              Como funciona o Flow
            </a>
          </motion.div>
        </div>

        {/* "Reconhecidos por" incorporado ao hero — antes era uma faixa clara
            isolada entre duas seções escuras, um respiro sem função (achado
            da revisão de design, 03/08). Agora fecha o próprio hero. */}
        <motion.div
          className="absolute bottom-0 inset-x-0 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          style={{ borderTop: '1px solid rgba(234,241,245,0.12)', padding: '16px 24px' }}
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-10 text-center">
            <p style={{ fontSize: '0.625rem', fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A9AA5', whiteSpace: 'nowrap' }}>
              Reconhecidos por
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {PROGRAMS.map(name => (
                <span key={name} style={{ fontSize: '0.75rem', fontWeight: 300, color: '#A8C2CB', letterSpacing: '0.02em' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
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
              <StarGlyph />O grupo
            </p>
          </FadeUp>

          <FadeUp delay={0.06}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.25, color: 'var(--tdgflow-text-primary)', maxWidth: 560, margin: '0 auto 1.25rem' }}>
              Algumas parcerias chegam a uma agência. Esta chega a dezenove.
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.85, fontWeight: 300, marginBottom: '2.5rem' }}>
              Somos uma rede colaborativa das principais agências boutique e consultores de turismo de alto padrão do Brasil. Compartilhamos conhecimentos estratégicos, percepções colhidas em viagens de inspeção pelo mundo e experiências vivenciadas por nossos clientes, com o objetivo de proporcionar a cada viajante experiências de viagem ainda mais exclusivas e inesquecíveis.
            </p>
          </FadeUp>

          <FadeUp delay={0.16} className="mb-10">
            <div style={{ fontSize: 'clamp(2.75rem, 6vw, 3.75rem)', fontWeight: 200, letterSpacing: '-0.03em', color: TDG.navy, lineHeight: 1 }}>
              <NumberReveal value={19} />
            </div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginTop: 6 }}>
              Agências no grupo
            </p>
          </FadeUp>

          <FadeUp delay={0.22}>
            <div style={{ borderTop: '1px solid var(--tdgflow-border)', paddingTop: '2.25rem', marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.9375rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.85, fontWeight: 400 }}>
                Buscamos fornecedores e experiências que mereçam recomendação exclusiva às nossas dezenove agências — e, em troca, o acesso direto a um comitê de consultores de alto padrão que decide, todos os dias, o que vale a pena oferecer aos viajantes mais exigentes do Brasil.
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.28} className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="mailto:contact@traveldesignersgroup.com.br"
              className="no-underline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px',
                background: TDG.terracotta, color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                borderRadius: 'var(--tdgflow-radius-md)',
              }}
            >
              Falar com o grupo <ArrowRight size={15} />
            </a>
            <a href="https://www.instagram.com/traveldesignersgroup" target="_blank" rel="noreferrer" className="btn-ghost no-underline" style={{ padding: '12px 24px' }}>
              Instagram
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
            <p className="flex items-center justify-center gap-2" style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EAF1F5' }}>
              <StarGlyph />Como o grupo opera
            </p>
          </FadeUp>
          <FadeUp delay={0.09} className="text-center">
            <p style={{ fontSize: '0.875rem', color: '#A8C2CB', lineHeight: 1.85, fontWeight: 300, maxWidth: '640px', margin: '0.75rem auto 2.75rem' }}>
              Estruturado em contrato com a Bemgsy — com know-how em operação de luxury travel — o TDG Flow funciona como um ecossistema digital colaborativo fechado, no qual o banco de dados alimentado diariamente pelo grupo de experts é conectado a agentes de inteligência artificial especialmente treinados para otimizar conhecimento, cruzar informações e buscar recomendações lastreadas nessa genuína curadoria de experiências exclusivas globais.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {FLOW_PILLARS.map(({ icon: Icon, title, desc }, i) => (
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
                Diferente de sistemas de busca ou agentes de IA que pesquisam na rede mundial informações majoritariamente produzidas por robôs — muitas falsas e quase todas com interesse comercial — o TDG Flow trabalha em ambiente exclusivo e curado, priorizando a qualidade do dado humano e o &ldquo;olhar do designer&rdquo; que caracteriza o grupo. A plataforma apresenta uma vitrine qualificada e hipersegmentada, otimizando o relacionamento comercial ao garantir que as qualidades técnicas e os diferenciais de cada serviço sejam mapeados e compreendidos instantaneamente por todo o comitê de agências.
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
              Acessar o Flow <ArrowRight size={13} style={{ color: TDG.teal }} />
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
              { label: 'O Grupo', href: '#grupo' },
              { label: 'TDG Flow', href: '#flow' },
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

        {/* Powered by Bemgsy — padrão oficial documentado na skill bemgsy-design
            (03/08/2026): "Powered by" sempre texto visível (nunca só no hover),
            title com a tagline, mark entre opacity 0.65-0.75 (abaixo disso
            reprova o piso de legibilidade já achado no FlowShell.tsx — aqui
            estava em 0.55, corrigido). Mark invertida pra branco via filter
            porque o arquivo original é navy sólido (pensado pra fundo claro),
            aqui o rodapé é escuro. */}
        <div
          className="max-w-6xl mx-auto flex items-center justify-center"
          style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(234,241,245,0.08)', gap: 6 }}
          title="Bemgsy — Amplifying Human Hospitality"
        >
          <span style={{ fontSize: '0.5rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7A9AA5' }}>
            Powered by
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/bemgsy-mark.png"
            alt="Bemgsy"
            style={{ height: 15, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.7 }}
          />
        </div>
      </footer>
    </div>
  )
}
