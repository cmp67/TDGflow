-- Migration: agency_id (uuid) becomes the real identifier for agency/credit
-- logic, replacing agency_name (TEXT) which was being used as a de-facto id
-- throughout tdg_credits_balance, tdg_agency_cycles and tdg_credits_ledger.
--
-- Aplicada em 2026-07-23 direto via psql (POSTGRES_URL), como as demais
-- migrations deste repo. Registrada aqui só para histórico/reprodutibilidade.
--
-- Backup completo tirado ANTES do ALTER COLUMN TYPE:
--   ~/tdg-flow-backups/tdg-flow-pre-agencyid-migration-<timestamp>.sql
--
-- IMPORTANTE — dados de teste removidos como parte desta migração:
-- tdg_credits_ledger (19 linhas), tdg_agency_cycles (1 linha) e
-- tdg_credits_balance (1 linha) continham apenas dados de demo/teste
-- (agency_id = 'tdg' / 'TDG Brasil') que não correspondiam a nenhuma das 19
-- agências reais do contrato. Foram DELETADOS antes do ALTER COLUMN TYPE,
-- pois não são dados financeiros reais. Ver relatório da migração para
-- detalhes.
--
-- Os 4 usuários existentes em tdg_users (contas internas/demo: TDG Brasil,
-- TDG Travel, Bemgsy) NÃO batem com nenhuma das 19 agências reais — o
-- backfill abaixo confirma 0 linhas afetadas. agency_name é mantido em
-- tdg_users como campo de exibição; agency_id passa a governar a lógica de
-- crédito/cota/pool.

-- 1. tdg_users.agency_id — nullable (nem todo usuário tem agência real ainda)
ALTER TABLE tdg_users ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES tdg_agencies(id);

UPDATE tdg_users u
SET agency_id = a.id
FROM tdg_agencies a
WHERE a.name = u.agency_name
  AND u.agency_id IS NULL;

-- 2. Limpar dados de demo/teste das 3 tabelas de crédito (ver nota acima)
DELETE FROM tdg_credits_ledger;
DELETE FROM tdg_agency_cycles;
DELETE FROM tdg_credits_balance;

-- 3. Converter agency_id de TEXT para uuid + FK, NOT NULL (todo evento de
--    crédito deve pertencer a uma agência real contratada)
ALTER TABLE tdg_credits_balance
  ALTER COLUMN agency_id TYPE uuid USING agency_id::uuid,
  ADD CONSTRAINT tdg_credits_balance_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES tdg_agencies(id);

ALTER TABLE tdg_agency_cycles
  ALTER COLUMN agency_id TYPE uuid USING agency_id::uuid,
  ADD CONSTRAINT tdg_agency_cycles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES tdg_agencies(id);

ALTER TABLE tdg_credits_ledger
  ALTER COLUMN agency_id TYPE uuid USING agency_id::uuid,
  ADD CONSTRAINT tdg_credits_ledger_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES tdg_agencies(id);

-- NOTA: src/app/api/credits/route.ts ainda usa uma pseudo-agência hardcoded
-- ("tdg", herança do "Phase 1: single pool") para o painel admin de
-- saldo/top-up. Essa constante NÃO é um uuid válido e vai quebrar em tempo
-- de execução contra as colunas migradas acima. Deliberadamente não
-- corrigido nesta migration — precisa de decisão de produto sobre como o
-- top-up deve funcionar agora que existem 19 agências reais. Ver relatório.
