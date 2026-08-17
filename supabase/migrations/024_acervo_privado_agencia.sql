-- Acervo privado por agência (worktree feat/private-tenant, achado 2026-08-02
-- na sessão do GUEST): a Opção A de 29/07 manteve o catálogo compartilhado
-- por design dentro da rede TDG — isso continua valendo. O que faltava é a
-- agência poder marcar um hotel/material como privado do próprio acervo,
-- sem publicar pra rede inteira. Mesmo banco (nenhuma instância nova):
-- agency_id nullable, NULL = compartilhado com a rede toda (comportamento
-- atual, sem quebra); preenchido = privado daquela agência.
--
-- Ofertas (tdg_offers) ficam de fora de propósito: não existe tabela local
-- — vêm do Bemgsy Central (hotel_offers, via REST) e são sempre curadoria
-- central, sem conceito de agência hoje. Ver src/lib/offers.ts.
ALTER TABLE tdg_hotels    ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id);
ALTER TABLE tdg_materials ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES tdg_agencies(id);

-- O índice único de nome+tipo (migration 013) era global — bloquearia duas
-- agências diferentes de cada uma ter seu próprio "Pousada do Sol" privado.
-- Troca por 2 índices parciais: duplicidade só é proibida DENTRO do mesmo
-- escopo (entre os compartilhados da rede entre si, e entre os privados de
-- UMA MESMA agência entre si) — nunca entre agências diferentes.
DROP INDEX IF EXISTS idx_tdg_hotels_name_type_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_hotels_name_type_unique_rede
  ON tdg_hotels (lower(trim(name)), entity_type) WHERE agency_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_hotels_name_type_unique_agencia
  ON tdg_hotels (lower(trim(name)), entity_type, agency_id) WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tdg_hotels_agency_id    ON tdg_hotels (agency_id);
CREATE INDEX IF NOT EXISTS idx_tdg_materials_agency_id ON tdg_materials (agency_id);
