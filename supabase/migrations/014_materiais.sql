-- Materiais da rede TDG: contratos/acordos, formulários, treinamento — antes só
-- um placeholder "em breve". Cada material é um arquivo (Vercel Blob) ou um
-- link externo (ex: vídeo de treinamento, pasta de terceiro com atribuição).

CREATE TABLE IF NOT EXISTS tdg_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN ('contrato_acordo', 'formulario', 'treinamento', 'outro')),
  title       TEXT NOT NULL,
  description TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('file', 'link')),
  file_url    TEXT,
  link_url    TEXT,
  source_note TEXT,  -- atribuição, quando o material vem de terceiro (ex: "Fonte: Protur Brasil")
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tdg_materials_kind_url_check CHECK (
    (kind = 'file' AND file_url IS NOT NULL AND link_url IS NULL) OR
    (kind = 'link' AND link_url IS NOT NULL AND file_url IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tdg_materials_category ON tdg_materials (category, created_at DESC);
