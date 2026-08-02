-- Migration: schema pra TDG Knowledge Base (ingestão do histórico do
-- WhatsApp + fila de aprovação do autor + badges de expertise)
-- Aplicada em 01/08/2026 direto via psql (POSTGRES_URL). Registrada aqui só
-- para histórico/reprodutibilidade — este repo não roda migrations
-- automaticamente (ver nota em 002_tdg_agencies.sql).
--
-- Plano completo, todas as decisões e o raciocínio por trás de cada coluna:
-- docs/plano-tdg-knowledge-base.md (seção 3), revisado e commitado em 83311f4.

-- ── 3.1 tdg_hotels ──────────────────────────────────────────────────────
-- is_partner separa pra sempre os fornecedores com contrato real dos
-- que só serão mencionados pela rede (import do WhatsApp) — sem isso a
-- distinção se perde (achado do painel Tesla, porta de mão única).
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual'
  CHECK (origin IN ('manual','whatsapp_import'));
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS mention_count int;

-- Marca os curados de hoje ANTES de qualquer import — roda uma vez só,
-- na aplicação desta migration (não repete no import, que é um passo
-- separado e posterior).
UPDATE tdg_hotels SET is_partner = true WHERE origin = 'manual';

ALTER TABLE tdg_hotels DROP CONSTRAINT IF EXISTS tdg_hotels_entity_type_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_entity_type_check
  CHECK (entity_type IN ('hotel','beach_club','transfer','guide','restaurant','dmc','other'));

-- countries é aditivo — `country` (singular) continua existindo e
-- funcionando como está; countries é só pra quem atende mais de um país
-- (ex: DMC numa reunião comercial).
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS countries text[] NOT NULL DEFAULT '{}';

-- ── 3.4 tdg_destination_knowledge (tabela nova) ────────────────────────
-- Conhecimento de destino/país que não é ligado a um hotel específico —
-- tdg_knowledge (existente) é hotel-scoped, não serve pra isso.
CREATE TABLE IF NOT EXISTS tdg_destination_knowledge (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 text NOT NULL DEFAULT 'fact' CHECK (type IN ('fact','note','link')),
  title                text NOT NULL,
  content              text,
  url                  text,
  country              text,               -- texto livre, nullable — nunca gateia o insert nisso
  region               text,               -- cidade/região opcional (ex: "Veneza")
  hotel_id             uuid REFERENCES tdg_hotels(id) ON DELETE SET NULL,  -- pros poucos itens hotel-específicos
  source_author        text NOT NULL,      -- obrigatório (decisão #6 — nunca null)
  source_date          date NOT NULL,      -- obrigatório (decisão #6 — nunca null)
  -- fila de aprovação do autor (decisões #14-16) — mesmas colunas de
  -- tdg_hotel_reviews abaixo, já nascem aqui na criação da tabela.
  import_approval      text CHECK (import_approval IN ('pending','approved_by_author','approved_by_admin')),
  import_approval_at   timestamptz,
  import_approval_by   uuid REFERENCES tdg_users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (country IS NOT NULL OR hotel_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_tdg_destination_knowledge_country ON tdg_destination_knowledge (lower(trim(country)));
CREATE INDEX IF NOT EXISTS idx_tdg_destination_knowledge_hotel_id ON tdg_destination_knowledge (hotel_id) WHERE hotel_id IS NOT NULL;

-- ── 3.5 Aprovação do autor (decisões #14-16) — tdg_hotel_reviews ───────
-- Só se aplica a linhas com origem whatsapp_import — review orgânica não
-- passa por isso, fica sempre NULL.
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS import_approval text
  CHECK (import_approval IN ('pending','approved_by_author','approved_by_admin'));
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS import_approval_at timestamptz;
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS import_approval_by uuid REFERENCES tdg_users(id);

-- ── 3.6 tdg_badges (tabela nova — decisões #17-20) ─────────────────────
-- "Voz de [País]" e "Referência em [Categoria]" são títulos atuais (podem
-- trocar de dono); "Pioneira" é fato histórico permanente (is_current
-- nunca vira false pra esse tipo).
CREATE TABLE IF NOT EXISTS tdg_badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
  badge_type  text NOT NULL CHECK (badge_type IN ('voz_do_destino','referencia_categoria','pioneira')),
  context     text NOT NULL,                    -- país (ex: "Grécia"), categoria (ex: "beach_club"), ou hotel_id::text pra pioneira
  hotel_id    uuid REFERENCES tdg_hotels(id),    -- só preenchido em 'pioneira'
  is_current  boolean NOT NULL DEFAULT true,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  lost_at     timestamptz
);
-- garante só 1 titular atual por (tipo, contexto) por vez — histórico
-- fica registrado na tabela, só is_current muda quando o título troca de dono.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_badges_current_holder
  ON tdg_badges (badge_type, context) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_tdg_badges_user_id ON tdg_badges (user_id);
