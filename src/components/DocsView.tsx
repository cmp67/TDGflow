'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, Loader2, ShieldCheck, ShieldAlert, ShieldX, Syringe, AlertTriangle, X, ChevronRight, ExternalLink } from 'lucide-react'
import InsufficientBalanceModal from './InsufficientBalanceModal'

/* ── Ícones próprios — traço só (regra de personalidade Bemgsy) pros
   marcadores de identidade das abas (Vistos/Materiais). Selos semânticos
   de segurança/saúde (shields e seringa) e utilitários (busca, fechar,
   seta) continuam lucide — são estado funcional, não decoração. ──── */
function IconGlobe({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.4 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.4-3.8-8.5S9.5 5.8 12 3.5z" />
    </svg>
  )
}
function IconDoc({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M14 3.5V8h4M9 13h6M9 16.5h6" />
    </svg>
  )
}
import type { TravelRequirements } from '@/lib/travel-docs'

// ── Quick-access chips (top TDG destinations) ─────────────────────────────────

const QUICK_DESTINATIONS = [
  { label: 'Maldivas',      flag: '🇲🇻' },
  { label: 'Portugal',      flag: '🇵🇹' },
  { label: 'Dubai',         flag: '🇦🇪' },
  { label: 'Japão',         flag: '🇯🇵' },
  { label: 'África do Sul', flag: '🇿🇦' },
  { label: 'Itália',        flag: '🇮🇹' },
  { label: 'Grécia',        flag: '🇬🇷' },
  { label: 'Tailândia',     flag: '🇹🇭' },
  { label: 'Marrocos',      flag: '🇲🇦' },
  { label: 'EUA',           flag: '🇺🇸' },
  { label: 'Reino Unido',   flag: '🇬🇧' },
  { label: 'Austrália',     flag: '🇦🇺' },
]

// ── Static curated data for tabs ──────────────────────────────────────────────

const VISA_TABLE = [
  { destination: 'Schengen (26 países)', status: 'visa-free',      detail: '90 dias / 180 · sem visto' },
  { destination: 'Portugal',             status: 'visa-free',      detail: '90 dias · Schengen' },
  { destination: 'Itália',               status: 'visa-free',      detail: '90 dias · Schengen' },
  { destination: 'Espanha',              status: 'visa-free',      detail: '90 dias · Schengen' },
  { destination: 'França',               status: 'visa-free',      detail: '90 dias · Schengen' },
  { destination: 'Grécia',               status: 'visa-free',      detail: '90 dias · Schengen' },
  { destination: 'Croácia',              status: 'visa-free',      detail: '90 dias · Schengen' },
  { destination: 'Maldivas',             status: 'visa-on-arrival', detail: '30 dias · IMUGA obrigatório' },
  { destination: 'Tailândia',            status: 'visa-on-arrival', detail: '60 dias · na chegada' },
  { destination: 'Japão',                status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'China',                status: 'visa-free',      detail: '30 dias · até dez/2026' },
  { destination: 'Marrocos',             status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'África do Sul',        status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'Quênia',               status: 'e-visa',         detail: 'e-Visa obrigatório' },
  { destination: 'Tanzânia',             status: 'e-visa',         detail: 'e-Visa obrigatório' },
  { destination: 'Ruanda',               status: 'visa-on-arrival', detail: 'Visto na chegada' },
  { destination: 'Dubai (EAU)',          status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'Jordânia',             status: 'visa-on-arrival', detail: 'Visto na chegada' },
  { destination: 'Egito',                status: 'visa-on-arrival', detail: 'Visto na chegada' },
  { destination: 'Indonésia / Bali',     status: 'visa-on-arrival', detail: '30 dias · na chegada' },
  { destination: 'Seicheles',            status: 'visa-free',      detail: 'Sem visto · registro na chegada' },
  { destination: 'Maurício',             status: 'visa-free',      detail: '60 dias · sem visto' },
  { destination: 'Costa Rica',           status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'Argentina',            status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'Chile',                status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'Colômbia',             status: 'visa-free',      detail: '90 dias · sem visto' },
  { destination: 'Cuba',                 status: 'visa-on-arrival', detail: 'Cartão turista na chegada' },
  { destination: 'EUA',                  status: 'visa-required',  detail: 'Visto americano (B1/B2)' },
  { destination: 'Canadá',               status: 'visa-required',  detail: 'Visto obrigatório' },
  { destination: 'Austrália',            status: 'eta',            detail: 'ETA · AUD 20 online' },
  { destination: 'Nova Zelândia',        status: 'eta',            detail: 'NZeTA · NZD 23 online' },
  { destination: 'Reino Unido',          status: 'eta',            detail: 'ETA · £10 online (desde fev/2026)' },
  { destination: 'Índia',                status: 'e-visa',         detail: 'e-Visa obrigatório' },
  { destination: 'Vietnã',               status: 'e-visa',         detail: 'e-Visa obrigatório' },
  { destination: 'Sri Lanka',            status: 'e-visa',         detail: 'ETA online · gratuito' },
]

