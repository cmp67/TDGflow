import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from '@vercel/postgres'
import { compare } from 'bcryptjs'
import { generateInviteToken } from '@/lib/invites'
import { POST } from './route'

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/signup (public — redeems an invite token into a new tdg_users row)', () => {
  let agencyId: string
  const cnpj = `90.000.031/${Date.now().toString().slice(-4)}-31`
  const createdEmails: string[] = []

  beforeAll(async () => {
    const { rows } = await sql`
      INSERT INTO tdg_agencies (name, cnpj) VALUES ('__TDD_SIGNUP_AGENCY__', ${cnpj}) RETURNING id
    `
    agencyId = rows[0].id as string
  })

  afterAll(async () => {
    // tdg_invites.used_by references tdg_users — invites must go first.
    await sql`DELETE FROM tdg_invites WHERE agency_id = ${agencyId}`
    if (createdEmails.length) {
      await sql`DELETE FROM tdg_users WHERE email = ANY(${createdEmails})`
    }
    await sql`DELETE FROM tdg_agencies WHERE id = ${agencyId}`
  })

  async function makeInvite(opts: { role?: string; expiresAt?: Date; usedAt?: Date } = {}) {
    const token = generateInviteToken()
    const role = opts.role ?? 'agency_admin'
    if (opts.expiresAt) {
      await sql`
        INSERT INTO tdg_invites (token, agency_id, role, expires_at, used_at)
        VALUES (${token}, ${agencyId}, ${role}, ${opts.expiresAt.toISOString()}, ${opts.usedAt?.toISOString() ?? null})
      `
    } else {
      await sql`
        INSERT INTO tdg_invites (token, agency_id, role, used_at)
        VALUES (${token}, ${agencyId}, ${role}, ${opts.usedAt?.toISOString() ?? null})
      `
    }
    return token
  }

  it('rejects a missing/garbage token with a generic message', async () => {
    const res = await POST(postRequest({ token: 'not-a-real-token', name: 'X', email: `x-${Date.now()}@example.com`, password: 'longenough1' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeTruthy()
    // Must not leak whether the token exists, which agency it belongs to, etc.
    expect(json.error).not.toMatch(/agency|agencia|uuid/i)
  })

  it('rejects an expired token', async () => {
    const token = await makeInvite({ expiresAt: new Date(Date.now() - 1000) })
    const res = await POST(postRequest({ token, name: 'X', email: `expired-${Date.now()}@example.com`, password: 'longenough1' }))
    expect(res.status).toBe(400)
  })

  it('rejects an already-used token', async () => {
    const token = await makeInvite({ usedAt: new Date() })
    const res = await POST(postRequest({ token, name: 'X', email: `used-${Date.now()}@example.com`, password: 'longenough1' }))
    expect(res.status).toBe(400)
  })

  it('rejects a weak password', async () => {
    const token = await makeInvite()
    const res = await POST(postRequest({ token, name: 'X', email: `weak-${Date.now()}@example.com`, password: '123' }))
    expect(res.status).toBe(400)
  })

  it('rejects missing required fields', async () => {
    const token = await makeInvite()
    const res = await POST(postRequest({ token }))
    expect(res.status).toBe(400)
  })

  it('creates a user with agency_id/role from the invite (never from the request body) and marks the invite used', async () => {
    const token = await makeInvite({ role: 'agency_admin' })
    const email = `new-admin-${Date.now()}@example.com`
    createdEmails.push(email)

    const res = await POST(postRequest({
      token, name: 'Nova Pessoa', email, password: 'longenough1',
      // Forged fields — must be ignored entirely.
      role: 'admin', agency_id: '00000000-0000-0000-0000-000000000000',
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.user.role).toBe('agency_admin')

    const { rows } = await sql`
      SELECT role, agency_id, agency_name, password_hash FROM tdg_users WHERE email = ${email}
    `
    expect(rows[0].role).toBe('agency_admin')
    expect(rows[0].agency_id).toBe(agencyId)
    expect(rows[0].agency_name).toBe('__TDD_SIGNUP_AGENCY__')
    expect(await compare('longenough1', rows[0].password_hash as string)).toBe(true)

    const { rows: inviteRows } = await sql`SELECT used_at, used_by FROM tdg_invites WHERE token = ${token}`
    expect(inviteRows[0].used_at).toBeTruthy()
    expect(inviteRows[0].used_by).toBeTruthy()
  })

  it('stores the email as typed (trimmed, NOT lowercased) — auth.ts login does no normalization either', async () => {
    const token = await makeInvite()
    const mixedCaseEmail = `  Mixed.Case-${Date.now()}@Example.com  `
    const expectedStoredEmail = mixedCaseEmail.trim()
    createdEmails.push(expectedStoredEmail)

    const res = await POST(postRequest({ token, name: 'Case Sensitive', email: mixedCaseEmail, password: 'longenough1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.user.email).toBe(expectedStoredEmail)

    const { rows } = await sql`SELECT email FROM tdg_users WHERE email = ${expectedStoredEmail}`
    expect(rows).toHaveLength(1)
  })

  it('rejects a duplicate email even with a fresh valid invite', async () => {
    const email = `dup-${Date.now()}@example.com`
    createdEmails.push(email)
    const tokenOne = await makeInvite()
    const first = await POST(postRequest({ token: tokenOne, name: 'A', email, password: 'longenough1' }))
    expect(first.status).toBe(200)

    const tokenTwo = await makeInvite()
    const second = await POST(postRequest({ token: tokenTwo, name: 'B', email, password: 'longenough1' }))
    expect(second.status).toBe(409)
  })

  it('rejects reusing the same token twice sequentially', async () => {
    const token = await makeInvite()
    const emailOne = `seq1-${Date.now()}@example.com`
    const emailTwo = `seq2-${Date.now()}@example.com`
    createdEmails.push(emailOne, emailTwo)

    const first = await POST(postRequest({ token, name: 'A', email: emailOne, password: 'longenough1' }))
    expect(first.status).toBe(200)

    const second = await POST(postRequest({ token, name: 'B', email: emailTwo, password: 'longenough1' }))
    expect(second.status).toBe(400)
  })

  it('race condition: firing two redemptions of the same token concurrently, exactly one succeeds', async () => {
    const token = await makeInvite()
    const emailOne = `race1-${Date.now()}@example.com`
    const emailTwo = `race2-${Date.now()}@example.com`
    createdEmails.push(emailOne, emailTwo)

    const [resOne, resTwo] = await Promise.all([
      POST(postRequest({ token, name: 'Race A', email: emailOne, password: 'longenough1' })),
      POST(postRequest({ token, name: 'Race B', email: emailTwo, password: 'longenough1' })),
    ])

    const statuses = [resOne.status, resTwo.status].sort()
    expect(statuses).toEqual([200, 400])

    const { rows } = await sql`
      SELECT count(*)::int AS n FROM tdg_users WHERE email IN (${emailOne}, ${emailTwo})
    `
    expect(rows[0].n).toBe(1)
  })
})
