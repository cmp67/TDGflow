import { describe, it, expect, afterAll } from 'vitest'
import { sql } from '@vercel/postgres'
import { rememberInbound, rememberOutbound, recentTurns } from './memory'

const suffix = Date.now()
const chat = `__tdd_chat_${suffix}@g.us`

afterAll(async () => { await sql`DELETE FROM tdg_max_messages WHERE chat_id = ${chat}` })

describe('memória do Max', () => {
  it('idempotente por message_id; histórico em ordem; em grupo só a mesma pessoa + Max', async () => {
    expect(await rememberInbound({ messageId: `m1-${suffix}`, chatId: chat, isGroup: true, senderPhone: '5511111111111', userId: null, content: 'oi max' })).toBe(true)
    expect(await rememberInbound({ messageId: `m1-${suffix}`, chatId: chat, isGroup: true, senderPhone: '5511111111111', userId: null, content: 'oi max' })).toBe(false)
    await rememberOutbound({ messageId: `o1-${suffix}`, chatId: chat, isGroup: true, userId: null, content: 'Oi!', tokensIn: 1, tokensOut: 1 })
    await rememberInbound({ messageId: `m2-${suffix}`, chatId: chat, isGroup: true, senderPhone: '5522222222222', userId: null, content: 'outra pessoa' })
    const turns = await recentTurns(chat, '5511111111111', true)
    expect(turns).toEqual([{ role: 'user', content: 'oi max' }, { role: 'assistant', content: 'Oi!' }])
    const all = await recentTurns(chat, '5522222222222', false)
    expect(all).toHaveLength(3)
  })
})
