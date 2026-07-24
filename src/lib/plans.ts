// Only the Growth plan is sold for now (Carla, 2026-07-23). Kept separate
// from mercadopago.ts so callers that need just the price (e.g. the
// subscribe route, when persisting the ledger row) don't have to import
// through a module that's normally mocked out in tests.
export const GROWTH_PLAN = {
  reason:            'TDG Flow — Plano Growth',
  transactionAmount: 1470,
  currencyId:        'BRL',
} as const
