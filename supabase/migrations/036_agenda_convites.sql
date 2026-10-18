-- Convites da Agenda da rede (18/10/2026, paridade com a Agenda do Time do
-- GUEST): quem cria convida pessoas da rede; cada convidado recebe e-mail e
-- WhatsApp (marcamos quando cada canal saiu) e confirma presença na Agenda.
-- Só aditiva e idempotente.
BEGIN;
CREATE TABLE IF NOT EXISTS tdg_event_invites (
  event_id              uuid NOT NULL REFERENCES tdg_events(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
  invited_by            text NOT NULL,
  invited_at            timestamptz NOT NULL DEFAULT now(),
  notified_email_at     timestamptz,
  notified_whatsapp_at  timestamptz,
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS tdg_event_invites_user_idx ON tdg_event_invites (user_id);
COMMIT;
