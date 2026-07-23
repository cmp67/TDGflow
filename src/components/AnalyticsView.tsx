'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Building2, Users, Star, BarChart2, Award, Sparkles, MapPin, Activity, Trophy } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const VISIT_TYPE_COLORS: Record<string, string> = {
  fam_trip:           'var(--gold)',
  site_inspection:    '#7DD3FC',
  personal_stay:      '#86EFAC',
  commercial_meeting: '#C4B5FD',
}

type Period = 'month' | 'quarter' | 'year' | 'all'

interface VisitTypeStat { visit_type: string; count: number; this_month: number; this_quarter: number; this_year: number }
interface MonthStat { month: string; reviews: number }
interface HotelStat { hotel_name: string; visit_count: number; avg_rating: number; agency_count: number }
interface AgencyStat { agency_name: string; review_count: number; unique_hotels: number; avg_rating: number }
interface ActivityItem { hotel_name: string; country: string | null; agent_name: string; agency_name: string; visit_type: string | null; overall_rating: number; created_at: string }
interface CountryStat { country: string; visit_count: number; avg_rating: number }

interface NetworkData {
  total_reviews: number; unique_hotels: number; active_agencies: number; avg_rating: number
  this_month: number; this_quarter: number; this_year: number
  by_visit_type: VisitTypeStat[]; monthly_trend: MonthStat[]
  top_hotels: HotelStat[]; top_agencies: AgencyStat[]
  recent_activity: ActivityItem[]; top_countries: CountryStat[]
}
interface MeData {
  agent_name: string; agency_name: string
  total_reviews: number; unique_hotels: number; avg_rating: number
  this_month: number; this_quarter: number; this_year: number
  by_visit_type: { visit_type: string; count: number }[]; monthly_trend: MonthStat[]
}
interface AnalyticsData { network: NetworkData; me: MeData }

/* ── Count-up hook ───────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

/* ── Animated stat card ──────────────────────────────────────────────── */
function StatCard({ value, label, icon, accent = false, delay = 0 }: {
  value: number | string; label: string; icon: React.ReactNode; accent?: boolean; delay?: number
}) {
  const numericTarget = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  const isNumeric = typeof value === 'number'
  const animated = useCountUp(isNumeric ? numericTarget : 0, 900)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      style={{
        background: accent ? 'linear-gradient(135deg, var(--gold-subtle) 0%, transparent 100%)' : 'var(--surface)',
        border: `1px solid ${accent ? 'var(--gold-ring)' : 'var(--border)'}`,
        borderRadius: 14, padding: '16px 18px',
      }}
    >
      <div style={{ color: accent ? '#008C94' : '#4A7580', marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: accent ? '#008C94' : '#112630', lineHeight: 1, marginBottom: 5 }}>
        {isNumeric ? animated.toLocaleString('pt-BR') : value}
      </p>
      <p style={{ fontSize: '0.6875rem', color: '#4A7580', letterSpacing: '0.01em' }}>{label}</p>
    </motion.div>
  )
}

