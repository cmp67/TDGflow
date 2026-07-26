// Only the Growth plan is sold for now (Carla, 2026-07-23). Kept separate
// from mercadopago.ts so callers that need just the price (e.g. the
// subscribe route, when persisting the ledger row) don't have to import
// through a module that's normally mocked out in tests.
//
// R$1.470/mês is the total Bemgsy/TDG partnership fee, split evenly across
// the 19 contracted agencies — each agency is billed its share, 1470/19 =
// R$77,37/mês, on billing day 5, capped at 24 charges (the 2-year deal
// term) (Carla, 2026-07-26).
export const GROWTH_PLAN = {
  reason:            'TDG Flow — Plano Growth',
  transactionAmount: 77.37,
  currencyId:        'BRL',
  billingDay:        5,
  repetitions:        24,
} as const
