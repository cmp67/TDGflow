import { sql, db } from '@vercel/postgres'

// ── Credit costs per action ────────────────────────────────────────────────────

export const CREDIT_COSTS: Record<string, number> = {
  chat:              9,   // 9 lm × R$0,006 = R$0,054 real (Claude Sonnet)
  review_extraction: 5,   // 5 lm × R$0,006 = R$0,030 real (Claude Haiku)
  transcription:     2,   // 2 lm × R$0,006 = R$0,012 real (Groq Whisper)
  travel_docs:       2,   // 2 lm × R$0,006 = R$0,012 real (Claude Haiku)
  scan_card:         3,   // 3 lm × R$0,006 = R$0,018 real (Claude Haiku vision)
}

// ── Tiers (legacy — kept for UI reference) ────────────────────────────────────

export type TierId = 'starter' | 'growth' | 'scale' | 'enterprise'

export const TIERS: Array<{
  id:          TierId
  name:        string
  credits:     number | null
  label:       string
  color:       string
  bg:          string
  priceReais:  number | null
  priceLabel:  string
}> = [
  { id: 'starter',    name: 'Starter',    credits: 2500,  label: 'R$0,012/lm — 500 lm/agência', color: '#4A7580', bg: '#EDF4F6', priceReais: 990,  priceLabel: 'R$990/mês'    },
  { id: 'growth',     name: 'Growth',     credits: 9500,  label: 'R$0,012/lm — 500 lm/agência', color: '#2E7D32', bg: '#E8F5E9', priceReais: 1470, priceLabel: 'R$1.470/mês'  },
  { id: 'scale',      name: 'Scale',      credits: 15000, label: 'R$0,012/lm — 500 lm/agência', color: '#1565C0', bg: '#E3F2FD', priceReais: 1690, priceLabel: 'R$1.690/mês'  },
  { id: 'enterprise', name: 'Enterprise', credits: null,  label: 'Volume alto, SLA dedicado',  color: '#6B4FA0', bg: '#F3EEF9', priceReais: null, priceLabel: 'Sob consulta' },
]

// ── Pool config ────────────────────────────────────────────────────────────────

export const POOL_CONFIG = {
  quotaPerAgency:  500,   // Lumis per agency per month (1 lm = R$0,006 real cost)
  topupPackages: [
    { size: 100, priceReais: 0.13, total: 13.00,  label: 'Pacote 100 lm — R$ 13,00' },
    { size: 500, priceReais: 0.12, total: 60.00,  label: 'Pacote 500 lm — R$ 60,00' },
  ] as const,
} as const

// ── Table bootstrap ───────────────────────────────────────────────────────────

