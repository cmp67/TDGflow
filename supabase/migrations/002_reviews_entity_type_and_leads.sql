-- tdg_hotel_reviews passa a cobrir qualquer tipo de fornecedor (não só hotel)
-- e a suportar leads de reunião comercial ligados a uma review real posterior.
ALTER TABLE tdg_hotel_reviews
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'hotel',
  ADD COLUMN IF NOT EXISTS related_lead_id UUID REFERENCES tdg_hotel_reviews(id) ON DELETE SET NULL;

ALTER TABLE tdg_hotel_reviews
  DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_entity_type_check;
ALTER TABLE tdg_hotel_reviews
  ADD CONSTRAINT tdg_hotel_reviews_entity_type_check
  CHECK (entity_type IN ('hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'));

COMMENT ON COLUMN tdg_hotel_reviews.entity_type IS
  'Tipo de fornecedor avaliado. hotel = review estruturado completo (sub-notas); os demais tipos usam o trilho leve de dica, sem sub-notas de estadia.';
COMMENT ON COLUMN tdg_hotel_reviews.related_lead_id IS
  'Quando uma review real (site_inspection/fam_trip) confirma um lead de reunião comercial, aponta pro registro original — nunca sobrescreve o relato de quem descobriu.';

CREATE INDEX IF NOT EXISTS idx_tdg_hotel_reviews_entity_type ON tdg_hotel_reviews (entity_type);
CREATE INDEX IF NOT EXISTS idx_tdg_hotel_reviews_status ON tdg_hotel_reviews (status);

-- status é decidido pelo servidor (a partir de visit_type), nunca pelo cliente —
-- restringe aos dois valores reais em uso hoje.
ALTER TABLE tdg_hotel_reviews
  DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_status_check;
ALTER TABLE tdg_hotel_reviews
  ADD CONSTRAINT tdg_hotel_reviews_status_check
  CHECK (status IN ('published', 'a_testar'));
