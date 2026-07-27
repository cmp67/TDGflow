import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import { createAgencyCheckout } from '@/lib/asaas'
import { getLatestSubscriptionForAgency, createPendingSubscriptionRow } from '@/lib/subscriptions'
import { GROWTH_PLAN } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const NO_AGENCY_ERROR = 'Usuário sem agência vinculada'
const ACTIVE_STATUSES = new Set(['authorized', 'paused'])

async function getCallerAgency(email: string): Promise<{ id: string; name: string; cnpj: string } | null> {
  const { rows } = await sql`
    SELECT a.id, a.name, a.cnpj
    FROM tdg_users u
    JOIN tdg_agencies a ON a.id = u.agency_id
    WHERE u.email = ${email}
    LIMIT 1
  `
  return rows[0] ? { id: rows[0].id as string, name: rows[0].name as string, cnpj: rows[0].cnpj as string } : null
}

// POST /api/billing/subscribe — self-service, own agency only.
//
// Cria o checkout recorrente no Asaas já com externalReference = agencyId,
// pra o webhook conseguir atribuir a assinatura sem ambiguidade (ver
// asaas.ts). Só o plano Growth existe por enquanto (Carla, 2026-07-23).
// Retorna a checkoutUrl pra onde o navegador do chamador deve redirecionar.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agency = await getCallerAgency(session.user.email)
  if (!agency) return NextResponse.json({ error: NO_AGENCY_ERROR }, { status: 422 })

  const existing = await getLatestSubscriptionForAgency(agency.id)
  if (existing && ACTIVE_STATUSES.has(existing.status)) {
    return NextResponse.json({ error: 'Sua agência já tem uma assinatura ativa' }, { status: 409 })
  }

  try {
    const successUrl = `${req.nextUrl.origin}/flow/billing/confirmacao`
    const { checkoutId, checkoutUrl } = await createAgencyCheckout({
      agencyId:   agency.id,
      agencyName: agency.name,
      agencyCnpj: agency.cnpj,
      payerEmail: session.user.email,
      successUrl,
      cancelUrl:  successUrl,
    })

    await createPendingSubscriptionRow({
      agencyId:               agency.id,
      providerSubscriptionId: checkoutId,
      providerCustomerId:     null, // só conhecido depois que o Asaas confirma o checkout (webhook SUBSCRIPTION_CREATED)
      planTier:               'growth',
      payerEmail:             session.user.email,
      transactionAmount:      GROWTH_PLAN.transactionAmount,
    })

    return NextResponse.json({ initPoint: checkoutUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
