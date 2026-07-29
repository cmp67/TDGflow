-- Benefícios negociados por fornecedor (comissão diferenciada, amenidade
-- exclusiva, condição de pagamento, outro) + log de auditoria genérico —
-- combinado com Carla: qualquer mudança sensível (benefício de fornecedor,
-- promoção de papel de usuário) fica registrada e visível pra rede.

CREATE TABLE IF NOT EXISTS tdg_hotel_benefits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES tdg_hotels(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN ('comissao', 'amenidade', 'pagamento', 'outro')),
  description     TEXT NOT NULL,
  commission_pct  NUMERIC(5,2),
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tdg_hotel_benefits_hotel ON tdg_hotel_benefits (hotel_id);

-- entity_type + entity_id é genérico de propósito — próxima feature que
-- precisar de trilha de auditoria reusa esta mesma tabela, sem migração nova.
CREATE TABLE IF NOT EXISTS tdg_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  summary         TEXT NOT NULL,
  changed_by      TEXT NOT NULL,
  changed_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tdg_audit_log_entity ON tdg_audit_log (entity_type, entity_id, created_at DESC);
