-- Agenda da rede (decisão da Carla 18/10/2026): calendário compartilhado onde
-- qualquer pessoa logada anota datas da rede (treinamento, feira, webinar,
-- reunião, FAM trip, prazo) e convida; cada pessoa marca presença. O Max
-- registra evento quando marcado e posta a agenda de amanhã e o wrap-up
-- semanal no grupo. Espelha a Agenda do Time do GUEST (agenda_eventos) com o
-- que a rede precisa a mais: visibilidade (rede/agência), modalidade com
-- link ou endereço, fornecedor ligado, presença por pessoa.
-- Nada se apaga: cancela (cancelled_at). Só aditiva e idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS tdg_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
  type            text NOT NULL CHECK (type IN ('treinamento', 'feira', 'webinar', 'reuniao', 'famtrip', 'prazo', 'outro')),
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz CHECK (ends_at IS NULL OR ends_at >= starts_at),
  all_day         boolean NOT NULL DEFAULT false,
  modality        text CHECK (modality IS NULL OR modality IN ('online', 'presencial')),
  location        text,
  link            text CHECK (link IS NULL OR link ~ '^https?://'),
  description     text CHECK (description IS NULL OR length(description) <= 4000),
  hotel_id        uuid REFERENCES tdg_hotels(id) ON DELETE SET NULL,
  visibility      text NOT NULL DEFAULT 'rede' CHECK (visibility IN ('rede', 'agencia')),
  agency_id       uuid REFERENCES tdg_agencies(id) ON DELETE SET NULL,
  created_by      text NOT NULL,
  created_by_name text NOT NULL,
  created_via     text NOT NULL DEFAULT 'flow' CHECK (created_via IN ('flow', 'max')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text,
  cancelled_at    timestamptz,
  cancelled_by    text
);
CREATE INDEX IF NOT EXISTS tdg_events_starts_idx ON tdg_events (starts_at) WHERE cancelled_at IS NULL;

CREATE TABLE IF NOT EXISTS tdg_event_rsvps (
  event_id    uuid NOT NULL REFERENCES tdg_events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('vou', 'talvez', 'nao')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

COMMIT;
