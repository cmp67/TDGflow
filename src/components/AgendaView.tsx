'use client'

/* Agenda da rede (18/10/2026): calendário compartilhado — treinamentos,
   feiras, webinars, reuniões, FAM trips e prazos. Qualquer pessoa logada
   cria (com nome e data), a rede confirma presença. Mês em grade + lista
   dos próximos 30 dias. O Max registra pelo WhatsApp e posta a agenda de
   amanhã e o wrap-up de domingo no grupo (crons em /api/cron/max-*). */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Link as LinkIcon, MapPin, Users, Pencil, Trash2 } from 'lucide-react'
import TdgIconSprite from '@/components/TdgIconSprite'
import { EVENT_TYPES, EVENT_TYPE_LABELS, RSVP_LABELS, RSVP_STATUSES, brDate, brTime, brWeekday, brDay, type EventRow, type EventType, type RsvpStatus } from '@/lib/events'

const TYPE_COLOR: Record<EventType, string> = {
  treinamento: 'var(--tdgflow-navy)', feira: 'var(--tdgflow-gold-dim)', webinar: 'var(--tdgflow-accent-info)', reuniao: 'var(--tdgflow-navy-dim)',
  famtrip: 'var(--tdgflow-accent-warm)', prazo: '#B91C1C', outro: 'var(--tdgflow-text-muted)',
}

type Draft = { id: string | null; title: string; type: EventType; date: string; time: string; endTime: string; allDay: boolean; modality: '' | 'online' | 'presencial'; location: string; link: string; description: string; visibility: 'rede' | 'agencia' }
const emptyDraft = (date?: string): Draft => ({ id: null, title: '', type: 'treinamento', date: date ?? brDay(new Date()), time: '', endTime: '', allDay: false, modality: '', location: '', link: '', description: '', visibility: 'rede' })

