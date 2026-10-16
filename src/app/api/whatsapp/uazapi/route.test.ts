import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/max/identity', () => ({ findUserByPhone: vi.fn() }))
vi.mock('@/lib/max/memory', () => ({ rememberInbound: vi.fn(), rememberOutbound: vi.fn(), recentTurns: vi.fn() }))
vi.mock('@/lib/max/transport', async (orig) => ({ ...(await orig<typeof import('@/lib/max/transport')>()), sendWhatsAppText: vi.fn() }))
vi.mock('@/lib/max/agent', () => ({ runMax: vi.fn(), MAX_MODEL: 'test' }))
vi.mock('@/lib/max/central-mcp', () => ({ readCentralConfig: vi.fn().mockReturnValue(null), centralToolDefinitions: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/credits', () => ({ checkAndDeductCredits: vi.fn(), INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE', NO_AGENCY: 'NO_AGENCY' }))
vi.mock('@/lib/agency', () => ({ getAgencyId: vi.fn().mockResolvedValue('ag1') }))
vi.mock('@/lib/usage-log', () => ({ logUsage: vi.fn() }))

import { POST } from './route'
import { findUserByPhone } from '@/lib/max/identity'
import { rememberInbound, recentTurns } from '@/lib/max/memory'
import { sendWhatsAppText } from '@/lib/max/transport'
import { runMax } from '@/lib/max/agent'
import { checkAndDeductCredits } from '@/lib/credits'

const m = (f: unknown) => f as ReturnType<typeof vi.fn>
const user = { id: 'u1', name: 'Dani', email: 'dani@example.com', agency_name: 'NZ', role: 'agent', active: true }
const payload = (over: Record<string, unknown> = {}) => ({ EventType: 'messages', owner: '5511999990000@s.whatsapp.net', token: 'inst-token', message: { messageid: 'M1', chatid: '5551981477111@s.whatsapp.net', sender: '5551981477111@s.whatsapp.net', fromMe: false, isGroup: false, text: 'o que a rede sabe do Txai?', ...over } })
const req = (body: unknown, s = 'segredo') => new NextRequest(`http://localhost/api/whatsapp/uazapi?s=${s}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  vi.clearAllMocks()
  process.env.UAZAPI_WEBHOOK_SECRET = 'segredo'
  process.env.UAZAPI_BASE_URL = 'https://bemgsy.uazapi.com'
  process.env.UAZAPI_INSTANCE_TOKEN = 'inst-token'
  process.env.ANTHROPIC_API_KEY = 'x'
  m(findUserByPhone).mockResolvedValue(user)
  m(rememberInbound).mockResolvedValue(true)
  m(recentTurns).mockResolvedValue([])
  m(sendWhatsAppText).mockResolvedValue({ ok: true, messageId: 'OUT1' })
  m(runMax).mockResolvedValue({ text: 'O Txai é ótimo, segundo a Dani.', tokensIn: 1, tokensOut: 1, toolCalls: ['search_reviews'] })
  m(checkAndDeductCredits).mockResolvedValue({ ok: true, source: 'quota' })
})

describe('POST /api/whatsapp/uazapi — Max dentro do Flow', () => {
  it('segredo da URL errado → 401; token de instância errado → 401', async () => {
    expect((await POST(req(payload(), 'errado'))).status).toBe(401)
    expect((await POST(req({ ...payload(), token: 'outra' }))).status).toBe(401)
    expect(sendWhatsAppText).not.toHaveBeenCalled()
  })

  it('caminho feliz 1:1: debita Lumis antes, roda o agente e responde no chat', async () => {
    const res = await POST(req(payload()))
    expect(await res.json()).toEqual({ ok: true, sent: true })
    expect(checkAndDeductCredits).toHaveBeenCalledWith(expect.objectContaining({ agencyId: 'ag1', action: 'chat', userEmail: 'dani@example.com' }))
    expect(runMax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ identity: { user }, isGroup: false, text: 'o que a rede sabe do Txai?' }))
    expect(sendWhatsAppText).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ chatId: '5551981477111@s.whatsapp.net', text: 'O Txai é ótimo, segundo a Dani.' }))
  })

  it('grupo sem menção é ignorado sem tocar em nada; com menção, responde e tira a menção do texto', async () => {
    const g = { chatid: '120363412251837385@g.us', isGroup: true }
    expect(await (await POST(req(payload(g)))).json()).toEqual({ ok: true, ignored: 'grupo sem menção' })
    expect(findUserByPhone).not.toHaveBeenCalled()
    await POST(req(payload({ ...g, text: '@5511999990000 conhece o Txai?' })))
    expect(runMax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ isGroup: true, text: 'conhece o Txai?' }))
  })

  it('mensagem duplicada (reentrega) não roda de novo', async () => {
    m(rememberInbound).mockResolvedValue(false)
    expect(await (await POST(req(payload()))).json()).toEqual({ ok: true, ignored: 'duplicada' })
    expect(runMax).not.toHaveBeenCalled()
  })

  it('número sem cadastro é atendido (nunca recusa), sem Lumis e sem identidade', async () => {
    m(findUserByPhone).mockResolvedValue(null)
    await POST(req(payload()))
    expect(checkAndDeductCredits).not.toHaveBeenCalled()
    expect(runMax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ identity: { user: null, senderName: null } }))
    expect(m(sendWhatsAppText).mock.calls[0][1].text).toBe('O Txai é ótimo, segundo a Dani.')
  })

  it('sem Lumis: avisa e não chama a IA', async () => {
    m(checkAndDeductCredits).mockResolvedValue({ ok: false, reason: 'INSUFFICIENT_BALANCE' })
    await POST(req(payload()))
    expect(runMax).not.toHaveBeenCalled()
    expect(m(sendWhatsAppText).mock.calls[0][1].text).toContain('sem Lumis')
  })

  it('IA falhou: responde mensagem curta, nunca 500', async () => {
    m(runMax).mockRejectedValue(new Error('timeout'))
    const res = await POST(req(payload()))
    expect(res.status).toBe(200)
    expect(m(sendWhatsAppText).mock.calls[0][1].text).toContain('Tenta de novo')
  })
})
