-- Abre a galeria de vídeo (tdg_knowledge, type='video') pro membro comum —
-- hoje só existe via admin (KnowledgeAdmin.tsx, /admin). Ver
-- project_tdg_flow_redesign_2607.md (item 6) e migration 009 (achado: esta
-- tabela nunca teve bootstrap em código nenhum — corrigido aqui e em
-- /api/setup/route.ts).

CREATE TABLE IF NOT EXISTS tdg_knowledge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID REFERENCES tdg_hotels(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('fact', 'pdf', 'link', 'video', 'note')),
  title         TEXT NOT NULL,
  content       TEXT,
  url           TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  source_date   DATE,
  source_author TEXT
);

-- duration_seconds e agreed_with_hotel só fazem sentido pra type='video',
-- mas ficam na tabela compartilhada (mesmo estilo pragmático do resto do
-- banco — sem tabela separada só pra vídeo).
ALTER TABLE tdg_knowledge ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
ALTER TABLE tdg_knowledge ADD COLUMN IF NOT EXISTS agreed_with_hotel BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tdg_knowledge.duration_seconds IS
  'Duração do clipe em segundos. Limite de 30s aplicado em POST /api/knowledge — vídeo acima disso é rejeitado.';
COMMENT ON COLUMN tdg_knowledge.agreed_with_hotel IS
  'Confirmação explícita de que o hotel autorizou esse vídeo circular além da rede interna (aparecer pro cliente final). Obrigatório = true pra novo upload de type=video.';
COMMENT ON COLUMN tdg_knowledge.source_author IS
  'Pra type=video: quem filmou (nome do consultor). Reaproveitado — não criamos uma coluna nova só pra atribuição de vídeo.';
COMMENT ON COLUMN tdg_knowledge.source_date IS
  'Pra type=video: data em que o vídeo foi filmado (não a data de upload) — staleness importa mais em vídeo, o quarto pode ter sido reformado desde então. Reaproveitado — não criamos filmed_at separado.';

CREATE INDEX IF NOT EXISTS idx_tdg_knowledge_hotel_type ON tdg_knowledge (hotel_id, type);