const HEALTH_TABLE = [
  { destination: 'Maldivas',      iso: 'MV', civp: true,  notes: 'CIVP obrigatório para viajantes vindos do Brasil' },
  { destination: 'África do Sul', iso: 'ZA', civp: true,  notes: 'CIVP obrigatório + recomenda-se anti-malárica em áreas rurais' },
  { destination: 'Quênia',        iso: 'KE', civp: true,  notes: 'CIVP obrigatório + profilaxia anti-malárica' },
  { destination: 'Tanzânia',      iso: 'TZ', civp: true,  notes: 'CIVP obrigatório + anti-malárica (Kilimanjaro/Zanzibar)' },
  { destination: 'Ruanda',        iso: 'RW', civp: true,  notes: 'CIVP obrigatório + anti-malárica' },
  { destination: 'Etiópia',       iso: 'ET', civp: true,  notes: 'CIVP obrigatório + anti-malárica em áreas de risco' },
  { destination: 'Angola',        iso: 'AO', civp: true,  notes: 'CIVP obrigatório + anti-malárica' },
  { destination: 'Moçambique',    iso: 'MZ', civp: true,  notes: 'CIVP obrigatório + anti-malárica' },
  { destination: 'Maurício',      iso: 'MU', civp: true,  notes: 'CIVP obrigatório se vindo de área endêmica' },
  { destination: 'Seicheles',     iso: 'SC', civp: true,  notes: 'CIVP obrigatório se vindo de área endêmica' },
  { destination: 'Madagáscar',    iso: 'MG', civp: true,  notes: 'CIVP obrigatório + anti-malárica' },
  { destination: 'China',         iso: 'CN', civp: true,  notes: 'CIVP obrigatório para viajantes vindos do Brasil' },
  { destination: 'Equador',       iso: 'EC', civp: true,  notes: 'CIVP obrigatório para todos os viajantes (grupo A)' },
  { destination: 'Trinidad',      iso: 'TT', civp: true,  notes: 'CIVP obrigatório para todos os viajantes (grupo A)' },
  { destination: 'Tailândia',     iso: 'TH', civp: false, notes: 'CIVP não obrigatório · recomenda-se Hepatite A/B' },
  { destination: 'Indonésia',     iso: 'ID', civp: false, notes: 'CIVP não obrigatório · recomenda-se Hepatite A, Dengue' },
  { destination: 'Índia',         iso: 'IN', civp: false, notes: 'CIVP não obrigatório · recomenda-se anti-malárica em áreas de risco' },
  { destination: 'Vietnã',        iso: 'VN', civp: false, notes: 'CIVP não obrigatório · recomenda-se Hepatite A/B' },
  { destination: 'Japão',         iso: 'JP', civp: false, notes: 'Sem requisitos especiais de saúde' },
  { destination: 'Schengen',      iso: 'EU', civp: false, notes: 'Sem requisitos especiais de saúde' },
  { destination: 'Dubai',         iso: 'AE', civp: false, notes: 'Sem requisitos especiais de saúde' },
]

