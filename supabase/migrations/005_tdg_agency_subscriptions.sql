-- Recurring agency subscription (Mercado Pago preapproval), one row per
-- subscription attempt. A fresh row is created every time an agency starts
-- a new subscription (e.g. re-subscribing after cancellation) rather than
-- overwriting the previous one, so history is preserved.
CREATE TABLE IF NOT EXISTS tdg_agency_subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id          uuid NOT NULL REFERENCES tdg_agencies(id),
  mp_preapproval_id  text UNIQUE,
  plan_tier          text NOT NULL DEFAULT 'growth',
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled', 'rejected')),
  payer_email        text,
  transaction_amount numeric(10,2),
  next_payment_date  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tdg_agency_subscriptions_agency_id
  ON tdg_agency_subscriptions (agency_id, created_at DESC);
