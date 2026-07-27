-- Documenta o schema real de 4 tabelas que já rodam em produção há tempo mas
-- nunca foram registradas em nenhuma migration — só existiam via
-- `CREATE TABLE IF NOT EXISTS` espalhado em rotas de API (ou, no caso de
-- tdg_knowledge, nem isso: nenhum bootstrap em código nenhum, criada
-- inteiramente fora de banda via psql/dashboard). Dívida técnica flagada
-- desde a sessão de redesign de 26/07 (ver memória
-- project_tdg_flow_redesign_2607.md).
--
-- Este arquivo é só documentação/rastreabilidade — reflete exatamente o que
-- já está rodando, sem nenhuma mudança de comportamento. Todas as
-- instruções são idempotentes (IF NOT EXISTS), no-op contra o banco atual.

-- ── tdg_users ────────────────────────────────────────────────────────────
-- Base criada em src/app/api/setup/route.ts; colunas whatsapp e
-- agent_interaction_id adicionadas via ALTER TABLE no mesmo arquivo;
-- agency_id (FK) veio da migration 003_agency_id_uuid.sql.
CREATE TABLE IF NOT EXISTS tdg_users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  email                 TEXT UNIQUE NOT NULL,
  agency_name           TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'agent',
  active                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  avatar_url            TEXT,
  whatsapp              TEXT UNIQUE,
  agent_interaction_id  TEXT UNIQUE,
  agency_id             UUID REFERENCES tdg_agencies(id)
);

-- ── tdg_review_favorites ────────────────────────────────────────────────
-- Base criada em src/app/api/setup/route.ts, sem alteração desde então.
CREATE TABLE IF NOT EXISTS tdg_review_favorites (
  agent_id    UUID NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
  review_id   UUID NOT NULL REFERENCES tdg_hotel_reviews(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, review_id)
);

-- ── tdg_hotel_contacts ──────────────────────────────────────────────────
-- ACHADO: o CREATE TABLE em src/app/api/hotel-contacts/route.ts só define
-- as primeiras 10 colunas abaixo (id..created_at) — as 6 colunas seguintes
-- (source_author, source_date, category, context_trigger, organization,
-- is_network_contact) existem em produção mas não são criadas por NENHUM
-- caminho de código, nem aqui nem em ALTER TABLE nenhum. Foram adicionadas
-- fora de banda (psql/dashboard direto), sem rastro na aplicação. Esta
-- migration documenta a coluna extra via ALTER TABLE ADD COLUMN IF NOT
-- EXISTS pra pelo menos existir um registro — mas o CREATE TABLE em
-- hotel-contacts/route.ts continua desatualizado e não foi tocado aqui
-- (fora do escopo desta tarefa, que é só documentação).
CREATE TABLE IF NOT EXISTS tdg_hotel_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL,
  added_by      TEXT,
  name          TEXT NOT NULL,
  surname       TEXT NOT NULL,
  title         TEXT,
  email         TEXT,
  whatsapp      TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tdg_hotel_contacts ADD COLUMN IF NOT EXISTS source_author       TEXT;
ALTER TABLE tdg_hotel_contacts ADD COLUMN IF NOT EXISTS source_date         DATE;
ALTER TABLE tdg_hotel_contacts ADD COLUMN IF NOT EXISTS category            TEXT;
ALTER TABLE tdg_hotel_contacts ADD COLUMN IF NOT EXISTS context_trigger     TEXT;
ALTER TABLE tdg_hotel_contacts ADD COLUMN IF NOT EXISTS organization        TEXT;
ALTER TABLE tdg_hotel_contacts ADD COLUMN IF NOT EXISTS is_network_contact  BOOLEAN DEFAULT false;

-- ── tdg_knowledge ───────────────────────────────────────────────────────
-- ACHADO MAIS SÉRIO: esta tabela não tem NENHUM bootstrap em código —
-- nem em /api/setup/route.ts nem em src/app/api/knowledge/route.ts (que só
-- faz SELECT/INSERT/DELETE, assumindo que a tabela já existe). Foi criada
-- inteiramente fora de banda. Um ambiente novo rodando /api/setup hoje
-- NUNCA teria essa tabela — POST /api/knowledge falharia com "relation
-- does not exist". Esta migration é o único lugar em todo o repo onde o
-- schema real dela fica registrado.
CREATE TABLE IF NOT EXISTS tdg_knowledge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID REFERENCES tdg_hotels(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('fact', 'pdf', 'link', 'video', 'note')),
  title         TEXT NOT NULL,
  content       TEXT,
  url           TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  source_date   DATE,
  source_author TEXT
);

COMMENT ON TABLE tdg_hotel_contacts IS
  'Schema real documentado em 009 — CREATE TABLE em hotel-contacts/route.ts está desatualizado (faltam 6 colunas). Ver comentário na migration.';
COMMENT ON TABLE tdg_knowledge IS
  'Tabela sem bootstrap em nenhum código de aplicação — só existe porque foi criada fora de banda em produção. Esta migration é a única fonte de schema documentada.';
