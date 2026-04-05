// seed.cjs — fonte de verdade: apenas dados confirmados pelo Bemgsy Flow
// run: node scripts/seed.cjs
const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync(__dirname + '/../.env.local', 'utf8');
const host = 'ep-little-forest-acfe2wug.sa-east-1.aws.neon.tech';
const user = env.match(/POSTGRES_USER="([^"]+)"/)[1];
const pass = env.match(/POSTGRES_PASSWORD="([^"]+)"/)[1];
const database = env.match(/POSTGRES_DATABASE="([^"]+)"/)[1];

const client = new Client({ host, user, password: pass, database, ssl: { rejectUnauthorized: false }, port: 5432 });

async function run() {
  await client.connect();
  console.log('Connected to', database);

  await client.query('TRUNCATE tdg_promotions, tdg_contracts, tdg_audio_inputs, tdg_hotels CASCADE');
  console.log('Cleared tables');

  // ── Hotels — fonte: Bemgsy Flow (search_hotels + get_hotel_details) ────────
  // REGRA: não adicionar redes, categorias ou tags não confirmadas pelo Bemgsy.
  // Tags derivadas apenas das descrições oficiais do Bemgsy.
  await client.query(`
    INSERT INTO tdg_hotels (name, location, country, region, networks, room_types, description, tags) VALUES

    ('Martinhal Lisboa Chiado',
     'Chiado, Lisboa, Portugal', 'Portugal', 'Europa',
     ARRAY[]::text[],
     ARRAY[]::text[],
     'Apartamentos exclusivos e luxuosos com serviços de hotel de cinco estrelas no coração do Chiado (Bairro Alto – Príncipe Real), Lisboa. Edifício histórico de 1855 remodelado. Kids Club supervisionado, Baby Concierge e Bar 1855 Gin Garden. Ideal para famílias, casais e viagens de trabalho.',
     ARRAY['family','city','kids','lisboa','portugal','europe','chiado']::text[]),

    ('Martinhal Lisboa Oriente',
     'Parque das Nações, Lisboa, Portugal', 'Portugal', 'Europa',
     ARRAY[]::text[],
     ARRAY['studio','apartamento 1 quarto','apartamento 2 quartos','apartamento 3 quartos']::text[],
     'Apartamentos e residências de luxo junto ao Rio Tejo. Kids Club, spa, piscinas aquecidas interiores e exteriores, ginásio, sala de jogos infantil, workspace. Ideal para famílias, casais, nómadas digitais e viagens de negócios.',
     ARRAY['family','city','kids','spa','lisboa','portugal','europe']::text[]),

    ('Martinhal Quinta do Lago',
     'Quinta do Lago, Algarve, Portugal', 'Portugal', 'Europa',
     ARRAY[]::text[],
     ARRAY[]::text[],
     'Resort de luxo familiar com vilas de 4 estrelas e piscinas privadas no Algarve.',
     ARRAY['family','algarve','resort','portugal','europe','pool']::text[]),

    ('Martinhal Sagres Beach Family Resort Hotel',
     'Sagres, Algarve, Portugal', 'Portugal', 'Europa',
     ARRAY[]::text[],
     ARRAY['quarto de hotel','vila de luxo']::text[],
     'Resort familiar de cinco estrelas com quartos de hotel e vilas de luxo no parque natural da Costa Vicentina, com vista para a praia do Martinhal. Concierge para bebés, actividades familiares, restaurantes. Prémios: Melhor Resort para Famílias em Portugal, Melhor Vila Resort em Portugal.',
     ARRAY['family','beach','nature','algarve','sagres','portugal','europe']::text[]),

    ('Velaa Private Island',
     'Noonu Atoll, Maldivas', 'Maldivas', 'Ásia',
     ARRAY[]::text[],
     ARRAY['villa','overwater villa','pool villa','beach pool villa','ocean pool house','romantic pool residence']::text[],
     'Ilha privada ultra-luxo nas Maldivas. Villas exclusivas, múltiplos restaurantes de assinatura, spa, campo de golfe, Kids Club (um dos maiores das Maldivas). Disponível para famílias, lua de mel e estadias de longa duração.',
     ARRAY['maldives','beach','honeymoon','romance','family','island','overwater','asia','luxury','kids']::text[])
  `);
  console.log('Hotels inserted (source: Bemgsy Flow)');

  // ── Contracts — deixar vazio até TDG confirmar vantagens negociadas reais ──
  // Não inserir contratos fictícios. Adicionar aqui quando TDG confirmar.
  console.log('Contracts: none (awaiting TDG confirmation)');

  // ── Promotions — fonte: Bemgsy Flow search_offers (active_only: true) ──────

  // Velaa Private Island — 4 ofertas válidas (valid_until: 2026-12-19)
  await client.query(`
    INSERT INTO tdg_promotions (hotel_id,title,description,commission_rate,booking_deadline,stay_from,stay_until)
    SELECT id,
      'Oferta Família no Velaa Private Island',
      'Crianças até 11 anos: hospedagem e refeições gratuitas (menu infantil nos restaurantes Athiri e Tavaru). Estadia mínima 4 noites. Não acumulável com Lua de Mel. Datas indisponíveis: 24 Mar–15 Abr, 1–10 Mai, 1–12 Out, 20 Out–5 Nov 2026.',
      10.00,'2026-12-19','2026-03-11','2026-12-19'
    FROM tdg_hotels WHERE name='Velaa Private Island'
  `);

  await client.query(`
    INSERT INTO tdg_promotions (hotel_id,title,description,commission_rate,booking_deadline,stay_from,stay_until)
    SELECT id,
      'Oferta de Lua de Mel no Velaa Private Island',
      'Benefícios progressivos por duração: 1-2 noites champagne; 3-4 café da manhã flutuante; 5-6 massagem casal 60min; 7-8 sessão de fotos profissional + álbum; 9-10 churrasco romântico na praia; 11+ cruzeiro pôr do sol 2h. Válido até 12 meses após o casamento. Acumulável com Early Bird e Stay Longer.',
      10.00,'2026-12-19','2026-01-13','2026-12-19'
    FROM tdg_hotels WHERE name='Velaa Private Island'
  `);

  await client.query(`
    INSERT INTO tdg_promotions (hotel_id,title,description,commission_rate,booking_deadline,stay_from,stay_until)
    SELECT id,
      'Early Bird Velaa — 10% OFF na Acomodação',
      '10% de desconto na villa para reservas confirmadas 60 dias antes da chegada. Estadia mínima 4 noites. Depósito 50% não reembolsável no momento da reserva. Acumulável com Família e Lua de Mel.',
      10.00,'2026-12-19','2026-01-01','2026-12-19'
    FROM tdg_hotels WHERE name='Velaa Private Island'
  `);

  await client.query(`
    INSERT INTO tdg_promotions (hotel_id,title,description,commission_rate,booking_deadline,stay_from,stay_until)
    SELECT id,
      'Stay Longer — Noites Grátis no Velaa',
      '4=3 / 7=5 / 10=7 / 14=10 noites. Válido para Beach Pool Villa, Deluxe Beach Pool Villa, Sunrise Water Pool Villa, Sunset Deluxe Water Pool Villa, Ocean Pool House, Romantic Pool Residence (Jan–Dez 2026) e Beach Pool House, Velaa Private Residence (Mai–Ago 2026). Acumulável com Lua de Mel, Família e Fly & Dine.',
      10.00,'2026-12-19','2026-01-13','2026-12-19'
    FROM tdg_hotels WHERE name='Velaa Private Island'
  `);

  // Martinhal Lisboa Oriente — 2 ofertas de inverno (marcadas activas no Bemgsy)
  await client.query(`
    INSERT INTO tdg_promotions (hotel_id,title,description,commission_rate,booking_deadline,stay_from,stay_until)
    SELECT id,
      'Escapadela de Inverno — Pague 3, Fique 4 Noites',
      'Fique 4 noites, pague 3 (25% desconto), com pequeno-almoço incluído. Deluxe Studio desde 138€/noite (2 adultos + 1 bebé até 2 anos). Apartamento Deluxe T2 desde 299€/noite (4 adultos + 1 bebé). Inclui Wi-Fi, ginásio, piscinas aquecidas, sala de jogos infantil e workspace. Não acumulável.',
      10.00,'2026-03-26','2025-11-20','2026-03-26'
    FROM tdg_hotels WHERE name='Martinhal Lisboa Oriente'
  `);

  await client.query(`
    INSERT INTO tdg_promotions (hotel_id,title,description,commission_rate,booking_deadline,stay_from,stay_until)
    SELECT id,
      'Tarifa Especial de Inverno — 15% OFF',
      '15% de desconto para estadias de 2 a 3 noites com pequeno-almoço incluído. Deluxe Studio desde 156€/noite. Apartamento Deluxe T2 desde 338€/noite. Inclui Wi-Fi, ginásio, piscinas aquecidas, sala de jogos e workspace. Não acumulável.',
      10.00,'2026-03-26','2025-11-20','2026-03-26'
    FROM tdg_hotels WHERE name='Martinhal Lisboa Oriente'
  `);

  console.log('Promotions inserted (source: Bemgsy Flow)');

  // Verify
  const hotels   = await client.query('SELECT count(*) as c FROM tdg_hotels');
  const promos   = await client.query('SELECT count(*) as c FROM tdg_promotions');
  const contracts = await client.query('SELECT count(*) as c FROM tdg_contracts');
  console.log(`\nFinal: ${hotels.rows[0].c} hotels | ${promos.rows[0].c} promotions | ${contracts.rows[0].c} contracts`);

  await client.end();
  console.log('Done.');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