/* ── Mini bar ────────────────────────────────────────────────────────── */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        style={{ height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

/* ── Trend chart ─────────────────────────────────────────────────────── */
function TrendChart({ data, color = 'var(--gold)' }: { data: MonthStat[]; color?: string }) {
  if (!data.length) return <p style={{ fontSize: '0.75rem', color: '#4A7580', padding: '8px 0' }}>Sem dados suficientes.</p>
  const max = Math.max(...data.map(d => d.reviews), 1)
  const height = 52
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: height + 24 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.reviews / max) * height, 3)
        const [y, m] = d.month.split('-')
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short' })
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <motion.div
              initial={{ height: 0 }} animate={{ height: barH }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              title={`${d.reviews} dicas`}
              style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', opacity: i === data.length - 1 ? 1 : 0.5 }}
            />
            <span style={{ fontSize: '0.45rem', color: '#4A7580', letterSpacing: '0.02em' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Activity item ───────────────────────────────────────────────────── */
function ActivityRow({ item }: { item: ActivityItem }) {
  const color = VISIT_TYPE_COLORS[item.visit_type ?? ''] ?? 'var(--border-light)'
  const elapsed = Date.now() - new Date(item.created_at).getTime()
  const days = Math.floor(elapsed / 86400000)
  const hours = Math.floor(elapsed / 3600000)
  const timeStr = days > 0 ? `há ${days}d` : hours > 0 ? `há ${hours}h` : 'agora'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#112630', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.hotel_name}
          {item.country && <span style={{ color: '#4A7580', fontWeight: 400 }}> · {item.country}</span>}
        </p>
        <p style={{ fontSize: '0.6875rem', color: '#104C64' }}>{item.agent_name} · {item.agency_name}</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#008C94' }}>{item.overall_rating} ★</p>
        <p style={{ fontSize: '0.625rem', color: '#4A7580' }}>{timeStr}</p>
      </div>
    </div>
  )
}

/* ── AI Insights block ───────────────────────────────────────────────── */
function InsightsBlock() {
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/insights')
      .then(r => r.json())
      .then(d => { setInsights(d.insights ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--gold-subtle) 0%, var(--surface) 60%)', border: '1px solid var(--gold-ring)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Sparkles size={13} style={{ color: '#008C94' }} />
        <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#006B72' }}>
          Insights da rede · gerado por IA
        </p>
      </div>
      {loading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', opacity: 0.6, animation: 'pulse 1.2s ease-in-out infinite' }} />
          <p style={{ fontSize: '0.8125rem', color: '#4A7580' }}>Analisando dados...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
            >
              <span style={{ color: '#008C94', fontSize: '0.6rem', marginTop: 4, flexShrink: 0 }}>◆</span>
              <p style={{ fontSize: '0.8125rem', color: '#104C64', lineHeight: 1.5 }}>{text}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Period helpers ──────────────────────────────────────────────────── */
function periodCount(stat: VisitTypeStat | NetworkData, period: Period): number {
  if (period === 'month')   return (stat as VisitTypeStat).this_month   ?? (stat as NetworkData).this_month
  if (period === 'quarter') return (stat as VisitTypeStat).this_quarter ?? (stat as NetworkData).this_quarter
  if (period === 'year')    return (stat as VisitTypeStat).this_year    ?? (stat as NetworkData).this_year
  return (stat as VisitTypeStat).count ?? (stat as NetworkData).total_reviews
}

/* ── Main view ───────────────────────────────────────────────────────── */
export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('all')
  const [tab, setTab] = useState<'network' | 'me'>('network')
  const { tr } = useLanguage()

  const PERIOD_LABELS: Record<Period, string> = {
    month:   tr('analytics.period.month'),
    quarter: tr('analytics.period.quarter'),
    year:    tr('analytics.period.year'),
    all:     tr('analytics.period.all'),
  }

  const VISIT_TYPE_LABELS: Record<string, string> = {
    fam_trip:           tr('type.fam_trip'),
    site_inspection:    tr('type.site_inspection'),
    personal_stay:      tr('type.personal_stay'),
    commercial_meeting: tr('type.commercial_meeting'),
  }

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <p style={{ color: '#4A7580', fontSize: '0.875rem' }}>Carregando dados...</p>
    </div>
  )
  if (!data) return null

  const { network, me } = data

  const networkTotal = period === 'month' ? network.this_month
    : period === 'quarter' ? network.this_quarter
    : period === 'year' ? network.this_year
    : network.total_reviews

  const meTotal = period === 'month' ? me.this_month
    : period === 'quarter' ? me.this_quarter
    : period === 'year' ? me.this_year
    : me.total_reviews

  const byTypeSorted = [...network.by_visit_type].sort((a, b) => periodCount(b, period) - periodCount(a, period))
  const maxType = Math.max(...byTypeSorted.map(s => periodCount(s, period)), 1)
  const topHotel = network.top_hotels[0]
  const maxCountry = Math.max(...(network.top_countries ?? []).map(c => c.visit_count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#006B72', marginBottom: 3 }}>
              Intelligence
            </p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#112630', letterSpacing: '-0.025em' }}>
              Analytics TDG
            </h2>
          </div>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
            {(['month', 'quarter', 'year', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 9px', borderRadius: 7, fontSize: '0.6875rem', cursor: 'pointer', border: 'none',
                  background: period === p ? 'var(--surface)' : 'transparent',
                  color: period === p ? '#112630' : '#4A7580',
                  fontWeight: period === p ? 600 : 400,
                  boxShadow: period === p ? '0 1px 3px rgba(28,20,16,0.10)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
          {[
            { id: 'network', label: tr('analytics.network') },
            { id: 'me', label: tr('analytics.me') },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'network' | 'me')}
              style={{
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? '#112630' : '#4A7580',
                borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'all 150ms',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          <AnimatePresence mode="wait">
          {tab === 'network' && (
            <motion.div key="network" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Hero stats — count-up animated */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <StatCard value={networkTotal} label={`${tr('analytics.totalReviews')} · ${PERIOD_LABELS[period].toLowerCase()}`} icon={<TrendingUp size={15} />} accent delay={0} />
                <StatCard value={network.unique_hotels} label={tr('analytics.hotels')} icon={<Building2 size={15} />} delay={0.06} />
                <StatCard value={network.active_agencies} label={tr('analytics.advisors')} icon={<Users size={15} />} delay={0.12} />
                <StatCard value={network.avg_rating ? `${Number(network.avg_rating).toFixed(1)} ★` : '—'} label={tr('analytics.avgRating')} icon={<Star size={15} />} delay={0.18} />
              </div>

              {/* ── AI Insights ── */}
              <InsightsBlock />

              {/* ── Destaque do mês ── */}
              {topHotel && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--gold) 0%, var(--gold-dim) 100%)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Trophy size={13} style={{ color: '#008C94' }} />
                    <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580' }}>
                      Hotel mais avaliado da rede
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '1rem', fontWeight: 600, color: '#112630', letterSpacing: '-0.02em', marginBottom: 3 }}>
                        {topHotel.hotel_name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#4A7580' }}>
                        {topHotel.agency_count} agênci{topHotel.agency_count !== 1 ? 'as' : 'a'} visitaram
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#008C94', letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {topHotel.visit_count}
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: '#4A7580' }}>
                        visitas · {Number(topHotel.avg_rating).toFixed(1)} ★
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Por tipo de visita ── */}
              <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580', marginBottom: 14 }}>
                  {tr('analytics.byType')} · {PERIOD_LABELS[period]}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {byTypeSorted.map(s => {
                    const v = periodCount(s, period)
                    const color = VISIT_TYPE_COLORS[s.visit_type] ?? 'var(--text-muted)'
                    return (
                      <div key={s.visit_type}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#104C64' }}>
                              {VISIT_TYPE_LABELS[s.visit_type] ?? s.visit_type}
                            </span>
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#112630', letterSpacing: '-0.03em' }}>
                            {v.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <MiniBar value={v} max={maxType} color={color} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Top países ── */}
              {(network.top_countries ?? []).length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <MapPin size={13} style={{ color: '#008C94' }} />
                    <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580' }}>
                      Destinos mais avaliados
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {network.top_countries.map(c => (
                      <div key={c.country}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#104C64' }}>{c.country}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#112630' }}>{c.visit_count}</span>
                        </div>
                        <MiniBar value={c.visit_count} max={maxCountry} color="var(--gold)" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tendência mensal ── */}
              <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580', marginBottom: 16 }}>
                  {tr('analytics.trend')}
                </p>
                <TrendChart data={network.monthly_trend} />
              </div>

              {/* ── Feed de atividade ── */}
              {(network.recent_activity ?? []).length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Activity size={13} style={{ color: '#008C94' }} />
                    <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580' }}>
                      Atividade recente da rede
                    </p>
                  </div>
                  {network.recent_activity.map((item, i) => (
                    <ActivityRow key={i} item={item} />
                  ))}
                </div>
              )}

              {/* ── Top hotéis ── */}
              <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={13} style={{ color: '#008C94' }} />
                  <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580' }}>
                    {tr('analytics.topHotels')}
                  </p>
                </div>
                {network.top_hotels.map((h, i) => (
                  <div key={h.hotel_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderTop: '1px solid var(--border)', background: i === 0 ? 'var(--gold-subtle)' : 'transparent' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6875rem', fontWeight: 700, background: i < 3 ? 'var(--gold-subtle)' : 'var(--surface-high)', color: i < 3 ? '#008C94' : '#4A7580', border: i < 3 ? '1px solid var(--gold-ring)' : '1px solid var(--border)' }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#112630', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.hotel_name}</p>
                      <p style={{ fontSize: '0.6875rem', color: '#4A7580' }}>{h.agency_count} agênci{h.agency_count !== 1 ? 'as' : 'a'}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#112630', letterSpacing: '-0.03em' }}>{h.visit_count}</p>
                      <p style={{ fontSize: '0.6rem', color: '#008C94' }}>{Number(h.avg_rating).toFixed(1)} ★</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Top agências ── */}
              <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={13} style={{ color: '#008C94' }} />
                  <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580' }}>
                    {tr('analytics.topAgencies')}
                  </p>
                </div>
                {network.top_agencies.map(a => (
                  <div key={a.agency_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'var(--surface-high)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: '#104C64' }}>
                      {a.agency_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#112630', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.agency_name}</p>
                      <p style={{ fontSize: '0.6875rem', color: '#4A7580' }}>{a.unique_hotels} hotéis únicos</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#112630', letterSpacing: '-0.03em' }}>{a.review_count}</p>
                      <p style={{ fontSize: '0.6rem', color: '#008C94' }}>{Number(a.avg_rating).toFixed(1)} ★</p>
                    </div>
                  </div>
                ))}
              </div>

            </motion.div>
          )}

          {tab === 'me' && (
            <motion.div key="me" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <StatCard value={meTotal} label={`Minhas dicas · ${PERIOD_LABELS[period].toLowerCase()}`} icon={<TrendingUp size={15} />} accent delay={0} />
                <StatCard value={me.unique_hotels} label="Hotéis únicos visitados" icon={<Building2 size={15} />} delay={0.06} />
                <StatCard value={me.avg_rating ? `${Number(me.avg_rating).toFixed(1)} ★` : '—'} label="Meu rating médio" icon={<Star size={15} />} delay={0.12} />
                <StatCard value={`${meTotal > 0 && networkTotal > 0 ? ((meTotal / networkTotal) * 100).toFixed(0) : 0}%`} label="Da atividade da rede" icon={<BarChart2 size={15} />} delay={0.18} />
              </div>

              {me.by_visit_type.length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580', marginBottom: 14 }}>
                    Minhas visitas por tipo
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {me.by_visit_type.map(s => {
                      const color = VISIT_TYPE_COLORS[s.visit_type] ?? 'var(--text-muted)'
                      const maxMe = Math.max(...me.by_visit_type.map(x => x.count), 1)
                      return (
                        <div key={s.visit_type}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
                              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#104C64' }}>{VISIT_TYPE_LABELS[s.visit_type] ?? s.visit_type}</span>
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#112630' }}>{s.count}</span>
                          </div>
                          <MiniBar value={s.count} max={maxMe} color={color} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {me.monthly_trend.length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 18px' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4A7580', marginBottom: 16 }}>
                    Minha atividade — últimos 6 meses
                  </p>
                  <TrendChart data={me.monthly_trend} color="#86EFAC" />
                </div>
              )}

              {me.total_reviews === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <TrendingUp size={28} style={{ color: '#4A7580', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '0.875rem', color: '#4A7580' }}>Você ainda não registrou nenhuma dica.</p>
                  <p style={{ fontSize: '0.75rem', color: '#4A7580', marginTop: 4 }}>Vá em Dicas → Nova visita para começar.</p>
                </div>
              )}
            </motion.div>
          )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  )
}
