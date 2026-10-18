/* Agenda da rede — acesso ao banco. Só o servidor importa. */
import { sql } from '@vercel/postgres'
import { brDay, type EventFields, type EventRow, type RsvpStatus } from '@/lib/events'

export type Viewer = { id: string; email: string; agencyId: string | null; isAdmin: boolean; name: string }

export async function viewerFromSession(email: string): Promise<Viewer | null> {
  const { rows } = await sql`SELECT id, name, role, agency_id FROM tdg_users WHERE email = ${email} LIMIT 1`
  if (!rows[0]) return null
  return { id: rows[0].id as string, email, name: (rows[0].name as string) ?? email, agencyId: (rows[0].agency_id as string | null) ?? null, isAdmin: rows[0].role === 'admin' }
}

const COLS = (viewerId: string | null) => `
  e.id, e.title, e.type, e.starts_at::text AS starts_at, e.ends_at::text AS ends_at, e.all_day, e.modality, e.location, e.link,
  e.description, e.hotel_id, e.visibility, e.agency_id, e.created_by, e.created_by_name, e.created_via, e.created_at::text AS created_at,
  e.cancelled_at::text AS cancelled_at,
  (SELECT count(*)::int FROM tdg_event_rsvps r WHERE r.event_id = e.id AND r.status = 'vou') AS rsvp_vou,
  (SELECT count(*)::int FROM tdg_event_rsvps r WHERE r.event_id = e.id AND r.status = 'talvez') AS rsvp_talvez,
  ${viewerId ? `(SELECT status FROM tdg_event_rsvps r WHERE r.event_id = e.id AND r.user_id = '${viewerId}')` : 'NULL'} AS my_rsvp`

/* O que a pessoa vê: eventos da rede + os da própria agência. */
const VISIBLE = (agencyId: string | null) => agencyId ? `(e.visibility = 'rede' OR e.agency_id = '${agencyId}')` : `e.visibility = 'rede'`

function withCanEdit(rows: Record<string, unknown>[], viewer: Viewer | null): EventRow[] {
  return rows.map(r => ({ ...(r as unknown as EventRow), can_edit: !!viewer && (viewer.isAdmin || r.created_by === viewer.email) }))
}

export async function listEvents(viewer: Viewer, range: { from: string; to: string }, includeCancelled = false): Promise<EventRow[]> {
  const { rows } = await sql.query(
    `SELECT ${COLS(viewer.id)} FROM tdg_events e
      WHERE ${VISIBLE(viewer.agencyId)} AND e.starts_at >= $1 AND e.starts_at < $2 ${includeCancelled ? '' : 'AND e.cancelled_at IS NULL'}
      ORDER BY e.starts_at`,
    [range.from, range.to],
  )
  return withCanEdit(rows, viewer)
}

export async function getEvent(id: string, viewer: Viewer | null): Promise<EventRow | null> {
  const { rows } = await sql.query(`SELECT ${COLS(viewer?.id ?? null)} FROM tdg_events e WHERE e.id = $1`, [id])
  return rows[0] ? withCanEdit(rows, viewer)[0] : null
}

export async function createEvent(f: EventFields, by: { email: string; name: string; agencyId: string | null }, via: 'flow' | 'max' = 'flow'): Promise<EventRow> {
  const { rows } = await sql.query(
    `INSERT INTO tdg_events (title, type, starts_at, ends_at, all_day, modality, location, link, description, hotel_id, visibility, agency_id, created_by, created_by_name, created_via, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $13) RETURNING id`,
    [f.title, f.type, f.starts_at, f.ends_at, f.all_day, f.modality, f.location, f.link, f.description, f.hotel_id, f.visibility, by.agencyId, by.email, by.name, via],
  )
  return (await getEvent(rows[0].id as string, null))!
}

type Fail = { ok: false; status: 403 | 404; error: string }

export async function updateEvent(id: string, f: EventFields, viewer: Viewer): Promise<Fail | { ok: true; event: EventRow }> {
  const cur = await getEvent(id, viewer)
  if (!cur || cur.cancelled_at) return { ok: false, status: 404, error: 'Evento não encontrado' }
  if (!cur.can_edit) return { ok: false, status: 403, error: 'Só quem criou o evento (ou admin) edita' }
  await sql.query(
    `UPDATE tdg_events SET title=$2, type=$3, starts_at=$4, ends_at=$5, all_day=$6, modality=$7, location=$8, link=$9, description=$10, hotel_id=$11, visibility=$12, updated_at=now(), updated_by=$13 WHERE id=$1`,
    [id, f.title, f.type, f.starts_at, f.ends_at, f.all_day, f.modality, f.location, f.link, f.description, f.hotel_id, f.visibility, viewer.email],
  )
  return { ok: true, event: (await getEvent(id, viewer))! }
}

export async function cancelEvent(id: string, viewer: Viewer): Promise<Fail | { ok: true }> {
  const cur = await getEvent(id, viewer)
  if (!cur || cur.cancelled_at) return { ok: false, status: 404, error: 'Evento não encontrado' }
  if (!cur.can_edit) return { ok: false, status: 403, error: 'Só quem criou o evento (ou admin) cancela' }
  await sql`UPDATE tdg_events SET cancelled_at = now(), cancelled_by = ${viewer.email} WHERE id = ${id}`
  return { ok: true }
}

export async function setRsvp(eventId: string, userId: string, status: RsvpStatus): Promise<boolean> {
  const { rows } = await sql`SELECT 1 FROM tdg_events WHERE id = ${eventId} AND cancelled_at IS NULL`
  if (!rows.length) return false
  await sql`INSERT INTO tdg_event_rsvps (event_id, user_id, status) VALUES (${eventId}, ${userId}, ${status})
            ON CONFLICT (event_id, user_id) DO UPDATE SET status = ${status}, updated_at = now()`
  return true
}

export async function listRsvps(eventId: string): Promise<{ name: string; agency_name: string | null; status: RsvpStatus }[]> {
  const { rows } = await sql`SELECT u.name, u.agency_name, r.status FROM tdg_event_rsvps r JOIN tdg_users u ON u.id = r.user_id WHERE r.event_id = ${eventId} ORDER BY r.status, u.name`
  return rows as { name: string; agency_name: string | null; status: RsvpStatus }[]
}

/* Pros crons do Max: eventos da rede num intervalo de dias de Brasília. */
export async function networkEventsOnDays(fromDay: string, toDayExclusive: string): Promise<EventRow[]> {
  const { rows } = await sql.query(
    `SELECT ${COLS(null)} FROM tdg_events e
      WHERE e.visibility = 'rede' AND e.cancelled_at IS NULL
        AND e.starts_at >= ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND e.starts_at <  ($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY e.starts_at`,
    [fromDay, toDayExclusive],
  )
  return withCanEdit(rows, null)
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}
export function todayBr(now = new Date()): string { return brDay(now) }
