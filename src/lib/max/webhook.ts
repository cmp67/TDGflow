/* Leitura tolerante do webhook da uazapi (evento `messages`), portada da TA
   Travel (supabase/functions/_shared/messaging/webhook-uazapi.ts). Campos:
   EventType, owner, token, message{id, messageid, chatid, sender, senderName,
   fromMe, isGroup, messageType, text, messageTimestamp, content}.
   Nunca guardar nem logar o payload inteiro (traz o token da instância). */

export interface MaxInbound {
  readonly instanceToken: string
  readonly ownerPhone: string | null      // número da instância (o Max)
  readonly messageId: string
  readonly chatId: string
  readonly senderPhone: string            // dígitos, sem +
  readonly senderName: string | null
  readonly isGroup: boolean
  readonly text: string
  readonly mentioned: boolean             // em grupo: o Max foi marcado?
  readonly at: Date
}

type Rec = Record<string, unknown>
const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const MS_LIMIAR = 1e12

function digitsOfJid(jid: string): string | null {
  const d = jid.split('@')[0].split(':')[0].replace(/\D/g, '')
  return d.length >= 8 ? d : null
}

function instant(v: unknown): Date {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return new Date()
  return new Date(n < MS_LIMIAR ? n * 1000 : n)
}

/* Menção ao Max em grupo: o número da instância na lista de mencionados, ou
   "@max"/"max," no começo do texto (as pessoas escrevem assim no grupo). */
export function isMentioned(text: string, ownerPhone: string | null, mentionedJids: string[]): boolean {
  if (ownerPhone && mentionedJids.some(j => digitsOfJid(j) === ownerPhone)) return true
  if (ownerPhone && text.includes(`@${ownerPhone}`)) return true
  return /^\s*@?max\b/i.test(text) || /\bmax[,:!?]\s/i.test(text.slice(0, 40))
}

/* Tira a menção do texto antes de mandar pro modelo. */
export function stripMention(text: string, ownerPhone: string | null): string {
  let t = text
  if (ownerPhone) t = t.replace(new RegExp(`@${ownerPhone}\\b`, 'g'), ' ')
  t = t.replace(/^\s*@?max\b[,:!]?\s*/i, '')
  return t.replace(/\s+/g, ' ').trim()
}

export function parseUazapiWebhook(payload: unknown): MaxInbound | null {
  if (!isRecord(payload) || payload.EventType !== 'messages' || !isRecord(payload.message)) return null
  const m = payload.message
  if (m.fromMe === true) return null
  const text = str(m.text).trim()
  if (!text) return null
  const isGroup = m.isGroup === true || str(m.chatid).endsWith('@g.us')
  const senderPhone = digitsOfJid(isGroup ? str(m.sender) : (str(m.chatid) || str(m.sender)))
  const messageId = str(m.messageid) || str(m.id)
  const chatId = str(m.chatid)
  if (!senderPhone || !messageId || !chatId) return null
  const ownerPhone = digitsOfJid(str(payload.owner)) ?? null
  const content = isRecord(m.content) ? m.content : {}
  const ctx = isRecord(content.contextInfo) ? content.contextInfo : {}
  const mentionedRaw = (Array.isArray(m.mentionedJid) ? m.mentionedJid : Array.isArray(ctx.mentionedJid) ? ctx.mentionedJid : []) as unknown[]
  const mentionedJids = mentionedRaw.filter((x): x is string => typeof x === 'string')
  return {
    instanceToken: str(payload.token),
    ownerPhone,
    messageId,
    chatId,
    senderPhone,
    senderName: str(m.senderName) || null,
    isGroup,
    text,
    mentioned: !isGroup || isMentioned(text, ownerPhone, mentionedJids),
    at: instant(m.messageTimestamp),
  }
}
