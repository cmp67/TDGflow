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
  ${viewerId ? `(SELECT status FROM tdg_event_rsvps r WHERE r.event_id = e.id AND r.user_id = '${viewerId}')` : 'NULL'} AS my_rsvp,
  ${viewerId ? `EXISTS (SELECT 1 FROM tdg_event_invites i WHERE i.event_id = e.id AND i.user_id = '${viewerId}')` : 'false'} AS invited,
  (SELECT count(*)::int FROM tdg_event_invites i WHERE i.event_id = e.id) AS invite_count`

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

/* ── Convites ─────────────────────────────────────────────────────── */
export type Person = { id: string; name: string; agency_name: string | null; agency_id: string | null; email: string; whatsapp: string | null }

/* Pessoas da rede pra convidar: usuárias ativas das agências reais (sem teste, sem __TDD) e admins. */
export async function listNetworkPeople(): Promise<Omit<Person, 'email' | 'whatsapp'>[]> {
  const { rows } = await sql`
    SELECT u.id, u.name, coalesce(a.name, u.agency_name) AS agency_name, u.agency_id
    FROM tdg_users u LEFT JOIN tdg_agencies a ON a.id = u.agency_id
    WHERE u.active AND u.email NOT ILIKE '%example.com' AND coalesce(u.name, '') NOT ILIKE '\\_\\_TDD%'
      AND (u.role = 'admin' OR (a.active AND NOT a.is_test AND a.name NOT LIKE '\\_\\_TDD%'))
    ORDER BY agency_name NULLS FIRST, u.name`
  return rows as Omit<Person, 'email' | 'whatsapp'>[]
}

/* Grava os convites; devolve só quem foi convidado AGORA (pra não reenviar aviso). */
export async function inviteUsers(eventId: string, userIds: string[], invitedBy: string): Promise<Person[]> {
  const ids = Array.from(new Set(userIds)).slice(0, 200)
  if (!ids.length) return []
  const { rows } = await sql.query(
    `WITH ins AS (
       INSERT INTO tdg_event_invites (event_id, user_id, invited_by)
       SELECT $1, u.id, $3 FROM tdg_users u WHERE u.id = ANY($2) AND u.active
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING user_id)
     SELECT u.id, u.name, u.agency_name, u.agency_id, u.email, u.whatsapp FROM ins JOIN tdg_users u ON u.id = ins.user_id`,
    [eventId, ids, invitedBy],
  )
  return rows as Person[]
}

export async function markNotified(eventId: string, userId: string, channel: 'email' | 'whatsapp'): Promise<void> {
  if (channel === 'email') await sql`UPDATE tdg_event_invites SET notified_email_at = now() WHERE event_id = ${eventId} AND user_id = ${userId}`
  else await sql`UPDATE tdg_event_invites SET notified_whatsapp_at = now() WHERE event_id = ${eventId} AND user_id = ${userId}`
}

export async function listInvitees(eventId: string): Promise<{ user_id: string; name: string; agency_name: string | null; rsvp: RsvpStatus | null; email_sent: boolean; whatsapp_sent: boolean }[]> {
  const { rows } = await sql`
    SELECT i.user_id, u.name, u.agency_name, r.status AS rsvp, (i.notified_email_at IS NOT NULL) AS email_sent, (i.notified_whatsapp_at IS NOT NULL) AS whatsapp_sent
    FROM tdg_event_invites i JOIN tdg_users u ON u.id = i.user_id
    LEFT JOIN tdg_event_rsvps r ON r.event_id = i.event_id AND r.user_id = i.user_id
    WHERE i.event_id = ${eventId} ORDER BY u.name`
  return rows as { user_id: string; name: string; agency_name: string | null; rsvp: RsvpStatus | null; email_sent: boolean; whatsapp_sent: boolean }[]
}
