-- Memória de conversa do Max dentro do Flow (16/10/2026): o Max sai do GPT
-- Maker e passa a rodar aqui. Guarda só o que foi dirigido a ele e o que ele
-- respondeu — em grupo, nunca a conversa inteira. message_id da uazapi é a
-- chave de idempotência (webhook pode reentregar). Sem payload bruto (traz o
-- token da instância), sem dado de cliente final.
BEGIN;
CREATE TABLE IF NOT EXISTS tdg_max_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    text NOT NULL UNIQUE,
  chat_id       text NOT NULL,
  is_group      boolean NOT NULL DEFAULT false,
  direction     text NOT NULL CHECK (direction IN ('in', 'out')),
  sender_phone  text,
  user_id       uuid REFERENCES tdg_users(id) ON DELETE SET NULL,
  content       text NOT NULL,
  tokens_in     integer,
  tokens_out    integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tdg_max_messages_chat_idx ON tdg_max_messages (chat_id, created_at DESC);
COMMIT;
