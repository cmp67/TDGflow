import { describe, it, expect } from 'vitest'
import { parseUazapiWebhook, isMentioned, stripMention, phoneOfJid, learnInstanceLid } from './webhook'

const base = { EventType: 'messages', owner: '5511999990000@s.whatsapp.net', token: 'tok', message: { id: 'ABC', messageid: 'ABC', chatid: '5511888887777@s.whatsapp.net', sender: '5511888887777@s.whatsapp.net', senderName: 'Dani', fromMe: false, isGroup: false, text: 'oi max', messageTimestamp: 1760600000 } }

describe('parseUazapiWebhook', () => {
  it('lê mensagem individual: telefone do chat, menção implícita', () => {
    const m = parseUazapiWebhook(base)!
    expect(m).toMatchObject({ instanceToken: 'tok', ownerPhone: '5511999990000', messageId: 'ABC', chatId: '5511888887777@s.whatsapp.net', senderPhone: '5511888887777', senderName: 'Dani', isGroup: false, mentioned: true })
    expect(m.at.toISOString().startsWith('2025') || m.at.getTime() === 1760600000 * 1000).toBe(true)
  })
  it('ignora eco, evento sem texto e evento de outro tipo', () => {
    expect(parseUazapiWebhook({ ...base, message: { ...base.message, fromMe: true } })).toBeNull()
    expect(parseUazapiWebhook({ ...base, message: { ...base.message, text: '  ' } })).toBeNull()
    expect(parseUazapiWebhook({ ...base, EventType: 'presence' })).toBeNull()
    expect(parseUazapiWebhook('x')).toBeNull()
  })
  it('grupo: remetente é o participante; mencionado só com @número, @max ou "max,"', () => {
    const g = { ...base, message: { ...base.message, chatid: '120363412251837385@g.us', isGroup: true, sender: '5551981477111@s.whatsapp.net', text: 'alguém conhece o Txai?' } }
    const m = parseUazapiWebhook(g)!
    expect(m.isGroup).toBe(true); expect(m.senderPhone).toBe('5551981477111'); expect(m.mentioned).toBe(false)
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: '@5511999990000 conhece o Txai?' } })!.mentioned).toBe(true)
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: 'Max, conhece o Txai?' } })!.mentioned).toBe(true)
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: 'conhece o Txai?', mentionedJid: ['5511999990000@s.whatsapp.net'] } })!.mentioned).toBe(true)
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: 'o máximo que vi foi isso' } })!.mentioned).toBe(false)
  })
})

describe('isMentioned / stripMention', () => {
  it('tira a menção e normaliza espaços', () => {
    expect(stripMention('@5511999990000  conhece o Txai?', '5511999990000')).toBe('conhece o Txai?')
    expect(stripMention('Max, conhece o Txai?', null)).toBe('conhece o Txai?')
    expect(stripMention('@max registra: Vila Joya ótimo', null)).toBe('registra: Vila Joya ótimo')
    expect(isMentioned('bom dia', null, [])).toBe(false)
  })
})

/* LID (18/10/2026): o WhatsApp passou a mandar remetentes como `<15 dígitos>@lid`.
   Dígitos de LID nunca são telefone — iam pra findUserByPhone e nunca batiam
   ("número não registrado"). O contrato da uazapi traz `sender_pn` (JID PN
   resolvido) e `sender_lid`; o parser prefere sender_pn e só aceita
   @s.whatsapp.net como telefone. */
