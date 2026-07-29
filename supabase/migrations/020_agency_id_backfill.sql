-- tdg_audio_inputs, tdg_hotel_reviews e tdg_suggestions só tinham
-- agency/agency_name como texto livre, sem FK — achado da auditoria de
-- multi-tenancy de 2026-07-29 (worktree feat/private-tenant). Adiciona
-- agency_id real e faz backfill por match case-insensitive contra
-- tdg_agencies.name. Dados verificados antes desta migration: 100% das
-- linhas de tdg_hotel_reviews batem exatamente; só linhas com
-- agency/agency_name vazio (texto '') em tdg_audio_inputs (4) e
-- tdg_suggestions (2) ficam com agency_id NULL — são registros antigos
-- sem agência atribuída, não há match possível.
ALTER TABLE tdg_audio_inputs  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id);
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id);
ALTER TABLE tdg_suggestions   ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id);

UPDATE tdg_audio_inputs i
SET agency_id = a.id
FROM tdg_agencies a
WHERE i.agency_id IS NULL
  AND lower(trim(i.agency)) = lower(trim(a.name));

UPDATE tdg_hotel_reviews r
SET agency_id = a.id
FROM tdg_agencies a
WHERE r.agency_id IS NULL
  AND lower(trim(r.agency_name)) = lower(trim(a.name));

UPDATE tdg_suggestions s
SET agency_id = a.id
FROM tdg_agencies a
WHERE s.agency_id IS NULL
  AND lower(trim(s.agency_name)) = lower(trim(a.name));

CREATE INDEX IF NOT EXISTS idx_tdg_audio_inputs_agency_id  ON tdg_audio_inputs (agency_id);
CREATE INDEX IF NOT EXISTS idx_tdg_hotel_reviews_agency_id ON tdg_hotel_reviews (agency_id);
CREATE INDEX IF NOT EXISTS idx_tdg_suggestions_agency_id   ON tdg_suggestions (agency_id);
