-- Corrige uma lacuna real: a Fase 1 da reorganização de caixinhas devia ter
-- nascido como catálogo de FORNECEDORES (todos os entity_type), reforçado
-- pela lista da Trip Experience — mas o que foi construído só cobriu hotel.
-- Beach club/transfer/guia/restaurante nunca ganharam catálogo nem hotel_id.

ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'hotel';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tdg_hotels_entity_type_check'
  ) THEN
    ALTER TABLE tdg_hotels
      ADD CONSTRAINT tdg_hotels_entity_type_check
      CHECK (entity_type IN ('hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tdg_hotels_entity_type ON tdg_hotels (entity_type);

-- O nome sozinho não é mais único globalmente — dois fornecedores de tipos
-- diferentes podem coincidir de nome. Troca o índice único de (name) pra
-- (name, entity_type).
DROP INDEX IF EXISTS idx_tdg_hotels_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_hotels_name_type_unique ON tdg_hotels (lower(trim(name)), entity_type);

-- Backfill: reviews de tipos não-hotel que ainda não tinham hotel_id (o
-- find-or-create só rodava pra entity_type='hotel' até agora) — mesma
-- lógica match-or-create da migration 012, agora por (nome, tipo).
UPDATE tdg_hotel_reviews r
SET hotel_id = h.id
FROM tdg_hotels h
WHERE r.entity_type != 'hotel'
  AND r.hotel_id IS NULL
  AND h.entity_type = r.entity_type
  AND lower(trim(r.hotel_name)) = lower(trim(h.name));

INSERT INTO tdg_hotels (name, entity_type)
SELECT DISTINCT trim(r.hotel_name), r.entity_type
FROM tdg_hotel_reviews r
WHERE r.entity_type != 'hotel' AND r.hotel_id IS NULL
ON CONFLICT (lower(trim(name)), entity_type) DO NOTHING;

UPDATE tdg_hotel_reviews r
SET hotel_id = h.id
FROM tdg_hotels h
WHERE r.entity_type != 'hotel'
  AND r.hotel_id IS NULL
  AND h.entity_type = r.entity_type
  AND lower(trim(r.hotel_name)) = lower(trim(h.name));