function monthRange(y: number, m: number) {
  const from = new Date(Date.UTC(y, m, 1)); const to = new Date(Date.UTC(y, m + 1, 1))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function draftFrom(e: EventRow): Draft {
  return {
    id: e.id, title: e.title, type: e.type, date: brDay(e.starts_at), time: e.all_day ? '' : brTime(e.starts_at), endTime: e.ends_at && !e.all_day ? brTime(e.ends_at) : '',
    allDay: e.all_day, modality: e.modality ?? '', location: e.location ?? '', link: e.link ?? '', description: e.description ?? '', visibility: e.visibility,
  }
}

export default function AgendaView() {
  const today = brDay(new Date())
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<EventRow | null>(null)

  const range = useMemo(() => monthRange(cursor.y, cursor.m), [cursor])
  const load = useCallback(async () => {
    setLoading(true)
    // carrega do início do mês até 60 dias depois do fim — cobre a grade e a lista "próximos 30 dias"
    const to = new Date(`${range.to}T00:00:00Z`); to.setUTCDate(to.getUTCDate() + 60)
    const res = await fetch(`/api/events?from=${range.from}&to=${to.toISOString().slice(0, 10)}`)
    const data = await res.json().catch(() => ({}))
    setEvents(data.events ?? []); setLoading(false)
  }, [range])
  useEffect(() => { load() }, [load])

  const byDay = useMemo(() => {
    const m = new Map<string, EventRow[]>()
    for (const e of events) { const d = brDay(e.starts_at); m.set(d, [...(m.get(d) ?? []), e]) }
    return m
  }, [events])

  const upcoming = useMemo(() => {
    const limit = new Date(`${today}T00:00:00Z`); limit.setUTCDate(limit.getUTCDate() + 30)
    return events.filter(e => brDay(e.starts_at) >= today && brDay(e.starts_at) < limit.toISOString().slice(0, 10))
  }, [events, today])

  async function save() {
    if (!draft) return
    setSaving(true); setError(null)
    const starts_at = draft.allDay || !draft.time ? draft.date : `${draft.date} ${draft.time}`
    const ends_at = !draft.allDay && draft.endTime ? `${draft.date} ${draft.endTime}` : null
    const body = { title: draft.title, type: draft.type, starts_at, ends_at, all_day: draft.allDay || !draft.time, modality: draft.modality || null, location: draft.location || null, link: draft.link || null, description: draft.description || null, visibility: draft.visibility }
    const res = await fetch(draft.id ? `/api/events/${draft.id}` : '/api/events', { method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Não deu pra salvar.'); return }
    setDraft(null); setOpen(null); load()
  }

  async function rsvp(e: EventRow, status: RsvpStatus) {
    await fetch(`/api/events/${e.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    load()
  }

  async function cancel(e: EventRow) {
    if (!window.confirm(`Cancelar "${e.title}"? Ele some da agenda da rede.`)) return
    const res = await fetch(`/api/events/${e.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error ?? 'Não deu pra cancelar.'); return }
    setOpen(null); load()
  }

  // grade do mês (domingo a sábado)
  const first = new Date(Date.UTC(cursor.y, cursor.m, 1))
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate()
  const cells: (string | null)[] = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)]
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)

  const label: React.CSSProperties = { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tdgflow-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TdgIconSprite />
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--tdgflow-border)', background: 'var(--tdgflow-surface)', padding: '18px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--tdgflow-navy-dim)', marginBottom: 3 }}>Rede TDG</p>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--tdgflow-text-primary)', letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4 }}>Agenda</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>Treinamentos, feiras, webinars e prazos da rede. Anote, convide, confirme presença. O Max lembra no grupo.</p>
        </div>
        <button onClick={() => setDraft(emptyDraft())} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> Novo evento</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
        {/* Grade do mês */}
        <section style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={() => setCursor(c => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))} className="btn-ghost" style={{ padding: 4 }}><ChevronLeft size={16} /></button>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)', textTransform: 'capitalize' }}>{monthLabel}</p>
            <button onClick={() => setCursor(c => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))} className="btn-ghost" style={{ padding: 4 }}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
            {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map(d => <p key={d} style={{ ...label, textAlign: 'center', padding: '2px 0' }}>{d}</p>)}
            {cells.map((day, i) => (
              <div key={i} onClick={() => day && setDraft(emptyDraft(day))} style={{ minHeight: 72, borderRadius: 8, padding: 4, cursor: day ? 'pointer' : 'default', background: day ? 'var(--tdgflow-surface)' : 'transparent', border: `1px solid ${day === today ? 'var(--tdgflow-gold-dim)' : day ? 'var(--tdgflow-border)' : 'transparent'}` }}>
                {day && <p style={{ fontSize: '0.6875rem', fontWeight: day === today ? 700 : 500, color: day === today ? 'var(--tdgflow-gold-dim)' : 'var(--tdgflow-text-muted)', marginBottom: 2 }}>{Number(day.slice(8))}</p>}
                {day && (byDay.get(day) ?? []).slice(0, 3).map(e => (
                  <button key={e.id} onClick={ev => { ev.stopPropagation(); setOpen(e) }} title={e.title} style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '0.625rem', lineHeight: 1.3, padding: '1px 4px', marginBottom: 2, borderRadius: 4, border: 'none', cursor: 'pointer', background: `color-mix(in srgb, ${TYPE_COLOR[e.type]} 12%, transparent)`, color: TYPE_COLOR[e.type], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {!e.all_day && <span style={{ fontWeight: 600 }}>{brTime(e.starts_at)} </span>}{e.title}
                  </button>
                ))}
                {day && (byDay.get(day)?.length ?? 0) > 3 && <p style={{ fontSize: '0.5625rem', color: 'var(--tdgflow-text-muted)' }}>+{(byDay.get(day)?.length ?? 0) - 3}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Próximos 30 dias */}
        <aside>
          <p style={{ ...label, marginBottom: 8 }}>Próximos 30 dias</p>
          {loading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tdgflow-text-muted)' }} />}
          {!loading && upcoming.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-muted)' }}>Nada marcado. Clique num dia ou em &ldquo;Novo evento&rdquo;.</p>}
          {upcoming.map(e => (
            <button key={e.id} onClick={() => setOpen(e)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 6, borderRadius: 10, border: '1px solid var(--tdgflow-border)', borderLeft: `3px solid ${TYPE_COLOR[e.type]}`, background: 'var(--tdgflow-surface)', cursor: 'pointer' }}>
              <p style={{ fontSize: '0.625rem', color: 'var(--tdgflow-text-muted)', letterSpacing: '0.04em' }}>{brWeekday(e.starts_at)} {brDate(e.starts_at)}{!e.all_day && ` · ${brTime(e.starts_at)}`} · {EVENT_TYPE_LABELS[e.type]}</p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{e.title}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)' }}>{e.created_by_name}{e.rsvp_vou > 0 && ` · ${e.rsvp_vou} confirmada${e.rsvp_vou > 1 ? 's' : ''}`}{e.my_rsvp && ` · você: ${RSVP_LABELS[e.my_rsvp]}`}</p>
            </button>
          ))}
        </aside>
      </div>

      {/* Ficha do evento */}
      {open && !draft && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,12,6,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--tdgflow-surface)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p style={{ ...label, color: TYPE_COLOR[open.type] }}>{EVENT_TYPE_LABELS[open.type]}{open.visibility === 'agencia' && ' · só minha agência'}</p>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{open.title}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)' }}>{brWeekday(open.starts_at)} {brDate(open.starts_at)}{!open.all_day && ` · ${brTime(open.starts_at)}${open.ends_at ? ` às ${brTime(open.ends_at)}` : ''}`}</p>
              </div>
              <button onClick={() => setOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}><X size={16} /></button>
            </div>
            {(open.modality || open.location) && <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={13} /> {open.modality === 'online' ? 'Online' : open.location}</p>}
            {open.link && <a href={open.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-navy)', display: 'flex', gap: 6, alignItems: 'center', wordBreak: 'break-all' }}><LinkIcon size={13} /> {open.link}</a>}
            {open.description && <p style={{ fontSize: '0.8125rem', color: 'var(--tdgflow-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{open.description}</p>}
            <p style={{ fontSize: '0.6875rem', color: 'var(--tdgflow-text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Users size={12} /> {open.rsvp_vou} confirmada{open.rsvp_vou === 1 ? '' : 's'}{open.rsvp_talvez > 0 && `, ${open.rsvp_talvez} talvez`} · criado por {open.created_by_name}{open.created_via === 'max' && ' via Max'}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RSVP_STATUSES.map(s => (
                <button key={s} onClick={() => rsvp(open, s)} className={open.my_rsvp === s ? 'btn-gold' : 'btn-ghost'} style={{ fontSize: '0.75rem', padding: '5px 12px' }}>{RSVP_LABELS[s]}</button>
              ))}
              {open.can_edit && <>
                <button onClick={() => setDraft(draftFrom(open))} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px', marginLeft: 'auto' }}><Pencil size={12} /> Editar</button>
                <button onClick={() => cancel(open)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px', color: '#B91C1C' }}><Trash2 size={12} /> Cancelar</button>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* Criar / editar */}
      {draft && (
        <div onClick={() => setDraft(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,12,6,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--tdgflow-surface)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--tdgflow-text-primary)' }}>{draft.id ? 'Editar evento' : 'Novo evento'}</p>
              <button onClick={() => setDraft(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tdgflow-text-muted)' }}><X size={16} /></button>
            </div>
            <input className="input" placeholder="Título (ex: Treinamento Six Senses)" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} maxLength={160} autoFocus style={{ fontSize: '0.8125rem' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="input" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as EventType })} style={{ fontSize: '0.8125rem', flex: 1 }}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
              </select>
              <select className="input" value={draft.visibility} onChange={e => setDraft({ ...draft, visibility: e.target.value as 'rede' | 'agencia' })} style={{ fontSize: '0.8125rem', flex: 1 }}>
                <option value="rede">Rede inteira</option>
                <option value="agencia">Só minha agência</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="input" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} style={{ fontSize: '0.8125rem' }} />
              {!draft.allDay && <>
                <input className="input" type="time" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} style={{ fontSize: '0.8125rem', width: 100 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)' }}>às</span>
                <input className="input" type="time" value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })} style={{ fontSize: '0.8125rem', width: 100 }} />
              </>}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)' }}>
                <input type="checkbox" checked={draft.allDay} onChange={e => setDraft({ ...draft, allDay: e.target.checked })} /> Dia inteiro
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="input" value={draft.modality} onChange={e => setDraft({ ...draft, modality: e.target.value as Draft['modality'] })} style={{ fontSize: '0.8125rem', width: 150 }}>
                <option value="">Modalidade</option>
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
              </select>
              {draft.modality === 'presencial'
                ? <input className="input" placeholder="Endereço / cidade" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} style={{ fontSize: '0.8125rem', flex: 1 }} />
                : <input className="input" placeholder="Link (reunião ou inscrição)" value={draft.link} onChange={e => setDraft({ ...draft, link: e.target.value })} style={{ fontSize: '0.8125rem', flex: 1 }} />}
            </div>
            <textarea className="input" placeholder="Descrição (opcional)" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={3} style={{ fontSize: '0.8125rem', resize: 'vertical' }} />
            {error && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>}
            <button onClick={save} disabled={saving} className="btn-gold" style={{ fontSize: '0.8125rem', padding: '9px 14px' }}>{saving ? <Loader2 size={13} className="animate-spin" /> : null} {draft.id ? 'Salvar' : 'Criar evento'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
