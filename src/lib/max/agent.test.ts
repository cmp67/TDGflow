import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { runMax, toWhatsApp, bindToolsToUser, MAX_TOOL_ROUNDS } from './agent'

const user = { id: 'u1', name: 'Dani Filippozzi', email: 'dani@example.com', agency_name: 'NZ Viagens', agency_id: null, role: 'agent', active: true }
const msg = (content: Anthropic.ContentBlock[], stop: Anthropic.Message['stop_reason']): Anthropic.Message =>
  ({ id: 'm', type: 'message', role: 'assistant', model: 'x', content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } } as unknown as Anthropic.Message)

describe('toWhatsApp', () => {
  it('converte markdown pro WhatsApp', () => {
    expect(toWhatsApp('## Txai\n**ótimo** hotel\n• praia')).toBe('Txai\n*ótimo* hotel\n- praia')
  })
})

describe('bindToolsToUser', () => {
  it('register_tip sai sempre em nome de quem fala, mesmo que o modelo mande outro nome', async () => {
    const call = vi.fn().mockResolvedValue({ ok: true })
    await bindToolsToUser(user, call)('register_tip', { hotel_name: 'Vila Joya', agent_name: 'Carla', agency_name: 'Outra' })
    expect(call).toHaveBeenCalledWith('register_tip', { hotel_name: 'Vila Joya', agent_name: 'Dani Filippozzi', agency_name: 'NZ Viagens' })
    await bindToolsToUser(user, call)('search_reviews', { hotel_name: 'Txai' })
    expect(call).toHaveBeenLastCalledWith('search_reviews', { hotel_name: 'Txai' })
  })
})

describe('runMax', () => {
  it('roda a volta de ferramenta, inclui histórico e contexto da consultora no system', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(msg([{ type: 'tool_use', id: 't1', name: 'search_reviews', input: { hotel_name: 'Txai' } } as Anthropic.ToolUseBlock], 'tool_use'))
      .mockResolvedValueOnce(msg([{ type: 'text', text: 'A **Dani** disse que o Txai é ótimo.', citations: null } as Anthropic.TextBlock], 'end_turn'))
    const call = vi.fn().mockResolvedValue({ total_reviews: 1 })
    const r = await runMax({ create }, { identity: { user }, isGroup: true, text: 'o que a rede sabe do Txai?', history: [{ role: 'user', content: 'oi' }, { role: 'assistant', content: 'Oi, Dani!' }] }, call)
    expect(r.text).toBe('A *Dani* disse que o Txai é ótimo.')
    expect(r.toolCalls).toEqual(['search_reviews'])
    expect(r.tokensIn).toBe(20)
    const first = create.mock.calls[0][0]
    expect(first.system).toContain('<papel>')
    expect(first.system).toContain('Dani Filippozzi')
    expect(first.system).toContain('grupo da TDG')
    expect(first.messages).toHaveLength(3)
    const second = create.mock.calls[1][0]
    expect(second.messages[3].role).toBe('assistant')
    expect(second.messages[4].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 't1' })
    expect(JSON.parse(second.messages[4].content[0].content)).toEqual({ total_reviews: 1 })
  })

  it('para no limite de voltas e responde com o último texto', async () => {
    const create = vi.fn().mockResolvedValue(msg([{ type: 'text', text: 'buscando…', citations: null } as Anthropic.TextBlock, { type: 'tool_use', id: 't', name: 'search_reviews', input: {} } as Anthropic.ToolUseBlock], 'tool_use'))
    const r = await runMax({ create }, { identity: { user }, isGroup: false, text: 'x', history: [] }, vi.fn().mockResolvedValue({}))
    expect(create).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1)
    expect(r.text).toBe('buscando…')
  })

  it('erro de ferramenta vira tool_result com error, não derruba a conversa', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(msg([{ type: 'tool_use', id: 't1', name: 'get_review', input: {} } as Anthropic.ToolUseBlock], 'tool_use'))
      .mockResolvedValueOnce(msg([{ type: 'text', text: 'Não achei.', citations: null } as Anthropic.TextBlock], 'end_turn'))
    const r = await runMax({ create }, { identity: { user }, isGroup: false, text: 'x', history: [] }, vi.fn().mockRejectedValue(new Error('boom')))
    expect(JSON.parse(create.mock.calls[1][0].messages[2].content[0].content)).toEqual({ error: 'boom' })
    expect(r.text).toBe('Não achei.')
  })
})

describe('runMax — pessoa não identificada e ferramentas do Central', () => {
  it('sem cadastro: register_tip some das ferramentas, contexto diz pra nunca recusar', async () => {
    const create = vi.fn().mockResolvedValueOnce(msg([{ type: 'text', text: 'Oi!', citations: null } as Anthropic.TextBlock], 'end_turn'))
    await runMax({ create }, { identity: { user: null, senderName: 'Bia' }, isGroup: false, text: 'oi', history: [] }, vi.fn())
    const p = create.mock.calls[0][0]
    expect(p.tools.map((t: { name: string }) => t.name)).not.toContain('register_tip')
    expect(p.system).toContain('NUNCA diga que não está cadastrada')
    expect(p.system).toContain('Bia')
  })
  it('ferramentas extras do Central entram na lista e são roteadas pro Central', async () => {
    const create = vi.fn().mockResolvedValueOnce(msg([{ type: 'text', text: 'ok', citations: null } as Anthropic.TextBlock], 'end_turn'))
    const extra = [{ name: 'search_materials', description: 'm', input_schema: { type: 'object' as const, properties: {} } }]
    await runMax({ create }, { identity: { user }, isGroup: false, text: 'x', history: [], extraTools: extra }, vi.fn())
    expect(create.mock.calls[0][0].tools.map((t: { name: string }) => t.name)).toContain('search_materials')
    const call = vi.fn().mockResolvedValue({})
    await bindToolsToUser(user, call, null)('search_materials', { query: 'kids' })
    expect(call).not.toHaveBeenCalled()
  })
})

describe('ferramentas de agenda no Max', () => {
  it('identificada vê list_events, register_event e rsvp_event; não identificada só list_events', async () => {
    const create = vi.fn().mockResolvedValue(msg([{ type: 'text', text: 'ok', citations: null } as Anthropic.TextBlock], 'end_turn'))
    await runMax({ create }, { identity: { user }, isGroup: false, text: 'x', history: [] }, vi.fn())
    const names = create.mock.calls[0][0].tools.map((t: { name: string }) => t.name)
    expect(names).toEqual(expect.arrayContaining(['list_events', 'register_event', 'rsvp_event']))
    await runMax({ create }, { identity: { user: null, senderName: null }, isGroup: false, text: 'x', history: [] }, vi.fn())
    const anon = create.mock.calls[1][0].tools.map((t: { name: string }) => t.name)
    expect(anon).toContain('list_events'); expect(anon).not.toContain('register_event')
  })
})
