-- Canal de comunicação Bemgsy → agências: documentação da parceria, vídeos
-- de reunião/atas e comunicados de roadmap. Publicação é admin-only (só a
-- Bemgsy sobe conteúdo) — diferente de tdg_materials, que é contribuição
-- aberta a qualquer agente. Achado na ata do Adriano de 24/07/2026.
CREATE TABLE IF NOT EXISTS tdg_partnership_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN ('documento', 'video_ata', 'comunicado')),
  title       TEXT NOT NULL,
  description TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('file', 'link')),
  file_url    TEXT,
  link_url    TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tdg_partnership_content_kind_url_check CHECK (
    (kind = 'file' AND file_url IS NOT NULL AND link_url IS NULL) OR
    (kind = 'link' AND link_url IS NOT NULL AND file_url IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tdg_partnership_content_category ON tdg_partnership_content (category, created_at DESC);
