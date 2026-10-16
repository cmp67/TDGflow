-- "Aprovado por cliente" — terceiro selo de confiança (porte do Trip Flow,
-- decisão da Carla 16/10/2026).
--
-- Consultora vendeu um fornecedor, o cliente voltou satisfeito, mas ninguém
-- da rede foi lá. Não é "Testado pela rede" nem "Aguardando teste". Mesmo
-- mecanismo das reviews: visit_type novo 'client_feedback' nasce com status
-- 'aprovado_cliente' (derivado no servidor, nunca do cliente). visit_type
-- não tem CHECK; só a CHECK de status precisa aceitar o valor novo.
--
-- Atenção: GET /api/reviews?source=... e os testes de api/reviews recriam
-- esta CHECK em runtime — os três lugares precisam da mesma lista.
-- Só aditiva e idempotente.

BEGIN;

ALTER TABLE tdg_hotel_reviews DROP CONSTRAINT IF EXISTS tdg_hotel_reviews_status_check;
ALTER TABLE tdg_hotel_reviews ADD CONSTRAINT tdg_hotel_reviews_status_check
  CHECK (status = ANY (ARRAY['published', 'a_testar', 'needs_review', 'aprovado_cliente']));

COMMIT;
