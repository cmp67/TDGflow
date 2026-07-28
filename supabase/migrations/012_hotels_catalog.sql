-- Fase 1 da reorganização de caixinhas: tdg_hotels já existia (com FKs
-- esperando dela em tdg_contracts/tdg_knowledge/tdg_promotions/tdg_audio_inputs)
-- mas estava vazia — o catálogo real era um array hardcoded no frontend
-- (HoteisView.tsx) e as reviews só guardavam hotel_name em texto livre, sem
-- ligação nenhuma com o catálogo. Esta migração popula tdg_hotels de verdade
-- e liga tdg_hotel_reviews a ela via hotel_id.

ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS dot_color TEXT;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS profiles TEXT[] DEFAULT '{}';
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';

-- Evita duplicata de fornecedor quando o find-or-create em POST /api/reviews
-- (daqui pra frente) tentar casar por nome.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tdg_hotels_name_unique ON tdg_hotels (lower(trim(name)));

ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES tdg_hotels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tdg_hotel_reviews_hotel_id ON tdg_hotel_reviews (hotel_id);

-- Seed: os 5 fornecedores hoje hardcoded em HoteisView.tsx — preserva os
-- mesmos UUIDs fixos já usados no frontend, pra não quebrar nenhuma
-- referência futura por id.
INSERT INTO tdg_hotels (id, name, location, country, region, description, contact_email, contact_phone, website_url, currency, group_name, image_url, dot_color, tags, profiles, gallery)
VALUES
  ('dd3cfd92-ab2e-465d-a49b-dc8de1b5a402', 'Martinhal Sagres', 'Sagres, Algarve, Portugal', 'Portugal', 'Algarve',
   'Resort 5 estrelas para famílias com quartos e villas de luxo no Parque Natural da Costa Vicentina, junto à praia do Martinhal. Baby concierge, atividades familiares e restaurantes premiados.',
   'res@martinhal.com', '+351 282 240 200', 'https://www.martinhal.com/sagres', 'EUR', 'Martinhal',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80&auto=format&fit=crop', '#7aaa5a',
   ARRAY['Beach Resort','Família','5 Estrelas','Villas'], ARRAY['Família','Resort','Praia','Villas','Natureza'],
   '[{"label":"Acomodações","url":"#"},{"label":"Atividades Família","url":"#"},{"label":"Praia do Martinhal","url":"#"}]'::jsonb),

  ('c626c5ce-f740-445b-ba3e-d746f30a7a5a', 'Martinhal Lisboa Chiado', 'Chiado, Lisboa, Portugal', 'Portugal', 'Lisboa',
   'Apartamentos de luxo com serviços 5 estrelas num edifício histórico de 1855 no Chiado/Bairro Alto. Kids Club, Baby Concierge, Bar 1855 Gin Garden.',
   'res@martinhal.com', '+351 218 507 788', 'https://www.martinhal.com/lisbon', 'EUR', 'Martinhal',
   'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80&auto=format&fit=crop', '#8080c8',
   ARRAY['Urban Luxury','Família','Apartamentos','Histórico'], ARRAY['Família','Urban','Boutique','Casais','Negócios'],
   '[{"label":"Acomodações","url":"#"},{"label":"Bar 1855","url":"#"},{"label":"Kids Club","url":"#"}]'::jsonb),

  ('91a653bd-88ec-4c50-9968-345662a09388', 'Martinhal Lisboa Oriente', 'Parque das Nações, Lisboa, Portugal', 'Portugal', 'Lisboa',
   'Apartamentos e residências de luxo junto ao Rio Tejo. Piscina, spa, restaurante terraço e espaço kids.',
   'res@martinhal.com', '+351 210 029 600', 'https://www.martinhal.com/lisbon-oriente', 'EUR', 'Martinhal',
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80&auto=format&fit=crop', '#4a8abe',
   ARRAY['Urban Luxury','Apartamentos','Riverside','Moderno'], ARRAY['Família','Urban','Casais','Negócios'],
   '[{"label":"Acomodações","url":"#"},{"label":"Spa & Piscina","url":"#"},{"label":"Restaurante Terraço","url":"#"}]'::jsonb),

  ('223dd537-61ee-45a3-8d00-22cf893a7c12', 'Martinhal Quinta do Lago', 'Quinta do Lago, Algarve, Portugal', 'Portugal', 'Algarve',
   'Resort familiar de luxo com villas privadas e piscinas próprias. Localizado na exclusiva Quinta do Lago, a poucos minutos dos melhores campos de golfe de Portugal.',
   'res@martinhal.com', '+351 289 008 300', 'https://www.martinhal.com/quinta', 'EUR', 'Martinhal',
   'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=900&q=80&auto=format&fit=crop', '#c8a060',
   ARRAY['Golf','Família','Villas','Quinta do Lago'], ARRAY['Família','Golf','Resort','Villas','Casais'],
   '[{"label":"Villas","url":"#"},{"label":"Atividades Família","url":"#"},{"label":"Piscina & Hangout","url":"#"}]'::jsonb),

  ('3791765b-3358-4ed2-beea-a6668dba16fc', 'Velaa Private Island', 'Noonu Atoll, Maldivas', 'Maldivas', 'Maldivas',
   'Resort ultra-luxo em ilha privativa nas Maldivas com villas exclusivas, gastronomia de autor e serviço excepcional. Uma das experiências mais exclusivas do Índico.',
   'reservations@velaaprivateisland.com', '+960 656 1111', 'https://www.velaaprivateisland.com', 'USD', NULL,
   'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=900&q=80&auto=format&fit=crop', '#4a9bbe',
   ARRAY['Private Island','Ultra Luxury','Overwater','Maldivas'], ARRAY['Casais','Ultra Luxury','Overwater','Resort','Natureza'],
   '[{"label":"Acomodações","url":"#"},{"label":"Aragu Restaurant","url":"#"},{"label":"Wellbeing Village","url":"#"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Backfill: review de hotel existente que bate por nome (case-insensitive,
-- sem espaços nas pontas) com o catálogo ganha o hotel_id de verdade.
UPDATE tdg_hotel_reviews r
SET hotel_id = h.id
FROM tdg_hotels h
WHERE r.entity_type = 'hotel'
  AND r.hotel_id IS NULL
  AND lower(trim(r.hotel_name)) = lower(trim(h.name));

-- Review de hotel que não bateu com nada no catálogo (hotel real mencionado
-- por um advisor mas ainda não cadastrado) ganha uma linha nova — o catálogo
-- cresce organicamente a partir de reviews reais, nenhuma fica órfã.
INSERT INTO tdg_hotels (name)
SELECT DISTINCT trim(r.hotel_name)
FROM tdg_hotel_reviews r
WHERE r.entity_type = 'hotel' AND r.hotel_id IS NULL
ON CONFLICT (lower(trim(name))) DO NOTHING;

UPDATE tdg_hotel_reviews r
SET hotel_id = h.id
FROM tdg_hotels h
WHERE r.entity_type = 'hotel'
  AND r.hotel_id IS NULL
  AND lower(trim(r.hotel_name)) = lower(trim(h.name));
