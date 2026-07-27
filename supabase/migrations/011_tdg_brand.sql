-- DNA de marca por agência (molde do agency_brand do GUEST). TDG Flow é
-- multi-tenant numa única instância (19 agências), então isso é uma linha
-- por agência, não um singleton global como no GUEST.
--
-- Esqueleto Bemgsy (navegação, Clickless Navigation, hierarquia de tela)
-- nunca é customizável — só logo + até 2 cores de destaque mudam por
-- agência. NULL em qualquer campo = usa o padrão visual do TDG Flow, sem
-- necessidade de a agência configurar nada pra começar a usar.
CREATE TABLE IF NOT EXISTS tdg_brand (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID NOT NULL UNIQUE REFERENCES tdg_agencies(id) ON DELETE CASCADE,
  logo_url         TEXT,
  primary_color    TEXT,
  secondary_color  TEXT,
  footer_text      TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tdg_brand_agency_id ON tdg_brand (agency_id);
