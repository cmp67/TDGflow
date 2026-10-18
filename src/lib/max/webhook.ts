/* Leitura tolerante do webhook da uazapi (evento `messages`), portada da TA
   Travel (supabase/functions/_shared/messaging/webhook-uazapi.ts). Campos:
   EventType, owner, token, message{id, messageid, chatid, sender, senderName,
   fromMe, isGroup, messageType, text, messageTimestamp, content}.
   Nunca guardar nem logar o payload inteiro (traz o token da instância). */

export type JidKind = 'pn' | 'lid' | 'other'

export interface MaxInbound {
  readonly instanceToken: string
  readonly ownerPhone: string | null      // número da instância (o Max)
  readonly messageId: string
  readonly chatId: string                 // como veio (@s.whatsapp.net, @g.us ou @lid) — destino opaco pra resposta
  readonly senderJid: string              // JID do remetente como veio
  readonly senderPhone: string | null     // dígitos do telefone REAL, só de JID @s.whatsapp.net; null com LID sem sender_pn
  readonly jidKind: JidKind
  readonly hasSenderPn: boolean
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

/* Telefone só sai de JID @s.whatsapp.net. @lid (identidade anônima do
   WhatsApp, 18/10/2026) e @g.us dão null — dígitos de LID nunca são telefone. */
export function phoneOfJid(jid: string): string | null {
  if (!/@s\.whatsapp\.net$/.test(jid)) return null
  const d = jid.split('@')[0].split(':')[0].replace(/\D/g, '')
  return d.length >= 8 ? d : null
}

export function jidKindOf(jid: string): JidKind {
  if (/@s\.whatsapp\.net$/.test(jid)) return 'pn'
  if (/@lid$/.test(jid)) return 'lid'
  return 'other'
}

function digitsOfJid(jid: string): string | null {
  const d = jid.split('@')[0].split(':')[0].replace(/\D/g, '')
  return d.length >= 8 ? d : null
}

function instant(v: unknown): Date {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return new Date()
  return new Date(n < MS_LIMIAR ? n * 1000 : n)
}

/* Menção ao Max em grupo: o número da instância na lista de mencionados ou no
   texto, "@Max" em qualquer posição (é como o WhatsApp renderiza a menção por
   toque, com isoladores U+2068/U+2069 em volta do nome), ou "Max,"/"max:" no
   início. Limitação conhecida: com LID, mentionedJid traz o LID do Max e o
   /instance/status não expõe esse LID — por isso a checagem pelo texto. */
export function isMentioned(text: string, ownerPhone: string | null, mentionedJids: string[]): boolean {
  if (ownerPhone && mentionedJids.some(j => digitsOfJid(j) === ownerPhone)) return true
  if (ownerPhone && text.includes(`@${ownerPhone}`)) return true
  return /@\u2068?max\b/i.test(text) || /^\s*@?max\b/i.test(text) || /\bmax[,:!?]\s/i.test(text.slice(0, 40))
}

/* Tira a menção do texto antes de mandar pro modelo. */
export function stripMention(text: string, ownerPhone: string | null): string {
  let t = text
  if (ownerPhone) t = t.replace(new RegExp(`@${ownerPhone}\\b`, 'g'), ' ')
  t = t.replace(/@\u2068[^\u2069]*\u2069/g, ' ')          // menção por toque: @⁨Max TDG FLOW⁩
  t = t.replace(/@max(\s+tdg\s+flow)?\b/gi, ' ')           // menção digitada
  t = t.replace(/^\s*@?max\b[,:!]?\s*/i, '')
  return t.replace(/\s+/g, ' ').trim()
}

export function parseUazapiWebhook(payload: unknown): MaxInbound | null {
  if (!isRecord(payload) || payload.EventType !== 'messages' || !isRecord(payload.message)) return null
  const m = payload.message
  if (m.fromMe === true) return null
  const text = str(m.text).trim()
  if (!text) return null
  const chatId = str(m.chatid)
  const isGroup = m.isGroup === true || chatId.endsWith('@g.us')
  // Ordem de preferência pro telefone: sender_pn → sender (só PN) → chatid
  // (só em privado e só PN). LID nunca vira telefone.
  const senderPn = str(m.sender_pn)
  const sender = str(m.sender) || (isGroup ? '' : chatId)
  const senderJid = str(m.sender_lid) || sender || chatId
  const senderPhone = phoneOfJid(senderPn) ?? phoneOfJid(sender) ?? (isGroup ? null : phoneOfJid(chatId))
  const messageId = str(m.messageid) || str(m.id)
  if (!messageId || !chatId || !senderJid) return null
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
    senderJid,
    senderPhone,
    jidKind: jidKindOf(senderJid),
    hasSenderPn: !!senderPn,
    senderName: str(m.senderName) || null,
    isGroup,
    text,
    mentioned: !isGroup || isMentioned(text, ownerPhone, mentionedJids),
    at: instant(m.messageTimestamp),
  }
}
