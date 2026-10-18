-- Estado do Max (18/10/2026): chave/valor pequeno, hoje só o LID da própria
-- instância (aprendido das mensagens fromMe, pra reconhecer menção por toque
-- quando o WhatsApp usa LID). Só aditiva e idempotente.
BEGIN;
CREATE TABLE IF NOT EXISTS tdg_max_state (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
