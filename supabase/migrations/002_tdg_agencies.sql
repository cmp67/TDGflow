-- Migration: tdg_agencies
-- Aplicada em 2026-07-23 direto via psql (POSTGRES_URL). Registrada aqui só
-- para histórico/reprodutibilidade — este repo não roda migrations
-- automaticamente (schema é gerido via src/app/api/setup/route.ts, que NÃO
-- deve ser re-executado: ele reseeda dados de demo que foram intencionalmente
-- removidos em 2026-07-23 — ver reset da base "Galera do Turismo").
--
-- Lista das 19 agências vem do quadro de assinaturas do contrato oficial:
-- Contrato_Servicos_Bemgsy_TDG_Flow_v1_Julho2026.html (Cláusula 2.1 — Plano
-- Growth, "dimensionado para a rede de 19 agências credenciadas").

CREATE TABLE IF NOT EXISTS tdg_agencies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  cnpj        text NOT NULL UNIQUE,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO tdg_agencies (name, cnpj) VALUES
  ('Ana Terra Viagens e Turismo', '59.145.615/0001-59'),
  ('APPTITE Travel', '21.338.381/0001-93'),
  ('Carol Cordeiro Viagens', '14.888.718/0001-70'),
  ('Coltro Viagens', '08.449.131/0001-62'),
  ('Danielle Filippozzi Viagens Personalizadas', '14.736.434/0001-69'),
  ('Elaine Scanavacca Viagens', '02.350.357/0001-25'),
  ('FB Travel', '11.062.674/0001-37'),
  ('Flaptur', '04.003.611/0001-44'),
  ('Get Out N About Travel', '16.625.632/0001-80'),
  ('H3R Viagens', '12.551.443/0001-50'),
  ('Haus 22 Viagens', '28.398.466/0001-06'),
  ('Link Premium Viagens e Turismo', '09.104.301/0001-30'),
  ('Trivia Viagens', '49.686.902/0001-12'),
  ('Mali Travel', '31.853.767/0001-97'),
  ('Six Viagens', '14.327.710/0001-35'),
  ('TA Travel', '09.170.577/0001-16'),
  ('Team Travel', '00.165.202/0001-93'),
  ('Travel Hunter', '25.304.323/0001-08'),
  ('Travel&Soul', '24.189.469/0001-89')
ON CONFLICT (cnpj) DO NOTHING;
