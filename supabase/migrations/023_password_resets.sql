-- Tokens de "esqueci minha senha". Guarda o hash do token (sha256), nunca o
-- valor puro — diferente de tdg_invites.token (que fica em texto puro), esse
-- fluxo é self-service e o link pode vazar por log/referrer/backup de forma
-- mais fácil que um convite criado deliberadamente por um admin, então vale
-- o mesmo cuidado que já temos com password_hash. Expira em 1h (bem mais
-- curto que os 30 dias de um convite) e é de uso único (used_at).
CREATE TABLE IF NOT EXISTS tdg_password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 hour',
  used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tdg_password_resets_user_id ON tdg_password_resets (user_id);
