-- TDG Knowledge Base ganha o que o Acervo do Trip Flow tem (decisão da Carla
-- 16/10/2026: evoluir a tabela existente, nunca um segundo acervo):
--   - tipos com intenção: além de fact/note/link, 'aviso' e 'roteiro';
--   - testado (true = a rede viveu/operou; false = indicação a testar;
--     NULL = não informado — todo o histórico importado nasce assim, nunca
--     rotulado por engano);
--   - revisar_em: prazo de revisão por tipo; passou, a tela diz "pode estar
--     desatualizado" (backfill: data da fonte + 12 meses);
--   - editar guarda a versão anterior (tdg_conteudo_versoes, genérica);
--   - nada se apaga: arquiva-se (status).
-- pending-content, /api/search e o import continuam lendo a mesma tabela.
-- Só aditiva e idempotente.

BEGIN;

ALTER TABLE tdg_destination_knowledge DROP CONSTRAINT IF EXISTS tdg_destination_knowledge_type_check;
ALTER TABLE tdg_destination_knowledge ADD CONSTRAINT tdg_destination_knowledge_type_check
  CHECK (type IN ('fact', 'note', 'link', 'aviso', 'roteiro'));

ALTER TABLE tdg_destination_knowledge
  ADD COLUMN IF NOT EXISTS testado        boolean,
  ADD COLUMN IF NOT EXISTS revisar_em     date,
  ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'publicado',
  ADD COLUMN IF NOT EXISTS versao         integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by     text,
  ADD COLUMN IF NOT EXISTS arquivado_em   timestamptz,
  ADD COLUMN IF NOT EXISTS arquivado_por  text;

ALTER TABLE tdg_destination_knowledge DROP CONSTRAINT IF EXISTS tdg_destination_knowledge_status_check;
ALTER TABLE tdg_destination_knowledge ADD CONSTRAINT tdg_destination_knowledge_status_check
  CHECK (status IN ('publicado', 'arquivado'));

UPDATE tdg_destination_knowledge SET revisar_em = source_date + INTERVAL '12 months' WHERE revisar_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_tdg_destination_knowledge_status
  ON tdg_destination_knowledge (status) WHERE status <> 'publicado';

CREATE TABLE IF NOT EXISTS tdg_conteudo_versoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade     text NOT NULL,
  entidade_id  uuid NOT NULL,
  versao       integer NOT NULL,
  snapshot     jsonb NOT NULL,
  editado_por  text NOT NULL,
  editado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entidade, entidade_id, versao)
);

COMMIT;