describe('LID: telefone só de JID @s.whatsapp.net, preferindo sender_pn', () => {
  const g = { ...base, message: { ...base.message, chatid: '120363412251837385@g.us', isGroup: true, text: 'Max, quem sou eu?' } }
  it('grupo com sender @lid e sender_pn → telefone vem do sender_pn', () => {
    const m = parseUazapiWebhook({ ...g, message: { ...g.message, sender: '123456789012345@lid', sender_pn: '5551981477111@s.whatsapp.net', sender_lid: '123456789012345@lid' } })!
    expect(m.senderPhone).toBe('5551981477111')
    expect(m.senderJid).toBe('123456789012345@lid')
    expect(m.jidKind).toBe('lid')
  })
  it('privado com chatid @lid e sender_pn → telefone do sender_pn; chatId fica como veio (destino opaco)', () => {
    const m = parseUazapiWebhook({ ...base, message: { ...base.message, chatid: '123456789012345@lid', sender: '123456789012345@lid', sender_pn: '5511888887777@s.whatsapp.net' } })!
    expect(m.senderPhone).toBe('5511888887777')
    expect(m.chatId).toBe('123456789012345@lid')
  })
  it('grupo com sender @lid SEM sender_pn → mensagem válida, mas sem telefone (nunca os dígitos do LID)', () => {
    const m = parseUazapiWebhook({ ...g, message: { ...g.message, sender: '123456789012345@lid' } })!
    expect(m).not.toBeNull()
    expect(m.senderPhone).toBeNull()
    expect(m.senderJid).toBe('123456789012345@lid')
    expect(m.jidKind).toBe('lid')
    expect(m.hasSenderPn).toBe(false)
  })
  it('caso atual (sender @s.whatsapp.net, sem sender_pn) continua igual', () => {
    const m = parseUazapiWebhook(base)!
    expect(m.senderPhone).toBe('5511888887777'); expect(m.jidKind).toBe('pn'); expect(m.hasSenderPn).toBe(false)
  })
  it('sender_pn vence o sender mesmo quando os dois são PN', () => {
    const m = parseUazapiWebhook({ ...g, message: { ...g.message, sender: '5511000000000@s.whatsapp.net', sender_pn: '5551981477111@s.whatsapp.net' } })!
    expect(m.senderPhone).toBe('5551981477111')
  })
  it('menção por toque aparece no texto como "@Max …" em qualquer posição', () => {
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: 'Viu @⁨Max TDG FLOW⁩ ?' } })!.mentioned).toBe(true)
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: 'Dica top @Max TDG FLOW' } })!.mentioned).toBe(true)
    expect(parseUazapiWebhook({ ...g, message: { ...g.message, text: 'o máximo que vi' } })!.mentioned).toBe(false)
  })
})

describe('phoneOfJid', () => {
  it('só @s.whatsapp.net vira telefone; @lid e @g.us dão null', () => {
    expect(phoneOfJid('5511888887777@s.whatsapp.net')).toBe('5511888887777')
    expect(phoneOfJid('5511888887777:12@s.whatsapp.net')).toBe('5511888887777')
    expect(phoneOfJid('123456789012345@lid')).toBeNull()
    expect(phoneOfJid('120363412251837385@g.us')).toBeNull()
    expect(phoneOfJid('')).toBeNull()
  })
})

/* Menção por toque com LID (18/10/2026, teste no grupo pequeno): o texto bruto
   de "@Max TDGflow pergunta" chega como "@<lid> pergunta" e mentionedJid traz
   "<lid>@lid" — o LID do Max, não o número da instância. */
describe('menção por toque com o LID da instância', () => {
  const g = { ...base, message: { ...base.message, chatid: '120363412251837385@g.us', isGroup: true, sender: '5551981477111@s.whatsapp.net' } }
  const LID = '123456789012345'
  it('isMentioned aceita o LID em mentionedJid e no texto, quando o LID é conhecido', () => {
    expect(isMentioned(`@${LID} quem sou eu?`, '5511999990000', [`${LID}@lid`], LID)).toBe(true)
    expect(isMentioned('quem sou eu?', '5511999990000', [`${LID}@lid`], LID)).toBe(true)
    expect(isMentioned(`@${LID} quem sou eu?`, '5511999990000', [`${LID}@lid`], null)).toBe(false)
    expect(isMentioned('@999 oi', '5511999990000', ['999@lid'], LID)).toBe(false)
  })
  it('o parser expõe mentionedJids pra rota decidir com o LID conhecido; stripMention tira "@<lid>"', () => {
    const m = parseUazapiWebhook({ ...g, message: { ...g.message, text: `@${LID} quem sou eu?`, content: { contextInfo: { mentionedJid: [`${LID}@lid`] } } } })!
    expect(m.mentionedJids).toEqual([`${LID}@lid`])
    expect(m.mentioned).toBe(false)
    expect(stripMention(`@${LID} quem sou eu?`, '5511999990000', LID)).toBe('quem sou eu?')
  })
  it('aprende o LID da instância pelas mensagens que o próprio Max manda (fromMe + sender_lid)', () => {
    expect(learnInstanceLid({ EventType: 'messages', owner: '5511999990000@s.whatsapp.net', message: { fromMe: true, sender: '5511999990000@s.whatsapp.net', sender_lid: `${LID}@lid`, text: 'oi' } })).toBe(LID)
    expect(learnInstanceLid({ EventType: 'messages', message: { fromMe: false, sender_lid: `${LID}@lid` } })).toBeNull()
    expect(learnInstanceLid({ EventType: 'messages', message: { fromMe: true } })).toBeNull()
  })
})
