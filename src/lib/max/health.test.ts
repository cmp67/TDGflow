import { describe, it, expect, vi } from 'vitest'
import { instanceConnected, maxComponents } from './health'

const config = { baseUrl: 'https://x.uazapi.com', instanceToken: 'tok' }
const res = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))

describe('instanceConnected', () => {
  it('conectada pelo formato status.connected', async () => {
    const f = vi.fn(() => res(200, { instance: { status: 'connected' }, status: { connected: true, loggedIn: true } }))
    expect(await instanceConnected(config, f as unknown as typeof fetch)).toEqual({ ok: true })
    expect(f).toHaveBeenCalledWith('https://x.uazapi.com/instance/status', expect.objectContaining({ headers: { token: 'tok' } }))
  })
  it('desconectada vira ok:false com o estado, sem token no detalhe', async () => {
    const r = await instanceConnected(config, (() => res(200, { instance: { status: 'disconnected' } })) as unknown as typeof fetch)
    expect(r.ok).toBe(false)
    expect(r.detalhe).toContain('disconnected')
    expect(r.detalhe).not.toContain('tok')
  })
  it('erro HTTP ou rede vira ok:false, nunca lança', async () => {
    expect((await instanceConnected(config, (() => res(401, {})) as unknown as typeof fetch)).ok).toBe(false)
    expect((await instanceConnected(config, (() => Promise.reject(new Error('timeout'))) as unknown as typeof fetch)).ok).toBe(false)
  })
})

describe('maxComponents', () => {
  it('tudo bem → duas peças ok', () => {
    expect(maxComponents({ connection: { ok: true }, failuresLast15m: 0 })).toEqual([
      { nome: 'whatsapp', ok: true },
      { nome: 'max_respostas', ok: true },
    ])
  })
  it('falhas recentes → max_respostas com o número no detalhe', () => {
    const [, max] = maxComponents({ connection: { ok: true }, failuresLast15m: 2 })
    expect(max).toEqual({ nome: 'max_respostas', ok: false, detalhe: 'Max respondeu "deu um problema" 2x nos últimos 15 min' })
  })
  it('sem uazapi configurada, não manda nada', () => {
    expect(maxComponents({ connection: null, failuresLast15m: 0 })).toEqual([])
  })
})
