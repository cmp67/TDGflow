import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/max/identity', () => ({ findUserByPhone: vi.fn() }))
vi.mock('@/lib/max/memory', () => ({ rememberInbound: vi.fn(), rememberOutbound: vi.fn(), recentTurns: vi.fn(), rememberInstanceLid: vi.fn(), knownInstanceLid: vi.fn().mockResolvedValue(null), isMaxOutbound: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/max/transport', async (orig) => ({ ...(await orig<typeof import('@/lib/max/transport')>()), sendWhatsAppText: vi.fn() }))
vi.mock('@/lib/max/agent', () => ({ runMax: vi.fn(), MAX_MODEL: 'test' }))
vi.mock('@/lib/max/central-mcp', () => ({ readCentralConfig: vi.fn().mockReturnValue(null), centralToolDefinitions: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/credits', () => ({ checkAndDeductCredits: vi.fn(), INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE', NO_AGENCY: 'NO_AGENCY' }))
vi.mock('@/lib/agency', () => ({ getAgencyId: vi.fn().mockResolvedValue('ag1') }))
vi.mock('@/lib/usage-log', () => ({ logUsage: vi.fn() }))

import { POST } from './route'
import { findUserByPhone } from '@/lib/max/identity'
import { rememberInbound, recentTurns, rememberInstanceLid, knownInstanceLid, isMaxOutbound } from '@/lib/max/memory'
import { sendWhatsAppText } from '@/lib/max/transport'
import { runMax } from '@/lib/max/agent'
import { checkAndDeductCredits } from '@/lib/credits'

const m = (f: unknown) => f as ReturnType<typeof vi.fn>
const user = { id: 'u1', name: 'Dani', email: 'dani@example.com', agency_name: 'NZ', agency_id: null, role: 'agent', active: true }
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
    expect(m(rememberInbound).mock.calls[0][0]).toMatchObject({ senderPhone: '5551981477111', senderJid: '5551981477111@s.whatsapp.net' })
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

describe('LID (18/10/2026)', () => {
  it('remetente @lid com sender_pn é identificado pelo telefone real; resposta vai pro chatid como veio', async () => {
    const res = await POST(req(payload({ chatid: '123456789012345@lid', sender: '123456789012345@lid', sender_pn: '5551981477111@s.whatsapp.net' })))
    expect(res.status).toBe(200)
    expect(findUserByPhone).toHaveBeenCalledWith('5551981477111')
    expect(m(sendWhatsAppText).mock.calls[0][1].chatId).toBe('123456789012345@lid')
  })
  it('remetente @lid sem sender_pn: não consulta telefone, atende como não identificado', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await POST(req(payload({ chatid: '120363412251837385@g.us', isGroup: true, sender: '123456789012345@lid', text: 'Max, quem sou eu?' })))
    expect(findUserByPhone).not.toHaveBeenCalled()
    expect(runMax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ identity: { user: null, senderName: null } }))
    expect(info).toHaveBeenCalledWith('[max] remetente não identificado', { group: true, jidKind: 'lid', hasSenderPn: false })
    info.mockRestore()
  })
})

describe('menção por toque com LID da instância (18/10/2026)', () => {
  const LID = '123456789012345'
  const g = { chatid: '120363412251837385@g.us', isGroup: true, sender: '5551981477111@s.whatsapp.net', text: `@${LID} quem sou eu?`, content: { contextInfo: { mentionedJid: [`${LID}@lid`] } } }
  it('com UAZAPI_INSTANCE_LID, a menção pelo LID responde e o texto chega limpo', async () => {
    m(knownInstanceLid).mockResolvedValueOnce(LID) // a lib lê UAZAPI_INSTANCE_LID; aqui está mockada
    await POST(req(payload(g)))
    expect(runMax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ isGroup: true, text: 'quem sou eu?' }))
  })
  it('sem LID conhecido, aprende com a mensagem fromMe do próprio Max e passa a responder', async () => {
    m(rememberInstanceLid).mockResolvedValue(undefined)
    m(knownInstanceLid).mockResolvedValueOnce(null).mockResolvedValueOnce(LID)
    const eco = await POST(req({ ...payload({ fromMe: true, sender_lid: `${LID}@lid`, text: 'resposta do max' }) }))
    expect(await eco.json()).toEqual({ ok: true, ignored: 'eco', learned: 'lid' })
    expect(rememberInstanceLid).toHaveBeenCalledWith(LID)
    await POST(req(payload(g)))
    expect(runMax).toHaveBeenCalled()
  })
})

describe('reply ao Max no grupo (18/10/2026)', () => {
  const g = { chatid: '120363412251837385@g.us', isGroup: true, sender: '5551981477111@s.whatsapp.net', text: 'sim' }
  it('responder a uma mensagem enviada pelo Max conta como chamada', async () => {
    m(isMaxOutbound).mockResolvedValueOnce(true)
    await POST(req(payload({ ...g, content: { contextInfo: { stanzaId: 'OUT1', participant: '999@lid' } } })))
    expect(isMaxOutbound).toHaveBeenCalledWith('OUT1')
    expect(runMax).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ isGroup: true, text: 'sim' }))
  })
  it('responder a mensagem de outra pessoa continua ignorado', async () => {
    m(isMaxOutbound).mockResolvedValueOnce(false)
    expect(await (await POST(req(payload({ ...g, content: { contextInfo: { stanzaId: 'OTHER', participant: '5522@s.whatsapp.net' } } })))).json()).toEqual({ ok: true, ignored: 'grupo sem menção' })
    expect(runMax).not.toHaveBeenCalled()
  })
})
