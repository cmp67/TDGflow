-- Single shared billing window for the whole TDG↔Bemgsy contract (Cláusula
-- 7.1: one 24-month term for the one contract instrument, not per agency).
-- Lazily created by the first agency that ever subscribes; every agency
-- after that reads the same end_date, so the whole network's Growth
-- subscriptions expire together regardless of when each agency joined.
-- Keyed (not a hard singleton) so tests can use their own key without
-- touching the real 'default' row.
CREATE TABLE IF NOT EXISTS tdg_agreement_window (
  key        text PRIMARY KEY,
  start_date timestamptz NOT NULL,
  end_date   timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
