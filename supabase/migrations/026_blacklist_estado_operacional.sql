-- Blacklist manual + estado operacional do fornecedor (porte do Trip Flow,
-- decisão da Carla 16/10/2026; no Trip: migrations 023 e 032).
--
-- Blacklist: marca manual NEGATIVA, com motivo obrigatório ("quando for
-- blacklist precisa ter um espaço pra escrever o ocorrido"). "Testado" já é
-- derivado de reviews reais — não duplicar.
-- Estado operacional: em operação / fechado para reforma (com data prevista
-- de reabertura) / fechado definitivamente (com motivo). Fechar é estado,
-- não exclusão: review, condição comercial, contato continuam ligados.
-- Só aditiva e idempotente. Toda linha existente nasce 'ativo'.

BEGIN;

ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS blacklist_reason text;
ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_blacklist_reason_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_blacklist_reason_check
  CHECK (
    (is_blacklisted = false AND blacklist_reason IS NULL)
    OR (is_blacklisted = true AND blacklist_reason IS NOT NULL AND length(trim(blacklist_reason)) > 0)
  );
CREATE INDEX IF NOT EXISTS idx_tdg_hotels_is_blacklisted ON tdg_hotels (is_blacklisted) WHERE is_blacklisted = true;

ALTER TABLE tdg_hotels
  ADD COLUMN IF NOT EXISTS operational_status  text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS operational_note    text,
  ADD COLUMN IF NOT EXISTS reopening_expected  date;
ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_operational_status_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_operational_status_check
  CHECK (operational_status IN ('ativo', 'reforma', 'fechado'));
ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_reforma_date_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_reforma_date_check
  CHECK (operational_status <> 'reforma' OR reopening_expected IS NOT NULL);
ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_fechado_note_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_fechado_note_check
  CHECK (operational_status <> 'fechado' OR btrim(coalesce(operational_note, '')) <> '');
ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_reopening_only_reforma_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_reopening_only_reforma_check
  CHECK (operational_status = 'reforma' OR reopening_expected IS NULL);
CREATE INDEX IF NOT EXISTS idx_tdg_hotels_operational_status
  ON tdg_hotels (operational_status) WHERE operational_status <> 'ativo';

COMMIT;
