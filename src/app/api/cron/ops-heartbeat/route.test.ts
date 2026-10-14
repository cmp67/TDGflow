import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ops-heartbeat', () => ({
  readOpsConfig: vi.fn(),
  checkDatabase: vi.fn(),
  collectLumisSnapshot: vi.fn(),
  buildHeartbeatPayload: vi.fn(),
  sendHeartbeat: vi.fn(),
}))

import {
  readOpsConfig, checkDatabase, collectLumisSnapshot, buildHeartbeatPayload, sendHeartbeat,
} from '@/lib/ops-heartbeat'
import { APP_VERSION } from '@/lib/version'
import { GET } from './route'

const mockConfig  = readOpsConfig as unknown as ReturnType<typeof vi.fn>
const mockDb      = checkDatabase as unknown as ReturnType<typeof vi.fn>
const mockLumis   = collectLumisSnapshot as unknown as ReturnType<typeof vi.fn>
const mockBuild   = buildHeartbeatPayload as unknown as ReturnType<typeof vi.fn>
const mockSend    = sendHeartbeat as unknown as ReturnType<typeof vi.fn>

const CONFIG = { url: 'https://ops.example', token: 'segredo' }
const LUMIS  = { ciclo_inicio: '2026-10-01', incluidos: 9500, extras: 0, consumidos: 10 }

function req(auth?: string) {
  return new NextRequest('http://localhost/api/cron/ops-heartbeat', {
    headers: auth ? { authorization: auth } : {},
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.CRON_SECRET = 'cron-secret'
  mockDb.mockResolvedValue({ ok: true, latencyMs: 12 })
  mockLumis.mockResolvedValue(LUMIS)
  mockBuild.mockImplementation((input) => ({ status: input.dbOk ? 'ok' : 'down', version: input.version }))
  mockSend.mockResolvedValue({ sent: true, httpStatus: 200 })
})

describe('GET /api/cron/ops-heartbeat', () => {
  it('401 sem Bearer CRON_SECRET, como os outros crons', async () => {
    mockConfig.mockReturnValue(CONFIG)
    expect((await GET(req())).status).toBe(401)
    expect((await GET(req('Bearer errado'))).status).toBe(401)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sem OPS_URL/token configurados, responde skipped e não toca no banco nem na rede', async () => {
    mockConfig.mockReturnValue(null)
    const res = await GET(req('Bearer cron-secret'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ skipped: 'ops_not_configured' })
    expect(mockDb).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('caminho feliz: mede banco, coleta lumis, monta payload com a versão do app e envia', async () => {
    mockConfig.mockReturnValue(CONFIG)
    const res = await GET(req('Bearer cron-secret'))
    expect(res.status).toBe(200)
    expect(mockBuild).toHaveBeenCalledWith({ dbOk: true, latencyMs: 12, version: APP_VERSION, lumis: LUMIS })
    expect(mockSend).toHaveBeenCalledWith({ status: 'ok', version: APP_VERSION }, CONFIG)
    expect(await res.json()).toEqual({ status: 'ok', sent: true, httpStatus: 200 })
  })

  it('banco fora: manda down sem coletar lumis', async () => {
    mockConfig.mockReturnValue(CONFIG)
    mockDb.mockResolvedValue({ ok: false, latencyMs: 5000 })
    await GET(req('Bearer cron-secret'))
    expect(mockLumis).not.toHaveBeenCalled()
    expect(mockBuild).toHaveBeenCalledWith({ dbOk: false, latencyMs: 5000, version: APP_VERSION, lumis: null })
  })

  it('snapshot de lumis falhou: segue com lumis null (degraded), nunca derruba a rota', async () => {
    mockConfig.mockReturnValue(CONFIG)
    mockLumis.mockRejectedValue(new Error('coluna sumiu'))
    const res = await GET(req('Bearer cron-secret'))
    expect(res.status).toBe(200)
    expect(mockBuild).toHaveBeenCalledWith(expect.objectContaining({ dbOk: true, lumis: null }))
    expect(mockSend).toHaveBeenCalled()
  })

  it('Ops recusou (429/422) ou rede caiu: responde 200 com sent false — falha no Ops nunca vira erro no Flow', async () => {
    mockConfig.mockReturnValue(CONFIG)
    mockSend.mockResolvedValue({ sent: false, httpStatus: 429, error: 'cedo demais' })
    const res = await GET(req('Bearer cron-secret'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', sent: false, httpStatus: 429, error: 'cedo demais' })
  })

  it('a resposta nunca contém o token', async () => {
    mockConfig.mockReturnValue(CONFIG)
    const res = await GET(req('Bearer cron-secret'))
    expect(await res.text()).not.toContain('segredo')
  })
})
