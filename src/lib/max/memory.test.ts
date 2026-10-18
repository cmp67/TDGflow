import { describe, it, expect, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { rememberInbound, rememberOutbound, recentTurns, knownInstanceLid, isMaxOutbound } from './memory'

const suffix = Date.now()
const chat = `__tdd_chat_${suffix}@g.us`

afterAll(async () => { await sql`DELETE FROM tdg_max_messages WHERE chat_id = ${chat}` })

describe('memória do Max', () => {
  it('idempotente por message_id; histórico em ordem; em grupo só a mesma pessoa + Max', async () => {
    expect(await rememberInbound({ messageId: `m1-${suffix}`, chatId: chat, isGroup: true, senderPhone: '5511111111111', senderJid: '5511111111111@s.whatsapp.net', userId: null, content: 'oi max' })).toBe(true)
    expect(await rememberInbound({ messageId: `m1-${suffix}`, chatId: chat, isGroup: true, senderPhone: '5511111111111', senderJid: '5511111111111@s.whatsapp.net', userId: null, content: 'oi max' })).toBe(false)
    await rememberOutbound({ messageId: `o1-${suffix}`, chatId: chat, isGroup: true, userId: null, content: 'Oi!', tokensIn: 1, tokensOut: 1 })
    await rememberInbound({ messageId: `m2-${suffix}`, chatId: chat, isGroup: true, senderPhone: null, senderJid: '222222222222222@lid', userId: null, content: 'outra pessoa' })
    const turns = await recentTurns(chat, '5511111111111@s.whatsapp.net', true)
    expect(turns).toEqual([{ role: 'user', content: 'oi max' }, { role: 'assistant', content: 'Oi!' }])
    expect(await isMaxOutbound(`o1-${suffix}`)).toBe(true)
    expect(await isMaxOutbound(`m1-${suffix}`)).toBe(false)
    const all = await recentTurns(chat, '222222222222222@lid', false)
    expect(await recentTurns(chat, '222222222222222@lid', true)).toEqual([{ role: 'assistant', content: 'Oi!' }, { role: 'user', content: 'outra pessoa' }])
    expect(all).toHaveLength(3)
  })
})

describe('LID da instância', () => {
  it('env manual vence (só dígitos)', async () => {
    expect(await knownInstanceLid({ UAZAPI_INSTANCE_LID: '1234-5678@lid' })).toBe('12345678')
  })
})
