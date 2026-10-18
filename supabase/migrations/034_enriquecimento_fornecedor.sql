-- Enriquecimento do card do fornecedor com dados públicos (pedido da Carla
-- 16/10/2026, construído 18/10): quando um card nasce de contato, cartão ou
-- relato, o Flow busca no Google Places foto, endereço, site e telefone e
-- guarda como PROPOSTA pendente; quem criou o card (ou admin) aprova ou
-- descarta. Nada entra no card sem revisão. Só aditiva e idempotente.
BEGIN;
ALTER TABLE tdg_hotels
  ADD COLUMN IF NOT EXISTS google_place_id        text,
  ADD COLUMN IF NOT EXISTS enrichment             jsonb,
  ADD COLUMN IF NOT EXISTS enrichment_status      text,
  ADD COLUMN IF NOT EXISTS enriched_at            timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_reviewed_by text;
ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_enrichment_status_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_enrichment_status_check
  CHECK (enrichment_status IS NULL OR enrichment_status IN ('pending', 'approved', 'rejected', 'not_found'));
COMMIT;
