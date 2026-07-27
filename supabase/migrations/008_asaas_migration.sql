-- Migração de gateway de pagamento: Mercado Pago → Asaas (decisão da Carla,
-- 2026-07-26 à noite — Asaas facilita gestão de cobrança e emissão de nota
-- fiscal). Nenhuma das 19 agências tinha assinatura real ativa no Mercado
-- Pago ainda (confirmado com a Carla antes de migrar), então é uma troca
-- limpa — sem dado de assinante real pra migrar/reconciliar.
--
-- Coluna renomeada em vez de mantida como shim de compatibilidade: o
-- Mercado Pago está sendo desligado de vez, não mantido em paralelo.
ALTER TABLE tdg_agency_subscriptions
  RENAME COLUMN mp_preapproval_id TO provider_subscription_id;

ALTER TABLE tdg_agency_subscriptions
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;

COMMENT ON COLUMN tdg_agency_subscriptions.provider_subscription_id IS
  'ID da assinatura no gateway de pagamento ativo (Asaas: sub_xxx).';
COMMENT ON COLUMN tdg_agency_subscriptions.provider_customer_id IS
  'ID do cliente no gateway de pagamento ativo (Asaas: cus_xxx) — criado junto com o checkout.';