async function ensureTables() {
  // NOTE: agency_id columns reference tdg_agencies(id) (uuid), the source of
  // truth for the 19 contracted agencies. These CREATE TABLE IF NOT EXISTS
  // statements are no-ops against the existing production tables (already
  // migrated) — they only matter for a fresh database, so they must reflect
  // the real, current schema.
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_credits_balance (
      id          SERIAL PRIMARY KEY,
      agency_id   UUID NOT NULL UNIQUE REFERENCES tdg_agencies(id),
      balance     INTEGER NOT NULL DEFAULT 0,
      tier        TEXT NOT NULL DEFAULT 'starter',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_credits_ledger (
      id          SERIAL PRIMARY KEY,
      agency_id   UUID NOT NULL REFERENCES tdg_agencies(id),
      amount      INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      user_email  TEXT,
      meta        JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE tdg_credits_ledger ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'quota'`
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_agency_cycles (
      agency_id   UUID    NOT NULL REFERENCES tdg_agencies(id),
      period      DATE    NOT NULL,
      quota       INTEGER NOT NULL,
      consumed    INTEGER NOT NULL DEFAULT 0,
      returned    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (agency_id, period)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_central_pool (
      period   DATE    PRIMARY KEY,
      balance  INTEGER NOT NULL DEFAULT 0
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_lumi_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

// ── Fix 2: One-time initialization per cold start (DDL off the hot path) ─────

let _tablesEnsured = false

async function ensureTablesOnce(): Promise<void> {
  if (_tablesEnsured) return
  await ensureTables()
  _tablesEnsured = true
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

async function ensureCycleRow(agencyId: string, period: string): Promise<void> {
  await sql`
    INSERT INTO tdg_agency_cycles (agency_id, period, quota)
    VALUES (${agencyId}, ${period}, ${POOL_CONFIG.quotaPerAgency})
    ON CONFLICT (agency_id, period) DO NOTHING
  `
}

async function logLedger(
  params: { agencyId: string; action: string; userEmail: string; meta?: Record<string, unknown> },
  cost: number,
  source: string
): Promise<void> {
  await sql`
    INSERT INTO tdg_credits_ledger
      (agency_id, amount, action_type, user_email, meta, source)
    VALUES
      (${params.agencyId}, ${-cost}, ${params.action}, ${params.userEmail},
       ${params.meta ? JSON.stringify(params.meta) : null}, ${source})
  `
}

// ── Check balance and deduct atomically (blocking — call BEFORE AI work) ─────
// Fix 1: cascade wrapped in a single transaction
// Fix 3: fail-closed on DB error (no free credits during outages)
// Fix 4: ledger INSERT is atomic with the deduction (same transaction)
// Cascade: agency monthly quota → central pool (donated) → top-up balance → fail

export const INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE'
// Caller has no real agency assigned (tdg_users.agency_id is null) — this
// can only happen for accounts that predate the tdg_agencies rollout, or
// were never linked to one of the 19 contracted agencies. There is no
// fallback pool: fail closed, do not spend credits on their behalf.
export const NO_AGENCY = 'NO_AGENCY'

export async function checkAndDeductCredits(params: {
  agencyId:  string | null
  action:    string
  userEmail: string
  meta?:     Record<string, unknown>
}): Promise<
  | { ok: true; source?: string }
  | { ok: false; reason: typeof INSUFFICIENT_BALANCE | typeof NO_AGENCY }
> {
  if (!params.agencyId) {
    return { ok: false, reason: NO_AGENCY }
  }

  const agencyId = params.agencyId
  const cost     = CREDIT_COSTS[params.action] ?? 1
  const period   = getCurrentPeriod()

  await ensureTablesOnce()
  const client = await db.connect()

  try {
    await client.sql`BEGIN`

    // Ensure cycle row exists within the transaction
    await client.sql`
      INSERT INTO tdg_agency_cycles (agency_id, period, quota)
      VALUES (${agencyId}, ${period}, ${POOL_CONFIG.quotaPerAgency})
      ON CONFLICT (agency_id, period) DO NOTHING
    `

    // 1. Agency monthly quota
    const { rows: quotaRows } = await client.sql`
      UPDATE tdg_agency_cycles
      SET consumed = consumed + ${cost}
      WHERE agency_id = ${agencyId}
        AND period    = ${period}
        AND (quota - consumed) >= ${cost}
      RETURNING consumed
    `

    let source: string
    if (quotaRows.length > 0) {
      source = 'quota'
    } else {
      // 2. Central pool (Lumis donated by other agencies)
      const { rows: poolRows } = await client.sql`
        UPDATE tdg_central_pool
        SET balance = balance - ${cost}
        WHERE period  = ${period}
          AND balance >= ${cost}
        RETURNING balance
      `
      if (poolRows.length > 0) {
        source = 'central_pool'
      } else {
        // 3. Top-up balance (purchased separately by the agency)
        const { rows: topupRows } = await client.sql`
          UPDATE tdg_credits_balance
          SET balance    = balance - ${cost},
              updated_at = NOW()
          WHERE agency_id = ${agencyId}
            AND balance   >= ${cost}
          RETURNING balance
        `
        if (topupRows.length > 0) {
          source = 'topup'
        } else {
          await client.sql`ROLLBACK`
          return { ok: false, reason: INSUFFICIENT_BALANCE }
        }
      }
    }

    // Ledger is atomic with the deduction — same transaction
    await client.sql`
      INSERT INTO tdg_credits_ledger
        (agency_id, amount, action_type, user_email, meta, source)
      VALUES
        (${agencyId}, ${-cost}, ${params.action}, ${params.userEmail},
         ${params.meta ? JSON.stringify(params.meta) : null}, ${source})
    `

    await client.sql`COMMIT`
    return { ok: true, source }

  } catch (err) {
    try { await client.sql`ROLLBACK` } catch { /* ignore rollback error */ }
    // Fix 3: fail-closed — log and re-throw; callers must handle DB errors
    console.error('[credits] deduction failed — failing closed', {
      agencyId: params.agencyId,
      action:   params.action,
      error:    err instanceof Error ? err.message : String(err),
    })
    throw err
  } finally {
    client.release()
  }
}

// ── Deduct credits (fire-and-forget — never blocks main response) ─────────────

export function deductCredits(params: {
  agencyId:   string | null
  action:     string
  userEmail:  string
  meta?:      Record<string, unknown>
}): void {
  // No real agency assigned (see NO_AGENCY) — nothing to bill, skip silently.
  // This path is fire-and-forget and must never block the main flow.
  if (!params.agencyId) return

  const agencyId = params.agencyId
  const cost     = CREDIT_COSTS[params.action] ?? 1

  ;(async () => {
    try {
      await ensureTablesOnce()

      await sql`
        INSERT INTO tdg_credits_balance (agency_id, balance, tier)
        VALUES (${agencyId}, 0, 'starter')
        ON CONFLICT (agency_id) DO NOTHING
      `
      await sql`
        UPDATE tdg_credits_balance
        SET balance    = balance - ${cost},
            updated_at = NOW()
        WHERE agency_id = ${agencyId}
      `
      await sql`
        INSERT INTO tdg_credits_ledger
          (agency_id, amount, action_type, user_email, meta, source)
        VALUES
          (${agencyId}, ${-cost}, ${params.action}, ${params.userEmail},
           ${params.meta ? JSON.stringify(params.meta) : null}, 'soft')
      `
    } catch {
      // Silent — credit tracking must never break the main flow
    }
  })()
}

// ── Top up credits (admin action — adds to agency top-up balance) ─────────────

export async function topUpCredits(params: {
  agencyId:   string
  amount:     number
  tier:       TierId
  adminEmail: string
  note?:      string
}): Promise<void> {
  await ensureTablesOnce()

  await sql`
    INSERT INTO tdg_credits_balance (agency_id, balance, tier)
    VALUES (${params.agencyId}, ${params.amount}, ${params.tier})
    ON CONFLICT (agency_id) DO UPDATE
    SET balance    = tdg_credits_balance.balance + ${params.amount},
        tier       = ${params.tier},
        updated_at = NOW()
  `
  await sql`
    INSERT INTO tdg_credits_ledger
      (agency_id, amount, action_type, user_email, meta, source)
    VALUES
      (${params.agencyId}, ${params.amount}, 'purchase', ${params.adminEmail},
       ${JSON.stringify({ tier: params.tier, note: params.note ?? null })}, 'topup')
  `
}

// ── Read top-up balance (legacy — use getQuotaStatus for full picture) ────────

export async function getBalance(agencyId: string): Promise<{ balance: number; tier: TierId }> {
  await ensureTablesOnce()
  const { rows } = await sql`
    SELECT balance, tier FROM tdg_credits_balance WHERE agency_id = ${agencyId}
  `
  return rows[0]
    ? { balance: rows[0].balance as number, tier: rows[0].tier as TierId }
    : { balance: 0, tier: 'starter' }
}

// ── Quota status — full picture for billing dashboard ─────────────────────────

export async function getQuotaStatus(agencyId: string): Promise<{
  quota:     number
  consumed:  number
  returned:  number
  remaining: number
  topup:     number
  pool:      number
  period:    string
}> {
  await ensureTablesOnce()
  const period = getCurrentPeriod()
  await ensureCycleRow(agencyId, period)

  const [cycleRes, balanceRes, poolRes] = await Promise.all([
    sql`SELECT quota, consumed, returned FROM tdg_agency_cycles
        WHERE agency_id = ${agencyId} AND period = ${period}`,
    sql`SELECT balance FROM tdg_credits_balance WHERE agency_id = ${agencyId}`,
    sql`SELECT balance FROM tdg_central_pool WHERE period = ${period}`,
  ])

  const cycle    = cycleRes.rows[0]
  const quota    = Number(cycle?.quota    ?? POOL_CONFIG.quotaPerAgency)
  const consumed = Number(cycle?.consumed ?? 0)
  const returned = Number(cycle?.returned ?? 0)

  return {
    quota,
    consumed,
    returned,
    remaining: Math.max(0, quota - consumed - returned),
    topup:     Number(balanceRes.rows[0]?.balance ?? 0),
    pool:      Number(poolRes.rows[0]?.balance    ?? 0),
    period,
  }
}

// ── Return unused quota to central pool (agency voluntary action) ─────────────

export async function returnQuotaToPool(params: {
  agencyId:   string
  amount:     number
  adminEmail: string
}): Promise<{ returned: number }> {
  await ensureTablesOnce()
  const period = getCurrentPeriod()

  const { rows } = await sql`
    SELECT (quota - consumed - returned) AS available
    FROM tdg_agency_cycles
    WHERE agency_id = ${params.agencyId} AND period = ${period}
  `
  if (!rows.length) return { returned: 0 }

  const available = Math.max(0, Number(rows[0].available))
  const toReturn  = Math.min(params.amount, available)
  if (toReturn <= 0) return { returned: 0 }

  await sql`
    UPDATE tdg_agency_cycles
    SET returned = returned + ${toReturn}
    WHERE agency_id = ${params.agencyId} AND period = ${period}
  `
  await sql`
    INSERT INTO tdg_central_pool (period, balance)
    VALUES (${period}, ${toReturn})
    ON CONFLICT (period) DO UPDATE
    SET balance = tdg_central_pool.balance + ${toReturn}
  `
  await sql`
    INSERT INTO tdg_credits_ledger
      (agency_id, amount, action_type, user_email, meta, source)
    VALUES
      (${params.agencyId}, ${-toReturn}, 'pool_return', ${params.adminEmail},
       ${JSON.stringify({ period, amount: toReturn })}, 'quota')
  `

  return { returned: toReturn }
}

// ── Lumi distribution settings ────────────────────────────────────────────────

export type DistributionMode = 'free' | 'equal'

export async function getLumiSettings(): Promise<{ mode: DistributionMode; equalTotal: number }> {
  await ensureTablesOnce()
  const { rows } = await sql`SELECT key, value FROM tdg_lumi_settings WHERE key IN ('distribution_mode','equal_total')`
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    mode:       (map['distribution_mode'] ?? 'free') as DistributionMode,
    equalTotal: parseInt(map['equal_total'] ?? '0', 10),
  }
}

export async function setDistributionMode(mode: DistributionMode): Promise<void> {
  await ensureTablesOnce()
  await sql`
    INSERT INTO tdg_lumi_settings (key, value) VALUES ('distribution_mode', ${mode})
    ON CONFLICT (key) DO UPDATE SET value = ${mode}, updated_at = NOW()
  `
}

// ── Per-agency usage breakdown (admin view) ───────────────────────────────────
// tdg_agencies is the source of truth for "all agencies" — not tdg_users
// (which only reflects agencies that currently have a linked user, and may
// contain unlinked/demo accounts with no real agency at all). Usage is
// summed straight from the ledger's real agency_id column, so this now
// covers every contracted agency, not a single hardcoded pool.

export async function getAgencyBreakdown(): Promise<{
  agency: string
  usedThisMonth: number
}[]> {
  const { rows } = await sql`
    SELECT
      a.name                                  AS agency,
      COALESCE(SUM(ABS(l.amount)), 0)::int    AS used_this_month
    FROM tdg_agencies a
    LEFT JOIN tdg_credits_ledger l
      ON  l.agency_id   = a.id
      AND l.amount      < 0
      AND l.created_at >= date_trunc('month', NOW())
    WHERE a.active = true
    GROUP BY a.name
    ORDER BY used_this_month DESC
  `
  return rows.map(r => ({ agency: r.agency as string, usedThisMonth: r.used_this_month as number }))
}

// ── Distribute equally ────────────────────────────────────────────────────────

export async function distributeEqually(total: number): Promise<{
  agencies: string[]
  quotaEach: number
}> {
  await ensureTablesOnce()

  await sql`
    INSERT INTO tdg_lumi_settings (key, value) VALUES ('equal_total', ${String(total)})
    ON CONFLICT (key) DO UPDATE SET value = ${String(total)}, updated_at = NOW()
  `

  const { rows } = await sql`SELECT name FROM tdg_agencies WHERE active = true ORDER BY name`
  const agencies  = rows.map(r => r.name as string)
  const quotaEach = agencies.length > 0 ? Math.floor(total / agencies.length) : 0

  return { agencies, quotaEach }
}

// ── Pool contribution (legacy alias — use returnQuotaToPool instead) ──────────

export async function contributeToPool(params: {
  agencyName: string
  amount:     number
  poolId:     string
  adminEmail: string
}): Promise<void> {
  await ensureTablesOnce()

  await sql`
    INSERT INTO tdg_credits_balance (agency_id, balance, tier)
    VALUES (${params.poolId}, ${params.amount}, 'starter')
    ON CONFLICT (agency_id) DO UPDATE
    SET balance = tdg_credits_balance.balance + ${params.amount}, updated_at = NOW()
  `
  await sql`
    INSERT INTO tdg_credits_ledger (agency_id, amount, action_type, user_email, meta, source)
    VALUES (
      ${params.poolId}, ${params.amount}, 'pool_contribution', ${params.adminEmail},
      ${JSON.stringify({ from_agency: params.agencyName, amount: params.amount })}, 'quota'
    )
  `
}