// Fonte: US State Dept Travel Advisories (travel.state.gov)
// Datas de referência: última verificação por país em Abril/2026
const SECURITY_TABLE = [
  { destination: 'Portugal',      level: 1, label: 'Normal',       updatedAt: '2025-10', source: 'US State Dept', detail: 'Destino seguro para turismo. Criminalidade baixa; atenção a furtos em Lisboa/Porto em alta temporada.' },
  { destination: 'Espanha',       level: 1, label: 'Normal',       updatedAt: '2025-10', source: 'US State Dept', detail: 'Destino seguro. Atenção a carteiristas em atrações turísticas (Barcelona, Madrid). Baixo risco geral.' },
  { destination: 'Itália',        level: 2, label: 'Atenção',      updatedAt: '2025-12', source: 'US State Dept', detail: 'Furtos e golpes a turistas são comuns em Roma, Nápoles e Veneza. Alertas pontuais de terrorismo em locais públicos movimentados.' },
  { destination: 'França',        level: 2, label: 'Atenção',      updatedAt: '2026-01', source: 'US State Dept', detail: 'Ameaça terrorista persistente — o governo francês mantém alerta máximo. Furtos frequentes em Paris (metro, Torre Eiffel). Protestos ocasionais.' },
  { destination: 'Grécia',        level: 1, label: 'Normal',       updatedAt: '2025-10', source: 'US State Dept', detail: 'Destino seguro. Greves e manifestações pontuais podem afetar transporte. Ilhas e áreas turísticas sem risco relevante.' },
  { destination: 'Croácia',       level: 1, label: 'Normal',       updatedAt: '2025-09', source: 'US State Dept', detail: 'Destino muito seguro. Região da Dalmácia tranquila; atenção mínima ao trânsito nas ilhas no verão europeu.' },
  { destination: 'Reino Unido',   level: 2, label: 'Atenção',      updatedAt: '2026-02', source: 'US State Dept', detail: 'Nível de ameaça terrorista elevado ("Substancial" pelo MI5). Ataques de faca e incidentes em espaços públicos nos últimos anos. Manifestações frequentes em Londres.' },
  { destination: 'Maldivas',      level: 1, label: 'Normal',       updatedAt: '2025-08', source: 'US State Dept', detail: 'Destino seguro para turismo de resort. Extremismo islâmico limitado à capital Malé — ilhas turísticas isoladas e sem risco.' },
  { destination: 'Dubai',         level: 1, label: 'Normal',       updatedAt: '2025-11', source: 'US State Dept', detail: 'Destino muito seguro. Leis locais rígidas exigem respeito a costumes (vestimenta, álcool fora de hotéis/restaurantes licenciados).' },
  { destination: 'Japão',         level: 1, label: 'Normal',       updatedAt: '2025-09', source: 'US State Dept', detail: 'Um dos destinos mais seguros do mundo. Criminalidade mínima. Atenção a terremotos e tufões sazonais (jul–out).' },
  { destination: 'China',         level: 2, label: 'Atenção',      updatedAt: '2026-01', source: 'US State Dept', detail: 'Leis locais restritivas: monitoramento digital, VPN proibida, restrições a jornalistas e pesquisadores. Tibete e Xinjiang com acesso limitado e presença militar.' },
  { destination: 'Tailândia',     level: 1, label: 'Normal',       updatedAt: '2025-10', source: 'US State Dept', detail: 'Principais destinos (Bangkok, Phuket, Chiang Mai) seguros. Fronteiras sul com Malásia têm conflito interno — evitar províncias de Pattani, Yala, Narathiwat.' },
  { destination: 'Indonésia',     level: 2, label: 'Atenção',      updatedAt: '2025-12', source: 'US State Dept', detail: 'Risco de terrorismo em grandes cidades (Jacarta). Bali é segura. Alertas de desastres naturais: vulcões ativos, terremotos e tsunamis em várias ilhas.' },
  { destination: 'África do Sul', level: 2, label: 'Atenção',      updatedAt: '2026-01', source: 'US State Dept', detail: 'Alta criminalidade em Joanesburgo e Cape Town — assaltos à mão armada e carjacking. Áreas turísticas (V&A Waterfront, Garden Route) mais seguras. Evitar Township sem guia.' },
  { destination: 'Quênia',        level: 2, label: 'Atenção',      updatedAt: '2026-02', source: 'US State Dept', detail: 'Risco de terrorismo (Al-Shabaab). Fronteiras norte e nordeste restritas. Nairobi: atenção em áreas periféricas. Safaris e costa com baixo risco.' },
  { destination: 'Tanzânia',      level: 1, label: 'Normal',       updatedAt: '2025-09', source: 'US State Dept', detail: 'Destino seguro. Zanzibar e Serengeti sem risco significativo. Pequenos furtos em Dar es Salaam; atenção na região de Mtwara (fronteira Moçambique).' },
  { destination: 'Ruanda',        level: 1, label: 'Normal',       updatedAt: '2025-08', source: 'US State Dept', detail: 'Um dos países mais seguros da África. Kigali muito seguro. Atenção na fronteira com DRC — turismo no Parque Virunga ok com guia licenciado.' },
  { destination: 'Marrocos',      level: 2, label: 'Atenção',      updatedAt: '2025-11', source: 'US State Dept', detail: 'Ameaça de terrorismo presente (grupos afiliados ao IS). Furtos e assédio a turistas em medinas (Marraquexe, Fès). Destinos turísticos têm boa presença policial.' },
  { destination: 'Egito',         level: 2, label: 'Atenção',      updatedAt: '2026-01', source: 'US State Dept', detail: 'Terrorismo concentrado no Sinai — evitar toda a região. Cairo, Luxor, Assuã e Sharm el-Sheikh têm proteção reforçada e são considerados seguros para turistas.' },
  { destination: 'EUA',           level: 1, label: 'Normal',       updatedAt: '2025-10', source: 'US State Dept', detail: 'Destino seguro em geral. Atenção a violência armada pontual e furtos em grandes cidades. Consultar condições locais por cidade.' },
  { destination: 'Canadá',        level: 1, label: 'Normal',       updatedAt: '2025-09', source: 'US State Dept', detail: 'Destino muito seguro. Clima extremo no inverno requer preparação. Baixo risco de criminalidade para turistas.' },
  { destination: 'Austrália',     level: 1, label: 'Normal',       updatedAt: '2025-09', source: 'US State Dept', detail: 'Destino muito seguro. Atenção a fauna selvagem em áreas remotas e condições climáticas extremas (ciclones no norte, incêndios no verão austral).' },
  { destination: 'Argentina',     level: 1, label: 'Normal',       updatedAt: '2025-11', source: 'US State Dept', detail: 'Buenos Aires segura para turistas, com atenção a furtos no centro e La Boca. Instabilidade econômica pode afetar câmbio. Interior e Patagônia sem risco.' },
  { destination: 'Colômbia',      level: 2, label: 'Atenção',      updatedAt: '2026-02', source: 'US State Dept', detail: 'Cartagena, Bogotá e Medellín seguras com precauções normais. Evitar fronteiras com Venezuela, regiões do Caquetá, Chocó e zonas cocaleiras — grupos armados ativos.' },
  { destination: 'Cuba',          level: 1, label: 'Normal',       updatedAt: '2025-10', source: 'US State Dept', detail: 'Destino seguro. Criminalidade baixa; escassez de produtos básicos pode impactar a experiência. Atenção a golpes contra turistas (câmbio, táxi).' },
  { destination: 'Jordânia',      level: 2, label: 'Atenção',      updatedAt: '2026-03', source: 'US State Dept', detail: 'País estável em região turbulenta. Tensão no norte (fronteira Síria/Iraque). Petra, Wadi Rum e Amã seguros para turistas. Conflito Israel-Gaza pode gerar instabilidade regional.' },
  { destination: 'Israel',        level: 3, label: 'Reconsiderar', updatedAt: '2026-04', source: 'US State Dept', detail: 'Conflito ativo com Gaza desde out/2023. Ataques de foguetes atingem cidades periodicamente. Aviação comercial parcialmente suspensa. Alta presença militar em Tel Aviv e Jerusalém.' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'visa-free':       { label: 'Sem visto',       color: 'var(--tdgflow-success)', bg: 'rgba(46,125,79,.08)',   border: 'rgba(46,125,79,.22)' },
  'visa-on-arrival': { label: 'Visto na chegada', color: 'var(--tdgflow-warning)', bg: 'rgba(182,65,15,.08)',  border: 'rgba(182,65,15,.22)' },
  'e-visa':          { label: 'e-Visa',           color: 'var(--tdgflow-navy)', bg: 'rgba(0,140,148,.08)',  border: 'rgba(0,140,148,.22)' },
  'eta':             { label: 'ETA',              color: '#6B21A8', bg: 'rgba(107,33,168,.08)', border: 'rgba(107,33,168,.22)' },
  'visa-required':   { label: 'Visto obrigatório', color: 'var(--tdgflow-error)', bg: 'rgba(192,57,43,.08)', border: 'rgba(192,57,43,.22)' },
  'no-entry':        { label: 'Entrada proibida', color: '#7F1D1D', bg: 'rgba(127,29,29,.08)',  border: 'rgba(127,29,29,.22)' },
  'unknown':         { label: 'Consultar',        color: 'var(--tdgflow-text-muted)', bg: 'rgba(74,117,128,.08)', border: 'rgba(74,117,128,.22)' },
}

function VisaBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['unknown']
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 999, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function SecurityIcon({ level }: { level: number }) {
  if (level === 1) return <ShieldCheck size={14} style={{ color: 'var(--tdgflow-success)' }} />
  if (level === 2) return <ShieldAlert size={14} style={{ color: 'var(--tdgflow-warning)' }} />
  if (level === 3) return <ShieldX size={14} style={{ color: 'var(--tdgflow-error)' }} />
  return <ShieldX size={14} style={{ color: '#7F1D1D' }} />
}

function SecurityBadge({ level, label }: { level: number; label: string }) {
  const colors: Record<number, { color: string; bg: string }> = {
    1: { color: 'var(--tdgflow-success)', bg: 'rgba(46,125,79,.08)' },
    2: { color: 'var(--tdgflow-warning)', bg: 'rgba(182,65,15,.08)' },
    3: { color: 'var(--tdgflow-error)', bg: 'rgba(192,57,43,.08)' },
    4: { color: '#7F1D1D', bg: 'rgba(127,29,29,.08)' },
  }
  const c = colors[level] ?? colors[4]
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, color: c.color, background: c.bg, whiteSpace: 'nowrap' }}>
      Nível {level} · {label}
    </span>
  )
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result, onClose }: { result: TravelRequirements; onClose: () => void }) {
  const visCfg = STATUS_CONFIG[result.visa_status] ?? STATUS_CONFIG['unknown']

  return (
    <div
      className="card card-gold animate-fade-up"
      style={{ position: 'relative', marginBottom: 16 }}
    >
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)', padding: 4 }}
      >
        <X size={14} />
      </button>

      {/* Destination header */}
      <div style={{ marginBottom: 16 }}>
        <p className="section-label mb-1">Resultado da consulta</p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
          {result.destination}
        </h2>
        {result.iso2 && result.iso2 !== 'XX' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginTop: 2 }}>Passaporte brasileiro · {result.iso2}</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {/* Visa */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: visCfg.bg, border: `1px solid ${visCfg.border}` }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Visto</p>
          <VisaBadge status={result.visa_status} />
          {result.visa_details && (
            <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-secondary)', marginTop: 6, lineHeight: 1.4 }}>{result.visa_details}</p>
          )}
        </div>

        {/* Security */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Segurança</p>
          {result.security_level ? (
            <>
              <SecurityBadge level={result.security_level} label={result.security_label ?? ''} />
              {result.security_message && (
                <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-secondary)', marginTop: 6, lineHeight: 1.4 }}>{result.security_message}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', background: 'var(--tdgflow-border-subtle)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>
                  US State Dept
                </span>
                {result.security_updated_at && (
                  <>
                    <span style={{ fontSize: '0.5625rem', color: '#B8CDD2' }}>·</span>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)' }}>
                      Aviso de {new Date(result.security_updated_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)' }}>Sem dados</span>
          )}
        </div>
      </div>

      {/* CIVP */}
      {result.civp_required && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(182,65,15,.06)', border: '1px solid rgba(182,65,15,.2)', marginBottom: 10 }}>
          <Syringe size={14} style={{ color: 'var(--tdgflow-warning)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-warning)', marginBottom: 2 }}>CIVP obrigatório</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>Certificado Internacional de Vacinação contra febre amarela exigido para viajantes partindo do Brasil.</p>
          </div>
        </div>
      )}

      {/* ETA note */}
      {result.eta_required && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(107,33,168,.05)', border: '1px solid rgba(107,33,168,.2)', marginBottom: 10 }}>
          <IconGlobe size={14} style={{ color: '#6B21A8', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>Requer ETA (Autorização Eletrônica de Viagem) antes do embarque.</p>
        </div>
      )}

      {/* Notes */}
      {result.notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {result.notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <ChevronRight size={11} style={{ color: 'var(--tdgflow-navy)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.4 }}>{n}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fonte oficial — combinado com Adriano: a API pode estar desatualizada,
          o consultor sempre tem um link direto pra conferir na fonte certa */}
      {result.embassy_link && (
        <a
          href={result.embassy_link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
            padding: '10px 14px', borderRadius: 10, textDecoration: 'none',
            background: 'var(--tdgflow-navy-subtle)', border: '1px solid var(--tdgflow-navy)',
          }}
        >
          <ExternalLink size={14} style={{ color: 'var(--tdgflow-navy)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tdgflow-navy)', margin: 0 }}>
              {result.embassy_link_specific ? 'Verificar na fonte oficial' : 'Verificar com o Itamaraty'}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', margin: '2px 0 0' }}>
              {result.embassy_link_specific
                ? `Portal oficial de imigração/visto — ${hostnameOf(result.embassy_link)}`
                : 'Sem portal oficial específico deste destino cadastrado — consulte o Ministério das Relações Exteriores'}
            </p>
          </div>
        </a>
      )}

      {/* Sources + timestamp */}
      {result.source?.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--tdgflow-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)' }}>Fontes</span>
              {result.source.map((s, i) => {
                const SOURCE_LINKS: Record<string, { url: string; label: string }> = {
                  'Passport Index': { url: 'https://github.com/ilyankou/passport-index-dataset', label: 'Passport Index' },
                  'WHO/ANVISA':     { url: 'https://www.who.int/ith/en/', label: 'WHO/ANVISA' },
                  'US State Dept':  { url: 'https://travel.state.gov/content/travel/en/international-travel.html', label: 'State Dept' },
                  'Travel Buddy AI':{ url: 'https://rapidapi.com/ugoBayon/api/visa-requirement', label: 'Travel Buddy' },
                  'IMUGA':          { url: 'https://imuga.immigration.gov.mv/', label: 'IMUGA' },
                  'Hardcoded':      { url: '', label: 'Base TDG Flow' },
                }
                const src = SOURCE_LINKS[s] ?? { url: '', label: s }
                return src.url ? (
                  <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--tdgflow-navy)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}>
                    {src.label}
                  </a>
                ) : (
                  <span key={i} style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--tdgflow-text-muted)' }}>{src.label}</span>
                )
              })}
            </div>
            {result.fetched_at && (
              <span style={{ fontSize: '0.6rem', color: 'var(--tdgflow-text-faint)', whiteSpace: 'nowrap' }}>
                Atualizado {new Date(result.fetched_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'vistos' | 'saude' | 'seguranca' | 'materiais'

const PASSPORTS = [
  { code: 'BR', flag: '🇧🇷', label: 'Brasil' },
  { code: 'PT', flag: '🇵🇹', label: 'Portugal' },
  { code: 'AR', flag: '🇦🇷', label: 'Argentina' },
  { code: 'US', flag: '🇺🇸', label: 'EUA' },
  { code: 'GB', flag: '🇬🇧', label: 'Reino Unido' },
  { code: 'DE', flag: '🇩🇪', label: 'Alemanha' },
  { code: 'FR', flag: '🇫🇷', label: 'França' },
  { code: 'IT', flag: '🇮🇹', label: 'Itália' },
  { code: 'ES', flag: '🇪🇸', label: 'Espanha' },
]

export default function DocsView() {
  const [query, setQuery]       = useState('')
  const [passport, setPassport] = useState('BR')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<TravelRequirements | null>(null)
  const [error, setError]       = useState('')
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [tab, setTab]           = useState<Tab>('vistos')
  const [visaFilter, setVisaFilter] = useState<string>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (destination: string, passportCode = 'BR') => {
    if (!destination.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/travel?q=${encodeURIComponent(destination)}&passport=${passportCode}`)
      if (res.status === 402) { setShowBalanceModal(true); setLoading(false); return }
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Erro ao consultar. Tente novamente.')
    }
    setLoading(false)
  }, [])

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'vistos',    label: 'Vistos',    icon: <IconGlobe size={13} /> },
    { key: 'saude',     label: 'Saúde',     icon: <Syringe size={13} /> },
    { key: 'seguranca', label: 'Segurança', icon: <ShieldCheck size={13} /> },
    { key: 'materiais', label: 'Materiais', icon: <IconDoc size={13} /> },
  ]

  const filteredVisa = visaFilter === 'all'
    ? VISA_TABLE
    : VISA_TABLE.filter(r => r.status === visaFilter)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
      {showBalanceModal && <InsufficientBalanceModal onClose={() => setShowBalanceModal(false)} />}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p className="section-label mb-1">Ferramentas</p>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.02em' }}>
          Documentação de Viagem
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)', marginTop: 4 }}>
          Vistos, saúde e segurança · passaporte{' '}
          <strong style={{ color: 'var(--tdgflow-navy)' }}>
            {PASSPORTS.find(p => p.code === passport)?.flag}{' '}
            {PASSPORTS.find(p => p.code === passport)?.label}
          </strong>
        </p>
        {/* Data sources note */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 12px', background: '#F0F7F8', borderRadius: 8, border: '1px solid var(--tdgflow-border)' }}>
          <span style={{ fontSize: '0.65rem', marginTop: 1 }}>🔍</span>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', lineHeight: 1.5, margin: 0 }}>
            Dados consultados em tempo real via{' '}
            <a href="https://rapidapi.com/TravelBuddyAI/api/visa-requirement" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tdgflow-navy)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Travel Buddy AI</a>
            {' '}· com dados complementares de{' '}
            <a href="https://www.who.int/ith/en/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tdgflow-navy)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>WHO/ANVISA</a>
            {' '}e{' '}
            <a href="https://travel.state.gov/content/travel/en/international-travel.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tdgflow-navy)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>US State Dept</a>
            . Verifique sempre com a embaixada antes de viajar.
          </p>
        </div>
      </div>

      {/* Passport selector */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', marginBottom: 7 }}>
          Passaporte
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {PASSPORTS.map(p => {
            const active = passport === p.code
            return (
              <button
                key={p.code}
                onClick={() => {
                  setPassport(p.code)
                  setResult(null)
                  if (query.trim()) search(query, p.code)
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 999,
                  background: active ? 'var(--tdgflow-navy-subtle)' : 'var(--tdgflow-surface)',
                  border: active ? '1.5px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
                  fontSize: '0.75rem', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                <span>{p.flag}</span> {p.code}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-text-muted)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          className="input"
          style={{ paddingLeft: 38, paddingRight: loading ? 42 : 14 }}
          placeholder="Digite um destino (ex: Japão, Dubai, África do Sul...)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query, passport)}
        />
        {loading && (
          <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdgflow-navy)' }} />
        )}
      </div>

      {/* Quick chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {QUICK_DESTINATIONS.map(d => (
          <button
            key={d.label}
            onClick={() => { setQuery(d.label); search(d.label, passport) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 999,
              background: 'var(--tdgflow-surface)', border: '1px solid var(--tdgflow-border)',
              fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', cursor: 'pointer',
              transition: 'all 150ms', fontWeight: 500,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-navy)'; (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-navy)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--tdgflow-text-secondary)' }}
          >
            <span>{d.flag}</span> {d.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.2)', marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ color: 'var(--tdgflow-error)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-error)' }}>Destino não encontrado. Tente outro nome ou use o Modo Flow para perguntas detalhadas.</p>
        </div>
      )}

      {/* Result card */}
      {result && <ResultCard result={result} onClose={() => { setResult(null); setQuery('') }} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--tdgflow-border)', marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--tdgflow-navy)' : 'var(--tdgflow-text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--tdgflow-navy)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 150ms',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Vistos ── */}
      {tab === 'vistos' && (
        <div>
          {/* Filter pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {['all', 'visa-free', 'visa-on-arrival', 'e-visa', 'eta', 'visa-required'].map(f => (
              <button
                key={f}
                onClick={() => setVisaFilter(f)}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 150ms',
                  background: visaFilter === f ? 'var(--tdgflow-navy)' : 'var(--tdgflow-surface)',
                  color: visaFilter === f ? 'var(--tdgflow-surface)' : 'var(--tdgflow-text-secondary)',
                  border: visaFilter === f ? '1px solid var(--tdgflow-navy)' : '1px solid var(--tdgflow-border)',
                }}
              >
                {f === 'all' ? 'Todos' : STATUS_CONFIG[f]?.label ?? f}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredVisa.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 8, background: i % 2 === 0 ? 'var(--tdgflow-surface)' : 'var(--tdgflow-bg)',
                  border: '1px solid transparent',
                  cursor: 'pointer', transition: 'all 150ms',
                }}
                onClick={() => { setQuery(row.destination); search(row.destination) }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>{row.destination}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>{row.detail}</p>
                </div>
                <VisaBadge status={row.status} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 12, textAlign: 'center' }}>
            Clique em qualquer destino para consulta completa · Dados para passaporte brasileiro
          </p>
        </div>
      )}

      {/* ── Tab: Saúde ── */}
      {tab === 'saude' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(182,65,15,.06)', border: '1px solid rgba(182,65,15,.2)', marginBottom: 16 }}>
            <Syringe size={14} style={{ color: 'var(--tdgflow-warning)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--tdgflow-warning)' }}>CIVP</strong> — Certificado Internacional de Vacinação contra Febre Amarela. Viajantes partindo do Brasil podem ser obrigados a apresentar o documento na chegada ao destino.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {HEALTH_TABLE.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 8, background: i % 2 === 0 ? 'var(--tdgflow-surface)' : 'var(--tdgflow-bg)',
                  border: '1px solid transparent', cursor: 'pointer', transition: 'all 150ms',
                }}
                onClick={() => { setQuery(row.destination); search(row.destination); setTab('vistos') }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>{row.destination}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--tdgflow-text-muted)', marginTop: 1 }}>{row.notes}</p>
                </div>
                {row.civp ? (
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, color: 'var(--tdgflow-warning)', background: 'rgba(182,65,15,.08)', border: '1px solid rgba(182,65,15,.2)', whiteSpace: 'nowrap' }}>
                    CIVP obrigatório
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', fontWeight: 500, padding: '3px 8px', borderRadius: 999, color: 'var(--tdgflow-text-muted)', background: 'var(--tdgflow-bg)', border: '1px solid var(--tdgflow-border)', whiteSpace: 'nowrap' }}>
                    CIVP opcional
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Segurança ── */}
      {tab === 'seguranca' && (
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { level: 1, label: 'Nível 1 — Normal',       color: 'var(--tdgflow-success)' },
              { level: 2, label: 'Nível 2 — Atenção',      color: 'var(--tdgflow-warning)' },
              { level: 3, label: 'Nível 3 — Reconsiderar', color: 'var(--tdgflow-error)' },
              { level: 4, label: 'Nível 4 — Não viaje',    color: '#7F1D1D' },
            ].map(l => (
              <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SecurityIcon level={l.level} />
                <span style={{ fontSize: '0.7rem', color: l.color, fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {SECURITY_TABLE.sort((a, b) => a.level - b.level).map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 8, background: i % 2 === 0 ? 'var(--tdgflow-surface)' : 'var(--tdgflow-bg)',
                  border: '1px solid transparent', cursor: 'pointer', transition: 'all 150ms',
                }}
                onClick={() => { setQuery(row.destination); search(row.destination) }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--tdgflow-border)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
              >
                <SecurityIcon level={row.level} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', margin: 0 }}>{row.destination}</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', marginTop: 3, lineHeight: 1.45, margin: '3px 0 0' }}>{row.detail}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)', background: 'var(--tdgflow-border-subtle)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>
                      {row.source}
                    </span>
                    <span style={{ fontSize: '0.5625rem', color: '#B8CDD2' }}>·</span>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-faint)' }}>
                      Aviso de {row.updatedAt}
                    </span>
                  </div>
                </div>
                <SecurityBadge level={row.level} label={row.label} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Materiais ── */}
      {tab === 'materiais' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--tdgflow-surface-high)', border: '1px solid var(--tdgflow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconDoc size={20} style={{ color: 'var(--tdgflow-text-muted)' }} />
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)' }}>Materiais em breve</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--tdgflow-text-muted)', maxWidth: 320, lineHeight: 1.5 }}>
            Fichas de hotel, contratos, políticas de comissão e materiais de treinamento da rede TDG serão disponibilizados aqui.
          </p>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
