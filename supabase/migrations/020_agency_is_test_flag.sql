-- Migration: is_test flag em tdg_agencies
-- Aplicada em 2026-07-31 direto via psql (POSTGRES_URL). Registrada aqui só
-- para histórico/reprodutibilidade — este repo não roda migrations
-- automaticamente (ver nota em 002_tdg_agencies.sql).
--
-- A Carla criou "Agência 20 Teste" (2026-07-26) pra ter a visão de agente e
-- fazer testes, mas `active = true` é o único filtro usado hoje em queries
-- de rede (distribuição de Lumis, breakdown de uso por agência, status de
-- assinatura) — misturando essa agência de teste com as 19 reais e
-- contratadas. `is_test` separa "funciona no sistema" (active) de "conta
-- nos números agregados da rede" (NOT is_test).

ALTER TABLE tdg_agencies ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

UPDATE tdg_agencies SET is_test = true WHERE name = 'Agência 20 Teste';
