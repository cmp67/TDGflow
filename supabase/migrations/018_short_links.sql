-- Link curto pra compartilhar internamente (Contatos/Fornecedores/Na
-- prática/Destinos/Ofertas) — código curto redireciona pra URL real via
-- /s/[code]. Idempotente por target_path: mesmo item sempre gera o mesmo
-- link curto, sem acumular lixo a cada clique em "copiar".
CREATE TABLE IF NOT EXISTS tdg_short_links (
  code        TEXT PRIMARY KEY,
  target_path TEXT NOT NULL,
  label       TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tdg_short_links_target ON tdg_short_links (target_path);
