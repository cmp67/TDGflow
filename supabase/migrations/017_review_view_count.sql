-- Contador de visualizações por review — combinado com Carla junto do
-- deep-link generalizado: cada abertura de review soma 1, exibido como
-- ícone de olho no card ao lado do contador de favoritos (que já existe
-- via tdg_review_favorites, só precisava virar COUNT agregado).
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;
