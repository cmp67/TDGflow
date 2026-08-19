import { jwtVerify } from 'jose'

export interface SsoClaims {
  sub: string
  email: string
  name: string
  guest_role: string
}

// Defesa contra reapresentação dentro da janela de 60s do token. Em memória
// — funciona de verdade dentro da mesma instância serverless "morna" (Fluid
// Compute do Vercel reaproveita instância entre requisições), mas não é
// garantia cross-instância. Suficiente pro risco real (token só nasce depois
// de login válido no GUEST, exposição é a janela curta de clique-e-redirect,
// não um segredo de longa duração) — trocar por tabela no Postgres se um dia
// vazamento via múltiplas instâncias virar preocupação concreta.
const usedJtis = new Map<string, number>()

function pruneExpired(now: number) {
  for (const [jti, expMs] of usedJtis) {
    if (expMs < now) usedJtis.delete(jti)
  }
}

export async function verifySsoToken(token: string): Promise<SsoClaims | null> {
  const secret = process.env.FLOW_SSO_SECRET
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'gonna-travel-guest',
      audience: 'tdg-flow',
    })

    const jti = payload.jti
    const sub = payload.sub
    const email = payload.email
    const name = payload.name
    const guestRole = payload.guest_role
    if (
      typeof jti !== 'string' ||
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string' ||
      typeof guestRole !== 'string'
    ) {
      return null
    }

    const now = Date.now()
    pruneExpired(now)
    if (usedJtis.has(jti)) return null
    const expMs = (payload.exp ?? Math.floor(now / 1000) + 60) * 1000
    usedJtis.set(jti, expMs)

    return { sub, email, name, guest_role: guestRole }
  } catch {
    // assinatura inválida, expirado, iss/aud errado, token malformado —
    // tudo cai aqui, nunca vaza o motivo específico pro chamador.
    return null
  }
}
