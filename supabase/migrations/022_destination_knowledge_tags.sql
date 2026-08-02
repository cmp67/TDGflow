-- Fase 5 do plano TDG Knowledge Base (docs/plano-tdg-knowledge-base.md).
--
-- 1) O CHECK (country IS NOT NULL OR hotel_id IS NOT NULL) bloqueia o import
--    de conhecimento geral do setor sem destino (alerta de golpe, regra
--    fiscal, prática de operadora) — 32% dos 626 registros de "Conhecimento
--    de viagem" da extração do WhatsApp. A decisão #1 original (painel Tesla)
--    previa "país/tag", mas só a coluna country virou CHECK obrigatório.
--    Removido: country e hotel_id ficam genuinamente opcionais, sem gate.
--
-- 2) Nova coluna tags — classificação temática (pandemia, aéreo, golpe, etc,
--    decisão da Carla 02/08) pra sustentar busca por tag no TDG Knowledge Base.
ALTER TABLE tdg_destination_knowledge DROP CONSTRAINT IF EXISTS tdg_destination_knowledge_check;
ALTER TABLE tdg_destination_knowledge ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_tdg_destination_knowledge_tags ON tdg_destination_knowledge USING GIN (tags);
