'use client'

/* Agenda da rede (18/10/2026): calendário compartilhado — treinamentos,
   feiras, webinars, reuniões, FAM trips e prazos. Qualquer pessoa logada
   cria (com nome e data), a rede confirma presença. Mês em grade + lista
   dos próximos 30 dias. O Max registra pelo WhatsApp e posta a agenda de
   amanhã e o wrap-up de domingo no grupo (crons em /api/cron/max-*). */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Link as LinkIcon, MapPin, Users, Pencil, Trash2, Copy, CalendarPlus, UserPlus, Mail, MessageCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import TdgIconSprite from '@/components/TdgIconSprite'
import { EVENT_TYPES, EVENT_TYPE_LABELS, RSVP_LABELS, RSVP_STATUSES, brDate, brTime, brWeekday, brDay, googleCalendarUrl, outlookCalendarUrl, type EventRow, type EventType, type RsvpStatus } from '@/lib/events'

const TYPE_COLOR: Record<EventType, string> = {
  treinamento: 'var(--tdgflow-navy)', feira: 'var(--tdgflow-gold-dim)', webinar: 'var(--tdgflow-accent-info)', reuniao: 'var(--tdgflow-navy-dim)',
  famtrip: 'var(--tdgflow-accent-warm)', prazo: '#B91C1C', outro: 'var(--tdgflow-text-muted)',
}

type Person = { id: string; name: string; agency_name: string | null; agency_id: string | null }
type Invitee = { user_id: string; name: string; agency_name: string | null; rsvp: RsvpStatus | null; email_sent: boolean; whatsapp_sent: boolean }

type Draft = { invitees?: string[]; id: string | null; title: string; type: EventType; date: string; time: string; endTime: string; allDay: boolean; modality: '' | 'online' | 'presencial'; location: string; link: string; description: string; visibility: 'rede' | 'agencia' }
const emptyDraft = (date?: string): Draft => ({ id: null, title: '', type: 'treinamento', date: date ?? brDay(new Date()), time: '', endTime: '', allDay: false, modality: '', location: '', link: '', description: '', visibility: 'rede' })

