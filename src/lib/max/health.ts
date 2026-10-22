import { sql } from '@vercel/postgres'
import type { UazapiConfig } from './transport'

/* Saúde do Max pro heartbeat do Bemgsy Ops (22/10/2026, Carla: "esse tipo de
   problema eu preciso ser notificada no bemgsy ops"). Vai no campo
   `componentes`: peça com ok:false deixa o heartbeat `degraded`, e o Ops
   avisa no WhatsApp depois de 2 checks seguidos (~10 min), com o detalhe.
   Nada aqui lança, e o detalhe nunca leva token, número ou texto. */

export type Componente = { nome: string; ok: boolean; detalhe?: string }
export type Connection = { ok: boolean; detalhe?: string }

export const MAX_FAILURE_TEXT = 'Deu um problema aqui do meu lado. Tenta de novo em instantes?'

export async function instanceConnected(config: UazapiConfig, fetchImpl: typeof fetch = fetch): Promise<Connection> {
  try {
    const res = await fetchImpl(`${config.baseUrl}/instance/status`, { headers: { token: config.instanceToken }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { ok: false, detalhe: `uazapi respondeu ${res.status} ao status da instância` }
    const json = await res.json().catch(() => ({})) as Record<string, unknown>
    const inst = typeof json.instance === 'object' && json.instance !== null ? json.instance as Record<string, unknown> : {}
    const st = typeof json.status === 'object' && json.status !== null ? json.status as Record<string, unknown> : {}
    const state = typeof inst.status === 'string' ? inst.status : 'desconhecido'
    return st.connected === true || state === 'connected' ? { ok: true } : { ok: false, detalhe: `instância do Max ${state} no WhatsApp` }
  } catch (err) {
    return { ok: false, detalhe: `sem resposta da uazapi (${err instanceof Error ? err.name : 'erro'})` }
  }
}

export async function failuresLast15m(): Promise<number> {
  try {
    const { rows } = await sql`
      SELECT count(*)::int AS n FROM tdg_max_messages
      WHERE direction = 'out' AND content = ${MAX_FAILURE_TEXT} AND created_at > now() - interval '15 minutes'
    `
    return rows[0]?.n ?? 0
  } catch {
    return 0
  }
}

export function maxComponents(input: { connection: Connection | null; failuresLast15m: number }): Componente[] {
  if (!input.connection) return []
  const whatsapp: Componente = input.connection.ok ? { nome: 'whatsapp', ok: true } : { nome: 'whatsapp', ok: false, detalhe: input.connection.detalhe }
  const respostas: Componente = input.failuresLast15m > 0
    ? { nome: 'max_respostas', ok: false, detalhe: `Max respondeu "deu um problema" ${input.failuresLast15m}x nos últimos 15 min` }
    : { nome: 'max_respostas', ok: true }
  return [whatsapp, respostas]
}
