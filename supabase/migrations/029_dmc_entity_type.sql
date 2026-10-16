-- DMC como tipo de fornecedor de verdade (pedido da Carla, 16/10/2026).
-- tdg_hotels já aceitava 'dmc' desde a migration 021; faltava a review e a
-- UI. Os 23 fornecedores da importação de 16/10 classificados como DMC
-- entraram como 'other' por isso — reclassificados por script na mesma data.
-- Só aditiva e idempotente.
BEGIN;
ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_entity_type_check;
ALTER TABLE tdg_hotel_reviews ADD CONSTRAINT tdg_hotel_reviews_entity_type_check
  CHECK (entity_type = ANY (ARRAY['hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'dmc', 'roteiro', 'other']));
COMMIT;