function monthRange(y: number, m: number) {
  const from = new Date(Date.UTC(y, m, 1)); const to = new Date(Date.UTC(y, m + 1, 1))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function draftFrom(e: EventRow, duplicate = false): Draft {
  return {
    id: duplicate ? null : e.id, title: duplicate ? `${e.title} (cópia)` : e.title, type: e.type, date: brDay(e.starts_at), time: e.all_day ? '' : brTime(e.starts_at), endTime: e.ends_at && !e.all_day ? brTime(e.ends_at) : '',
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
  const [people, setPeople] = useState<Person[]>([])
  const [invitees, setInvitees] = useState<Invitee[]>([])
  const [inviting, setInviting] = useState(false)
  const [pickSearch, setPickSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const deepLink = searchParams.get('event')

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
  useEffect(() => { fetch('/api/events/people').then(r => r.json()).then(d => setPeople(d.people ?? [])).catch(() => {}) }, [])
  // Link do convite (e-mail/WhatsApp): /flow/agenda?event=<id> abre a ficha.
  useEffect(() => {
    if (!deepLink) return
    fetch(`/api/events/${deepLink}`).then(r => r.ok ? r.json() : null).then(d => { if (d?.event) setOpen(d.event) }).catch(() => {})
  }, [deepLink])
  useEffect(() => {
    if (!open) { setInvitees([]); return }
    fetch(`/api/events/${open.id}/invite`).then(r => r.json()).then(d => setInvitees(d.invitees ?? [])).catch(() => {})
  }, [open])

  async function inviteMore(e: EventRow, ids: string[]) {
    if (!ids.length) return
    setInviting(true)
    const res = await fetch(`/api/events/${e.id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ids: ids }) })
    const d = await res.json().catch(() => ({}))
    setInviting(false)
    if (!res.ok) { setNotice(d.error ?? 'Não deu pra convidar.'); return }
    setNotice(`${d.invited} convite${d.invited === 1 ? '' : 's'} enviado${d.invited === 1 ? '' : 's'} (${d.notified?.email ?? 0} por e-mail, ${d.notified?.whatsapp ?? 0} por WhatsApp)`)
    const r = await fetch(`/api/events/${e.id}/invite`).then(x => x.json()).catch(() => ({}))
    setInvitees(r.invitees ?? [])
    load()
  }

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
    const body = { invitees: draft.id ? undefined : (draft.invitees ?? []), title: draft.title, type: draft.type, starts_at, ends_at, all_day: draft.allDay || !draft.time, modality: draft.modality || null, location: draft.location || null, link: draft.link || null, description: draft.description || null, visibility: draft.visibility }
    const res = await fetch(draft.id ? `/api/events/${draft.id}` : '/api/events', { method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Não deu pra salvar.'); return }
    if (!draft.id && data.invited) setNotice(`Evento criado. ${data.invited} convite${data.invited === 1 ? '' : 's'} enviado${data.invited === 1 ? '' : 's'} (${data.notified?.email ?? 0} por e-mail, ${data.notified?.whatsapp ?? 0} por WhatsApp)`)
    setDraft(null); setOpen(null); load()
  }

  async function rsvp(e: EventRow, status: RsvpStatus) {
    await fetch(`/api/events/${e.id}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    load()
  }

  async function cancel(e: EventRow) {
    if (!window.confirm(`Excluir "${e.title}"? Ele some da agenda da rede.`)) return
    const res = await fetch(`/api/events/${e.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error ?? 'Não deu pra excluir.'); return }
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

      {notice && (
        <div onClick={() => setNotice(null)} style={{ margin: '10px 16px 0', padding: '8px 12px', borderRadius: 10, background: 'var(--tdgflow-gold-subtle)', border: '1px solid var(--tdgflow-gold-dim)', fontSize: '0.75rem', color: 'var(--tdgflow-text-primary)', cursor: 'pointer' }}>{notice}</div>
      )}
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
            </div>

            {/* Agenda pessoal */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem' }}>
              <CalendarPlus size={13} style={{ color: 'var(--tdgflow-text-muted)' }} />
              <a href={googleCalendarUrl(open, window.location.origin)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tdgflow-navy)' }}>Google</a>
              <a href={outlookCalendarUrl(open, window.location.origin)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tdgflow-navy)' }}>Outlook</a>
              {open.visibility === 'rede' && <a href={`/api/events/${open.id}/ics`} style={{ color: 'var(--tdgflow-navy)' }}>Apple / arquivo .ics</a>}
            </div>

            {/* Convidados */}
            <div style={{ borderTop: '1px solid var(--tdgflow-border)', paddingTop: 10 }}>
              <p style={{ ...label, marginBottom: 6 }}>Convidados ({invitees.length})</p>
              {invitees.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', marginBottom: 6 }}>Ninguém convidado ainda.</p>}
              <div style={{ maxHeight: 140, overflowY: 'auto', marginBottom: 8 }}>
                {invitees.map(i => (
                  <p key={i.user_id} style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ flex: 1 }}>{i.name}{i.agency_name ? <span style={{ color: 'var(--tdgflow-text-muted)' }}> · {i.agency_name}</span> : null}</span>
                    {i.email_sent && <Mail size={11} style={{ color: 'var(--tdgflow-text-muted)' }} />}
                    {i.whatsapp_sent && <MessageCircle size={11} style={{ color: 'var(--tdgflow-text-muted)' }} />}
                    <span style={{ fontWeight: 600, color: i.rsvp === 'vou' ? 'var(--tdgflow-gold-dim)' : 'var(--tdgflow-text-muted)' }}>{i.rsvp ? RSVP_LABELS[i.rsvp] : 'sem resposta'}</span>
                  </p>
                ))}
              </div>
              <PeoplePicker people={people.filter(p => !invitees.some(i => i.user_id === p.id))} search={pickSearch} onSearch={setPickSearch} onConfirm={ids => inviteMore(open, ids)} busy={inviting} confirmLabel="Convidar e avisar" />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--tdgflow-border)', paddingTop: 10 }}>
              <button onClick={() => { setDraft(draftFrom(open, true)); setOpen(null) }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }}><Copy size={12} /> Duplicar</button>
              {open.can_edit && <>
                <button onClick={() => setDraft(draftFrom(open))} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px', marginLeft: 'auto' }}><Pencil size={12} /> Editar</button>
                <button onClick={() => cancel(open)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px', color: '#B91C1C' }}><Trash2 size={12} /> Excluir</button>
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
            {!draft.id && (
              <div>
                <p style={{ ...label, marginBottom: 6 }}>Convidar ({(draft.invitees ?? []).length}) — recebem e-mail e WhatsApp</p>
                <PeoplePicker people={people} search={pickSearch} onSearch={setPickSearch} selected={draft.invitees ?? []} onChange={ids => setDraft({ ...draft, invitees: ids })} />
              </div>
            )}
            {error && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>}
            <button onClick={save} disabled={saving} className="btn-gold" style={{ fontSize: '0.8125rem', padding: '9px 14px' }}>{saving ? <Loader2 size={13} className="animate-spin" /> : null} {draft.id ? 'Salvar' : 'Criar evento'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* Seletor de pessoas da rede, agrupado por agência; "toda a agência" num toque.
   Dois modos: controlado (selected/onChange, no formulário) ou com botão de
   confirmar (onConfirm, na ficha). */
function PeoplePicker({ people, search, onSearch, selected, onChange, onConfirm, busy, confirmLabel }: {
  people: Person[]; search: string; onSearch: (s: string) => void
  selected?: string[]; onChange?: (ids: string[]) => void
  onConfirm?: (ids: string[]) => void; busy?: boolean; confirmLabel?: string
}) {
  const [local, setLocal] = useState<string[]>([])
  const sel = selected ?? local
  const set = (ids: string[]) => (onChange ? onChange(ids) : setLocal(ids))
  const q = search.trim().toLowerCase()
  const shown = people.filter(p => !q || p.name.toLowerCase().includes(q) || (p.agency_name ?? '').toLowerCase().includes(q))
  const groups = new Map<string, Person[]>()
  for (const p of shown) { const k = p.agency_name ?? 'Bemgsy'; groups.set(k, [...(groups.get(k) ?? []), p]) }
  const toggle = (id: string) => set(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  const toggleGroup = (ids: string[]) => { const all = ids.every(id => sel.includes(id)); set(all ? sel.filter(x => !ids.includes(x)) : Array.from(new Set([...sel, ...ids]))) }
  return (
    <div>
      <input className="input" placeholder="Buscar pessoa ou agência" value={search} onChange={e => onSearch(e.target.value)} style={{ fontSize: '0.75rem', marginBottom: 6 }} />
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--tdgflow-border)', borderRadius: 8, padding: '4px 8px' }}>
        {people.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--tdgflow-text-muted)', padding: 4 }}>Todo mundo já foi convidado.</p>}
        {[...groups.entries()].map(([agency, ps]) => (
          <div key={agency} style={{ marginBottom: 4 }}>
            <button type="button" onClick={() => toggleGroup(ps.map(p => p.id))} style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tdgflow-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              {agency} {ps.length > 1 ? '· toda a agência' : ''}
            </button>
            {ps.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--tdgflow-text-secondary)', padding: '2px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} /> {p.name}
              </label>
            ))}
          </div>
        ))}
      </div>
      {onConfirm && (
        <button type="button" disabled={busy || sel.length === 0} onClick={() => { onConfirm(sel); setLocal([]) }} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} {confirmLabel ?? 'Convidar'} {sel.length > 0 ? `(${sel.length})` : ''}
        </button>
      )}
    </div>
  )
}
