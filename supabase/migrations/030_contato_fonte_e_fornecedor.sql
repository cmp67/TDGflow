-- Contato com fonte e fornecedor automático (pedido da Carla, 16/10/2026).
-- Caso real: Carol cadastrou duas pessoas da Tekser (DMC) pelo cartão e o
-- Flow não criou o card do DMC, não mostrava quem registrou nem quando, e
-- não havia onde dizer de onde veio o contato (feira, indicação...).
-- added_by (nome) e created_at já existiam; faltava expor e dar a fonte.
-- Só aditiva e idempotente.
BEGIN;
ALTER TABLE tdg_hotel_contacts
  ADD COLUMN IF NOT EXISTS added_by_email text,
  ADD COLUMN IF NOT EXISTS source_kind    text,
  ADD COLUMN IF NOT EXISTS source_detail  text;
ALTER TABLE tdg_hotel_contacts DROP CONSTRAINT IF EXISTS tdg_hotel_contacts_source_kind_check;
ALTER TABLE tdg_hotel_contacts ADD CONSTRAINT tdg_hotel_contacts_source_kind_check
  CHECK (source_kind IS NULL OR source_kind IN ('feira', 'indicacao', 'reuniao', 'viagem', 'whatsapp', 'site', 'outro'));
COMMIT;
