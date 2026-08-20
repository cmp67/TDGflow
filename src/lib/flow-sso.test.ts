import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'
import { verifySsoToken } from './flow-sso'

const SECRET = 'test-flow-sso-secret-do-not-use-in-prod-32chars'

async function makeToken(overrides: Partial<{
  email: string
  name: string
  guest_role: string
  sub: string
  iss: string
  aud: string
  ttl: string
  secret: string
}> = {}) {
  const {
    email = 'consultor@gonnatravel.com',
    name = 'Fulana Consultora',
    guest_role = 'Consultor',
    sub = 'u1',
    iss = 'gonna-travel-guest',
    aud = 'tdg-flow',
    ttl = '60s',
    secret = SECRET,
  } = overrides

  return new SignJWT({ email, name, guest_role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer(iss)
    .setAudience(aud)
    .setExpirationTime(ttl)
    .sign(new TextEncoder().encode(secret))
}

describe('verifySsoToken', () => {
  beforeEach(() => {
    process.env.FLOW_SSO_SECRET = SECRET
  })
  afterEach(() => {
    delete process.env.FLOW_SSO_SECRET
  })

  it('aceita um token válido e devolve os claims', async () => {
    const token = await makeToken()
    const result = await verifySsoToken(token)
    expect(result).toEqual({
      sub: 'u1',
      email: 'consultor@gonnatravel.com',
      name: 'Fulana Consultora',
      guest_role: 'Consultor',
    })
  })

  it('rejeita token com assinatura de segredo errado', async () => {
    const token = await makeToken({ secret: 'segredo-errado-mas-tambem-longo-32ch' })
    await expect(verifySsoToken(token)).resolves.toBeNull()
  })

  it('rejeita issuer diferente de gonna-travel-guest', async () => {
    const token = await makeToken({ iss: 'outro-emissor' })
    await expect(verifySsoToken(token)).resolves.toBeNull()
  })

  it('rejeita audience diferente de tdg-flow', async () => {
    const token = await makeToken({ aud: 'outro-consumidor' })
    await expect(verifySsoToken(token)).resolves.toBeNull()
  })

  it('rejeita token expirado', async () => {
    const token = await makeToken({ ttl: '-10s' })
    await expect(verifySsoToken(token)).resolves.toBeNull()
  })

  it('rejeita token malformado sem lançar', async () => {
    await expect(verifySsoToken('nao-e-um-jwt')).resolves.toBeNull()
  })

  it('devolve null quando FLOW_SSO_SECRET não está configurado', async () => {
    delete process.env.FLOW_SSO_SECRET
    const token = await makeToken()
    await expect(verifySsoToken(token)).resolves.toBeNull()
  })

  it('rejeita reapresentação do mesmo jti (uso único)', async () => {
    const token = await makeToken()
    const first = await verifySsoToken(token)
    expect(first).not.toBeNull()
    const second = await verifySsoToken(token)
    expect(second).toBeNull()
  })
})
