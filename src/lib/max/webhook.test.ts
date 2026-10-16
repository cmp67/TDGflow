import { describe, it, expect } from 'vitest'
import { parseUazapiWebhook, isMentioned, stripMention } from './webhook'

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
