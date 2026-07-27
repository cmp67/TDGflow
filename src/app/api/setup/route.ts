import { sql } from '@vercel/postgres'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const setupToken = process.env.SETUP_TOKEN ?? 'tdg-setup-2026'
  if (token !== setupToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await sql`
    CREATE TABLE IF NOT EXISTS tdg_users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      agency_name   TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'agent',
      active        BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tdg_hotel_reviews (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_name       TEXT NOT NULL,
      country          TEXT,
      agent_id         UUID REFERENCES tdg_users(id) ON DELETE SET NULL,
      agent_name       TEXT NOT NULL,
      agency_name      TEXT NOT NULL,
      visit_date       DATE,
      visit_type       TEXT,  -- fam_trip | site_inspection | personal_stay | commercial_meeting
      overall_rating   INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
      rooms_rating     INTEGER CHECK (rooms_rating BETWEEN 1 AND 5),
      service_rating   INTEGER CHECK (service_rating BETWEEN 1 AND 5),
      food_rating      INTEGER CHECK (food_rating BETWEEN 1 AND 5),
      location_rating  INTEGER CHECK (location_rating BETWEEN 1 AND 5),
      highlights       TEXT[],   -- AI-extracted key points
      client_profile   TEXT,     -- ideal client profile
      must_experience  TEXT,     -- must-do on property
      heads_up         TEXT,     -- caveats / things to know
      raw_answers      JSONB,    -- verbatim questionnaire answers
      status           TEXT NOT NULL DEFAULT 'published',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  // Add country column if it doesn't exist yet (idempotent)
  await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS country TEXT`

  // entity_type + related_lead_id (idempotent) — ver supabase/migrations/002_reviews_entity_type_and_leads.sql
  await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'hotel'`
  await sql`ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS related_lead_id UUID REFERENCES tdg_hotel_reviews(id) ON DELETE SET NULL`
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tdg_hotel_reviews_entity_type_check'
      ) THEN
        ALTER TABLE tdg_hotel_reviews
          ADD CONSTRAINT tdg_hotel_reviews_entity_type_check
          CHECK (entity_type IN ('hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'));
      END IF;
    END $$
  `
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tdg_hotel_reviews_status_check'
      ) THEN
        ALTER TABLE tdg_hotel_reviews
          ADD CONSTRAINT tdg_hotel_reviews_status_check
          CHECK (status IN ('published', 'a_testar'));
      END IF;
    END $$
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_tdg_hotel_reviews_entity_type ON tdg_hotel_reviews (entity_type)`
  await sql`CREATE INDEX IF NOT EXISTS idx_tdg_hotel_reviews_status ON tdg_hotel_reviews (status)`

  await sql`
    CREATE TABLE IF NOT EXISTS tdg_review_favorites (
      agent_id   UUID NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
      review_id  UUID NOT NULL REFERENCES tdg_hotel_reviews(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (agent_id, review_id)
    )
  `

  // Seed admin user
  const adminHash = await hash('tdgadmin2026', 12)
  await sql`
    INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
    VALUES ('Administrador TDG', 'admin@tdgbrasil.com.br', 'TDG Brasil', ${adminHash}, 'admin')
    ON CONFLICT (email) DO NOTHING
  `

  // Seed demo agent user
  const passwordHash = await hash('tdgflow2026', 12)
  await sql`
    INSERT INTO tdg_users (name, email, agency_name, password_hash, role)
    VALUES ('Ana Oliveira', 'demo@tdgbrasil.com.br', 'TDG Travel', ${passwordHash}, 'agent')
    ON CONFLICT (email) DO NOTHING
  `

  // Seed sample reviews
  await sql`
    INSERT INTO tdg_hotel_reviews
      (hotel_name, country, agent_name, agency_name, visit_date, visit_type,
       overall_rating, rooms_rating, service_rating, food_rating, location_rating,
       highlights, client_profile, must_experience, heads_up)
    VALUES
      ('Martinhal Sagres', 'Portugal', 'Ana Oliveira', 'TDG Travel', '2026-02-15', 'fam_trip',
       5, 5, 5, 4, 5,
       ARRAY['Kids club de altíssimo nível, baby monitoring incluso', 'Acesso direto à praia privativa', 'Piscina aquecida o ano todo', 'Staff fala português fluente'],
       'Famílias com crianças de 0 a 12 anos, especialmente primeira viagem internacional',
       'Tour de barco até as Grutas de Sagres ao pôr do sol',
       'Unidades superiores ficam do lado oposto à praia — pedir vista mar na hora da reserva'),
      ('Martinhal Sagres', 'Portugal', 'Carlos Medeiros', 'Via Luxo Viagens', '2025-09-10', 'site_inspection',
       4, 4, 5, 4, 5,
       ARRAY['Serviço impecável, staff altamente treinado', 'Restaurante de frutos do mar premiado', 'Arquitetura integrada à natureza'],
       'Casais e famílias buscando tranquilidade com conforto 5 estrelas',
       'Jantar no restaurante Gusto by Heinz Beck',
       'Alta temporada esgota 6+ meses antes'),
      ('Velaa Private Island', 'Maldivas', 'Mariana Fontes', 'Elite Travel', '2026-01-20', 'fam_trip',
       5, 5, 5, 5, 5,
       ARRAY['Uma ilha inteira dedicada ao hóspede — privacidade absoluta', 'Cada villa tem piscina privativa sobre a água', 'Chef pessoal disponível 24h', 'Spa Arrehehi com rituais inspirados na cultura maldiviana'],
       'UHNWI, lua de mel premium, aniversários especiais — clientes que não aceitam segundo melhor',
       'Mergulho no recife privativo com o resident marine biologist',
       'Transferência de seaplano inclusa apenas nas categorias superiores — verificar antes de confirmar')
    ON CONFLICT DO NOTHING
  `

  // Seed bulk reviews for realistic analytics (idempotent via DO NOTHING)
  await sql`
    INSERT INTO tdg_hotel_reviews
      (hotel_name, country, agent_name, agency_name, visit_date, visit_type, overall_rating, highlights, created_at)
    VALUES
      ('Four Seasons Lisbon','Portugal','Beatriz Carvalho','Elite Travel','2026-03-10','site_inspection',5,ARRAY['Rooftop com vista 360° para Lisboa','Spa de referência em Portugal'],NOW() - INTERVAL '25 days'),
      ('Four Seasons Lisbon','Portugal','Rafael Lima','Viagem & Arte','2026-01-20','commercial_meeting',4,ARRAY['Equipa de reservas muito responsiva','Comissão negociada acima da média'],NOW() - INTERVAL '74 days'),
      ('Four Seasons Lisbon','Portugal','Camila Torres','Luxe Destinations','2025-11-05','fam_trip',5,ARRAY['Concierge fala português fluente','Kids club surpreendente no centro de Lisboa'],NOW() - INTERVAL '150 days'),
      ('Bvlgari Resort Dubai','Emirados Árabes','Mariana Fontes','Elite Travel','2026-03-02','site_inspection',5,ARRAY['Marina privativa com iate disponível','Cada villa tem piscina infinity sobre o mar'],NOW() - INTERVAL '33 days'),
      ('Bvlgari Resort Dubai','Emirados Árabes','Fernanda Rocha','Sol & Lua Viagens','2025-12-14','fam_trip',4,ARRAY['Perfeito para lua de mel de alto padrão','Butler service 24h incluso'],NOW() - INTERVAL '111 days'),
      ('Aman Tokyo','Japão','Carlos Medeiros','Via Luxo Viagens','2026-02-28','site_inspection',5,ARRAY['Andar 33 — vistas do Monte Fuji','Onsen no topo do prédio'],NOW() - INTERVAL '35 days'),
      ('Aman Tokyo','Japão','Ana Oliveira','TDG Travel','2025-10-15','fam_trip',4,ARRAY['Localização central no Otemachi','Café da manhã excepcional com culinária japonesa'],NOW() - INTERVAL '172 days'),
      ('Martinhal Cascais','Portugal','Beatriz Carvalho','Elite Travel','2026-03-18','fam_trip',5,ARRAY['Kids club temático por faixa etária','Acesso direto à praia de Cascais'],NOW() - INTERVAL '17 days'),
      ('Martinhal Cascais','Portugal','Pedro Almeida','Destinos Premium','2026-01-09','site_inspection',4,ARRAY['Arquitetura contemporânea alinhada à natureza','Restaurante com vista para o mar'],NOW() - INTERVAL '85 days'),
      ('Martinhal Sagres','Portugal','Pedro Almeida','Destinos Premium','2025-08-22','personal_stay',5,ARRAY['Praia mais linda do Algarve','Área exclusiva para hóspedes'],NOW() - INTERVAL '225 days'),
      ('Singita Grumeti','Tanzânia','Fernanda Rocha','Sol & Lua Viagens','2026-02-10','site_inspection',5,ARRAY['Big 5 garantido — vistas únicas do Serengeti','Guias locais com profundo conhecimento'],NOW() - INTERVAL '53 days'),
      ('Singita Grumeti','Tanzânia','Rafael Lima','Viagem & Arte','2025-09-30','fam_trip',5,ARRAY['Programa especial para crianças no safari','Segurança e conforto máximos'],NOW() - INTERVAL '187 days'),
      ('&Beyond Phinda','África do Sul','Camila Torres','Luxe Destinations','2026-01-25','site_inspection',4,ARRAY['7 ecossistemas únicos em uma só propriedade','Opção de night drive inclusa'],NOW() - INTERVAL '69 days'),
      ('Velaa Private Island','Maldivas','Carlos Medeiros','Via Luxo Viagens','2025-11-18','site_inspection',5,ARRAY['Único campo de golfe nas Maldivas','Naufrage Bar — cocktails sob o mar'],NOW() - INTERVAL '137 days'),
      ('Velaa Private Island','Maldivas','Beatriz Carvalho','Elite Travel','2025-07-04','personal_stay',5,ARRAY['Privacidade absoluta — ilha própria','Chef pessoal com cardápio personalizado'],NOW() - INTERVAL '274 days'),
      ('Six Senses Douro Valley','Portugal','Ana Oliveira','TDG Travel','2026-03-05','site_inspection',5,ARRAY['Vista para o rio Douro de tirar o fôlego','Spa com tratamentos baseados em vinhos'],NOW() - INTERVAL '30 days'),
      ('Six Senses Douro Valley','Portugal','Fernanda Rocha','Sol & Lua Viagens','2025-12-01','commercial_meeting',4,ARRAY['Equipa de events muito organizada','Programa de enoturismo referência'],NOW() - INTERVAL '124 days'),
      ('Amanzoe','Grécia','Pedro Almeida','Destinos Premium','2026-02-20','site_inspection',5,ARRAY['Pavilhões privados com piscina infinity','Heliponto disponível'],NOW() - INTERVAL '43 days'),
      ('Amanzoe','Grécia','Mariana Fontes','Elite Travel','2025-10-02','personal_stay',5,ARRAY['Silêncio absoluto — experiência de retiro','Vista para o Mar Egeu'],NOW() - INTERVAL '185 days'),
      ('Capella Bangkok','Tailândia','Rafael Lima','Viagem & Arte','2026-01-15','site_inspection',4,ARRAY['Ao lado do rio Chao Phraya','Quartos com banheira de hidromassagem e vista para o rio'],NOW() - INTERVAL '79 days'),
      ('Rosewood Hong Kong','Hong Kong','Camila Torres','Luxe Destinations','2025-11-28','commercial_meeting',4,ARRAY['Maior suite do hotel tem 780m²','F&B de altíssimo nível — 10 restaurantes'],NOW() - INTERVAL '127 days'),
      ('Waldorf Astoria Maldives','Maldivas','Ana Oliveira','TDG Travel','2025-09-12','site_inspection',5,ARRAY['175 villas — a maior ilha privada das Maldivas','Reef House com experiência de mergulho exclusiva'],NOW() - INTERVAL '205 days'),
      ('Waldorf Astoria Maldives','Maldivas','Carlos Medeiros','Via Luxo Viagens','2025-06-20','fam_trip',5,ARRAY['Kids club com scuba diving para crianças','Butler 24h em todas as categorias'],NOW() - INTERVAL '288 days'),
      ('Cheval Blanc Paris','França','Beatriz Carvalho','Elite Travel','2026-03-22','commercial_meeting',5,ARRAY['Localização no coração de Paris','Dior Spa exclusivo'],NOW() - INTERVAL '13 days'),
      ('Cheval Blanc Paris','França','Pedro Almeida','Destinos Premium','2025-12-20','site_inspection',4,ARRAY['Vista para o rio Sena e Notre-Dame','Restaurante Plénitude — 3 estrelas Michelin'],NOW() - INTERVAL '105 days'),
      ('Park Hyatt Maldives','Maldivas','Fernanda Rocha','Sol & Lua Viagens','2026-02-05','fam_trip',4,ARRAY['Recife de coral preservado','Mergulho noturno com raias mantas'],NOW() - INTERVAL '58 days'),
      ('Alila Villas Uluwatu','Indonésia','Mariana Fontes','Elite Travel','2025-10-25','site_inspection',5,ARRAY['Penhascos sobre o Oceano Índico','Arquitetura balinesa com materiais locais'],NOW() - INTERVAL '162 days'),
      ('Lefay Resort Garda','Itália','Rafael Lima','Viagem & Arte','2026-01-30','site_inspection',4,ARRAY['Vista para o Lago de Garda','Medicina ayurvédica integrada ao programa'],NOW() - INTERVAL '64 days'),
      ('Soneva Jani','Maldivas','Camila Torres','Luxe Destinations','2025-08-15','personal_stay',5,ARRAY['Water villas com slide privativo para o lagoon','Cinema subaquático'],NOW() - INTERVAL '232 days'),
      ('Como Laucala Island','Fiji','Ana Oliveira','TDG Travel','2026-03-01','site_inspection',5,ARRAY['Apenas 25 villas em ilha privada de Fiji','Fazenda orgânica abastece 90% do restaurante'],NOW() - INTERVAL '34 days')
    ON CONFLICT DO NOTHING
  `

  return NextResponse.json({ ok: true, message: 'All tables created and seeded.' })
}
