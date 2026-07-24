-- Migration: tdg_invites — self-registration invites for the 19 agencies.
--
-- Aplicada em 2026-07-23 direto via psql (POSTGRES_URL), mesmo padrão das
-- migrations anteriores deste repo (schema não é gerido por migration
-- runner automático). Registrada aqui só para histórico/reprodutibilidade.
--
-- Produto: a Bemgsy gera um convite único por agência (role='agency_admin').
-- A pessoa indicada usa o link em /flow/signup/[token] para criar a própria
-- conta e virar admin da própria agência. A partir daí, o agency_admin gera
-- os próprios convites (role='agent') para a equipe dele via /flow/equipe —
-- mesma tabela, só muda o role gravado no convite.
--
-- token é gerado com crypto.randomBytes(32).toString('hex') (256 bits de
-- entropia) em src/lib/invites.ts — não sequencial, não adivinhável.
--
-- expires_at = 30 dias é uma escolha conservadora (Carla pode revisar): tempo
-- suficiente para a agência se organizar sem deixar um link de convite
-- vivo indefinidamente.

CREATE TABLE IF NOT EXISTS tdg_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text NOT NULL UNIQUE,
  agency_id   uuid NOT NULL REFERENCES tdg_agencies(id),
  role        text NOT NULL CHECK (role IN ('agency_admin', 'agent')),
  created_by  uuid REFERENCES tdg_users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at     timestamptz,
  used_by     uuid REFERENCES tdg_users(id)
);

CREATE INDEX IF NOT EXISTS tdg_invites_agency_id_idx ON tdg_invites (agency_id);

-- NOTA: tdg_users.role não tem CHECK constraint (é `text NOT NULL DEFAULT
-- 'agent'`), então o novo valor 'agency_admin' é aceito sem ALTER algum —
-- confirmado via `\d tdg_users` antes desta migration. tdg_users.agency_name
-- continua NOT NULL (sem default), então todo INSERT de self-signup precisa
-- resolver o nome da agência a partir de tdg_agencies.name (via agency_id do
-- convite) e gravá-lo também — ver src/app/api/signup/route.ts.
