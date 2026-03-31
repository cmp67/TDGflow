-- TDG Flow — Schema inicial

-- Catálogo de hotéis
CREATE TABLE tdg_hotels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  location text,
  country text,
  region text,
  networks text[] DEFAULT '{}',   -- ['Virtuoso', 'SLH', 'Relais & Châteaux', etc.]
  room_types text[] DEFAULT '{}', -- ['suite', 'villa', 'connecting rooms', etc.]
  description text,
  tags text[] DEFAULT '{}',       -- ['beach', 'surf', 'family', 'honeymoon', etc.]
  created_at timestamptz DEFAULT now()
);

-- Contratos TDG — vantagens negociadas por hotel
CREATE TABLE tdg_contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id uuid REFERENCES tdg_hotels(id) ON DELETE CASCADE,
  advantage_type text, -- 'upgrade', 'early_checkin', 'late_checkout', 'fb_credit', 'amenity', 'breakfast'
  description text NOT NULL,
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now()
);

-- Promoções activas com comissão
CREATE TABLE tdg_promotions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id uuid REFERENCES tdg_hotels(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  commission_rate numeric(5,2), -- percentagem ex: 20.00
  booking_deadline date,        -- data limite para reservar
  stay_from date,               -- período de estadia início
  stay_until date,              -- período de estadia fim
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Inputs de audio dos agentes
CREATE TABLE tdg_audio_inputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text,
  agency text,
  hotel_id uuid REFERENCES tdg_hotels(id),
  visit_type text CHECK (visit_type IN ('SITE_INSPECTION', 'MEETING', 'DEBRIEF')),
  recorded_at timestamptz DEFAULT now(),
  transcript text,
  summary jsonb,
  audio_url text,
  audio_shared boolean DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Dados de demonstração para o MVP

INSERT INTO tdg_hotels (name, location, country, region, networks, room_types, description, tags) VALUES
(
  'Martinhal Cascais',
  'Cascais', 'Portugal', 'Europa',
  ARRAY['Design Hotels'],
  ARRAY['suite', 'villa', 'family suite'],
  'Resort de luxo familiar em Cascais, design contemporâneo, acesso directo à praia, spa e multiple piscinas.',
  ARRAY['beach', 'family', 'portugal', 'surf', 'europe']
),
(
  'Martinhal Sagres',
  'Sagres', 'Portugal', 'Europa',
  ARRAY['Design Hotels'],
  ARRAY['villa', 'suite', 'house'],
  'Resort isolado no Algarve, rodeado por natureza e mar, ideal para famílias e casais. Surf e actividades outdoor.',
  ARRAY['beach', 'surf', 'family', 'nature', 'algarve', 'portugal', 'europe']
),
(
  'Fazenda Nova',
  'Algarve', 'Portugal', 'Europa',
  ARRAY[],
  ARRAY['suite', 'villa'],
  'Boutique hotel no interior do Algarve, ambiente rural de luxo, piscina privativa, spa, gastronomia.',
  ARRAY['algarve', 'boutique', 'romance', 'honeymoon', 'portugal', 'europe', 'spa']
),
(
  'Six Senses Douro Valley',
  'Douro', 'Portugal', 'Europa',
  ARRAY['Six Senses'],
  ARRAY['suite', 'villa', 'cottage'],
  'Palácio do século XIX reconvertido, no coração do Vale do Douro. Spa de referência mundial, vinhas, gastronomia.',
  ARRAY['douro', 'wine', 'spa', 'romance', 'honeymoon', 'portugal', 'europe', 'wellness']
),
(
  'Velaa Private Island',
  'Noonu Atoll', 'Maldivas', 'Ásia',
  ARRAY[],
  ARRAY['villa', 'overwater villa', 'pool villa'],
  'Ilha privada nas Maldivas, ultra-luxo. Campo de golfe, marina privada, múltiplos restaurantes e spa.',
  ARRAY['maldives', 'beach', 'honeymoon', 'romance', 'island', 'overwater', 'asia', 'luxury']
),
(
  'Ikos Aria',
  'Kos', 'Grécia', 'Europa',
  ARRAY['Ikos Resorts'],
  ARRAY['suite', 'bungalow', 'villa'],
  'Resort all-inclusive de luxo na ilha de Kos, gastronomia assinada, praia privada, spa.',
  ARRAY['greece', 'beach', 'all-inclusive', 'family', 'europe', 'mediterranean']
);

-- Contratos de demonstração
INSERT INTO tdg_contracts (hotel_id, advantage_type, description, valid_from, valid_until)
SELECT id, 'upgrade', 'Upgrade garantido para a categoria superior sujeito a disponibilidade', '2026-01-01', '2026-12-31'
FROM tdg_hotels WHERE name = 'Martinhal Cascais';

INSERT INTO tdg_contracts (hotel_id, advantage_type, description, valid_from, valid_until)
SELECT id, 'early_checkin', 'Early check-in às 10h e late check-out às 14h garantidos', '2026-01-01', '2026-12-31'
FROM tdg_hotels WHERE name = 'Martinhal Cascais';

INSERT INTO tdg_contracts (hotel_id, advantage_type, description, valid_from, valid_until)
SELECT id, 'fb_credit', 'Crédito F&B de €100 por estadia', '2026-01-01', '2026-12-31'
FROM tdg_hotels WHERE name = 'Martinhal Sagres';

INSERT INTO tdg_contracts (hotel_id, advantage_type, description, valid_from, valid_until)
SELECT id, 'upgrade', 'Upgrade para villa com piscina privativa sujeito a disponibilidade', '2026-01-01', '2026-12-31'
FROM tdg_hotels WHERE name = 'Six Senses Douro Valley';

INSERT INTO tdg_contracts (hotel_id, advantage_type, description, valid_from, valid_until)
SELECT id, 'amenity', 'Amenity de boas-vindas: champagne + frutas + flower arrangement', '2026-01-01', '2026-12-31'
FROM tdg_hotels WHERE name = 'Velaa Private Island';

-- Promoções de demonstração
INSERT INTO tdg_promotions (hotel_id, title, description, commission_rate, booking_deadline, stay_from, stay_until)
SELECT id,
  'Early Bird Verão 2026',
  '20% de comissão para reservas confirmadas até 30 de Junho. Desconto de 15% para o cliente.',
  20.00, '2026-06-30', '2026-07-01', '2026-08-31'
FROM tdg_hotels WHERE name = 'Martinhal Cascais';

INSERT INTO tdg_promotions (hotel_id, title, description, commission_rate, booking_deadline, stay_from, stay_until)
SELECT id,
  'Promoção Surf & Stay',
  '18% de comissão + 3 noites pelo preço de 2 para estadias em Agosto.',
  18.00, '2026-05-31', '2026-07-15', '2026-09-15'
FROM tdg_hotels WHERE name = 'Martinhal Sagres';

INSERT INTO tdg_promotions (hotel_id, title, description, commission_rate, booking_deadline, stay_from, stay_until)
SELECT id,
  'Honeymoon Exclusivo',
  '22% de comissão para pacotes lua de mel. Inclui jantar romântico e tratamento de spa.',
  22.00, '2026-04-30', '2026-05-01', '2026-12-31'
FROM tdg_hotels WHERE name = 'Velaa Private Island';

INSERT INTO tdg_promotions (hotel_id, title, description, commission_rate, booking_deadline, stay_from, stay_until)
SELECT id,
  'Escape ao Douro — Primavera',
  '15% de comissão. Inclui tour pelas vinhas e degustação privada.',
  15.00, '2026-04-15', '2026-04-01', '2026-06-30'
FROM tdg_hotels WHERE name = 'Six Senses Douro Valley';
