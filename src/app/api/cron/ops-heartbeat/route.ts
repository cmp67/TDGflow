import { NextRequest, NextResponse } from 'next/server'
import {
  readOpsConfig, checkDatabase, collectLumisSnapshot, buildHeartbeatPayload, sendHeartbeat,
} from '@/lib/ops-heartbeat'
import { APP_VERSION } from '@/lib/version'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/* Heartbeat pro Bemgsy Ops, a cada 5 min (vercel.json). Mesma proteção dos
   outros crons (Bearer CRON_SECRET). Sem OPS_URL/OPS_HEARTBEAT_TOKEN no
   ambiente a rota não faz nada — é o estado "desligado". Falha ao falar com
   o Ops nunca vira erro aqui: a resposta é sempre 200 com `sent` dizendo o
   que houve, pra não poluir o painel de crons do Vercel com falhas que são
   do Ops, não do Flow. O token nunca aparece na resposta nem em log. */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = readOpsConfig(process.env)
  if (!config) {
    return NextResponse.json({ skipped: 'ops_not_configured' })
  }

  const db = await checkDatabase()
  const lumis = db.ok ? await collectLumisSnapshot().catch(logSnapshotFailure) : null

  const payload = buildHeartbeatPayload({ dbOk: db.ok, latencyMs: db.latencyMs, version: APP_VERSION, lumis })
  const result = await sendHeartbeat(payload, config)

  return NextResponse.json({ status: payload.status, ...result })
}

function logSnapshotFailure(err: unknown): null {
  console.error('[ops-heartbeat] foto de Lumis falhou — manda heartbeat sem o bloco', {
    error: err instanceof Error ? err.message : String(err),
  })
  return null
}
