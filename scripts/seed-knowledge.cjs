// seed-knowledge.cjs — importa material do Bemgsy Flow para tdg_knowledge
// run: node scripts/seed-knowledge.cjs
const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync(__dirname + '/../.env.local', 'utf8');
const client = new Client({
  host: 'ep-little-forest-acfe2wug.sa-east-1.aws.neon.tech',
  user: env.match(/POSTGRES_USER="([^"]+)"/)[1],
  password: env.match(/POSTGRES_PASSWORD="([^"]+)"/)[1],
  database: env.match(/POSTGRES_DATABASE="([^"]+)"/)[1],
  ssl: { rejectUnauthorized: false }, port: 5432
});

async function insert(client, hotel_id, type, title, content, url) {
  await client.query(
    `INSERT INTO tdg_knowledge (hotel_id, type, title, content, url) VALUES ($1,$2,$3,$4,$5)`,
    [hotel_id, type, title, content || null, url || null]
  );
}

async function run() {
  await client.connect();
  console.log('Connected');

  // Clear existing knowledge
  await client.query('DELETE FROM tdg_knowledge');
  console.log('Cleared tdg_knowledge');

  // Get hotel IDs by name
  const { rows: hotels } = await client.query('SELECT id, name FROM tdg_hotels');
  const h = {};
  hotels.forEach(r => { h[r.name] = r.id; });
  console.log('Hotels found:', Object.keys(h));

  // ── MARTINHAL LISBOA CHIADO ────────────────────────────────────────────────
  const chiado = h['Martinhal Lisboa Chiado'];
  if (chiado) {
    await insert(client, chiado, 'fact', 'Contacto reservas',
      'Email: res@martinhal.com | Tel: +351 218 507 788', null);
    await insert(client, chiado, 'fact', 'Localização',
      'Chiado / Bairro Alto – Príncipe Real, Lisboa. Edifício histórico de 1855 remodelado com espaços modernos.', null);
    await insert(client, chiado, 'fact', 'Destaques operacionais',
      'Kids Club supervisionado, Baby Concierge, Bar 1855 Gin Garden. Ideal para famílias, casais, nómadas digitais e viagens de negócios.', null);
    // Gallery links (Box)
    await insert(client, chiado, 'link', 'Galeria — Acomodações',
      null, 'https://app.box.com/s/xkb5eg3l8akjlracmcenb9e0atnq6nwy/folder/254983230975');
    await insert(client, chiado, 'link', 'Galeria — Lisboa (contexto da cidade)',
      null, 'https://app.box.com/s/xkb5eg3l8akjlracmcenb9e0atnq6nwy/folder/254984473456');
    await insert(client, chiado, 'link', 'Galeria — Bar 1855 Gin Garden',
      null, 'https://app.box.com/s/xkb5eg3l8akjlracmcenb9e0atnq6nwy/folder/254984475970');
    await insert(client, chiado, 'link', 'Galeria — Kids Club',
      null, 'https://app.box.com/s/xkb5eg3l8akjlracmcenb9e0atnq6nwy/folder/254984713904');
    await insert(client, chiado, 'link', 'Galeria — Arquitetura / Fachada',
      null, 'https://app.box.com/s/xkb5eg3l8akjlracmcenb9e0atnq6nwy/folder/6077463230');
    console.log('Martinhal Lisboa Chiado — OK');
  }

  // ── MARTINHAL LISBOA ORIENTE ───────────────────────────────────────────────
  const oriente = h['Martinhal Lisboa Oriente'];
  if (oriente) {
    await insert(client, oriente, 'fact', 'Contacto reservas',
      'Email: res@martinhal.com | Tel: +351 210 029 600', null);
    await insert(client, oriente, 'fact', 'Localização',
      'Parque das Nações, junto ao Rio Tejo, Lisboa.', null);
    await insert(client, oriente, 'fact', 'Tipologias disponíveis',
      'Studio, Apartamento 1 quarto, Apartamento 2 quartos, Apartamento 3 quartos.', null);
    await insert(client, oriente, 'fact', 'Instalações e serviços',
      'Kids Club, The Spa, piscinas interiores e exteriores aquecidas, ginásio, sala de jogos infantil, workspace (excluindo cabines), Terrace Restaurant.', null);
    // Gallery (Google Drive)
    await insert(client, oriente, 'link', 'Galeria — Apartamento 1 quarto',
      null, 'https://drive.google.com/drive/folders/1C5ZNwNVnXjrrbGcPFx22XfyV2c81RaNe?usp=drive_link');
    await insert(client, oriente, 'link', 'Galeria — Apartamento 2 quartos',
      null, 'https://drive.google.com/drive/folders/1xa3LvVaEavBL2Elx70nttYDw2fVc_Nra');
    await insert(client, oriente, 'link', 'Galeria — Apartamento 3 quartos',
      null, 'https://drive.google.com/drive/folders/10KKxGM_SMNh8mvAyOuo82pRP6sEfXGLF');
    await insert(client, oriente, 'link', 'Galeria — Studio',
      null, 'https://drive.google.com/drive/folders/1Zmqe_RNNcKxHgvzYdnKQ7LxhmKmPUckW');
    await insert(client, oriente, 'link', 'Galeria — Academia',
      null, 'https://drive.google.com/drive/folders/1wpQVkU2bkmsRG92sVmLbRAFSw-e5W2K-');
    await insert(client, oriente, 'link', 'Galeria — Lobby',
      null, 'https://drive.google.com/drive/folders/11DfSIcQ4dK_jv6emm8Y0kzbq9o9KbBil');
    await insert(client, oriente, 'link', 'Galeria — Play Space & Kids Club',
      null, 'https://drive.google.com/drive/folders/1OpaLEK4yzfZXj3lfCJQrNuaUN-p72ZP-');
    await insert(client, oriente, 'link', 'Galeria — Piscinas',
      null, 'https://drive.google.com/drive/folders/1MFiFbOuicd9t6bIMXDImZ6Gh1socUGAA');
    await insert(client, oriente, 'link', 'Galeria — Workspace',
      null, 'https://drive.google.com/drive/folders/1kRLpnAhCRr-QKOGnZuiBCSJhALQ-');
    await insert(client, oriente, 'link', 'Galeria — Martinhal Oriente & a Arte',
      null, 'https://drive.google.com/drive/folders/1CjvcdEbijivc38C-Ei9cQnQV_QCN_OKV');
    await insert(client, oriente, 'link', 'Galeria — Terrace Restaurant',
      null, 'https://drive.google.com/drive/folders/1wNbMtM_9dHeGF2yQumZna6lbZvPyn5bi');
    await insert(client, oriente, 'link', 'Galeria — The Spa',
      null, 'https://drive.google.com/drive/folders/1Q9Q4Yv0R4nhBPATryasEq0nAJWMGWoRYk');
    await insert(client, oriente, 'link', 'Galeria — Drone / Exterior',
      null, 'https://drive.google.com/drive/folders/13hhI3x1Eb1rNCKH02TX8OPWddL5fePi8');
    console.log('Martinhal Lisboa Oriente — OK');
  }

  // ── MARTINHAL QUINTA DO LAGO ───────────────────────────────────────────────
  const quinta = h['Martinhal Quinta do Lago'];
  if (quinta) {
    await insert(client, quinta, 'fact', 'Contacto reservas',
      'Email: res@martinhal.com | Tel: +351 289 008 300', null);
    await insert(client, quinta, 'fact', 'Localização',
      'Quinta do Lago, Algarve, Portugal.', null);
    await insert(client, quinta, 'fact', 'Tipo de propriedade',
      'Resort de luxo familiar com vilas de 4 estrelas e piscinas privadas.', null);
    // Gallery (Box)
    await insert(client, quinta, 'link', 'Galeria — Family Activities',
      null, 'https://app.box.com/s/geooefqa1erjzegur6w7bcew9e4nshbu/folder/206840522919');
    await insert(client, quinta, 'link', 'Galeria — Piscina & Hangout MBar',
      null, 'https://app.box.com/s/geooefqa1erjzegur6w7bcew9e4nshbu/folder/206840439224');
    await insert(client, quinta, 'link', 'Galeria — Kids',
      null, 'https://app.box.com/s/geooefqa1erjzegur6w7bcew9e4nshbu/folder/206844405694');
    await insert(client, quinta, 'link', 'Galeria — Acomodações',
      null, 'https://app.box.com/s/geooefqa1erjzegur6w7bcew9e4nshbu/folder/206844284194');
    console.log('Martinhal Quinta do Lago — OK');
  }

  // ── MARTINHAL SAGRES ──────────────────────────────────────────────────────
  const sagres = h['Martinhal Sagres Beach Family Resort Hotel'];
  if (sagres) {
    await insert(client, sagres, 'fact', 'Contacto reservas',
      'Email: res@martinhal.com | Tel: +351 282 240 200', null);
    await insert(client, sagres, 'fact', 'Localização',
      'Quinta do Martinhal, Sagres, Algarve. Parque Natural da Costa Vicentina, com vista para a praia do Martinhal.', null);
    await insert(client, sagres, 'fact', 'Prémios e distinções',
      'Melhor Resort para Famílias em Portugal. Melhor Vila Resort em Portugal.', null);
    await insert(client, sagres, 'fact', 'Tipologias',
      'Quartos de hotel e vilas de luxo. Concierge para bebés, actividades familiares, múltiplos restaurantes.', null);
    // Gallery (Box)
    await insert(client, sagres, 'link', 'Galeria — Acomodações',
      null, 'https://app.box.com/s/12fezwopntit4xbglquvd0262et6c1gt/folder/302825634664');
    await insert(client, sagres, 'link', 'Galeria — Atividades para a família',
      null, 'https://app.box.com/s/12fezwopntit4xbglquvd0262et6c1gt/folder/302827502008');
    await insert(client, sagres, 'link', 'Galeria — Praia do Martinhal',
      null, 'https://app.box.com/s/12fezwopntit4xbglquvd0262et6c1gt/folder/302827509152');
    await insert(client, sagres, 'link', 'Galeria — Piscinas, academia, jardins e celebrações',
      null, 'https://app.box.com/s/12fezwopntit4xbglquvd0262et6c1gt/folder/302825948797');
    console.log('Martinhal Sagres — OK');
  }

  // ── VELAA PRIVATE ISLAND ──────────────────────────────────────────────────
  const velaa = h['Velaa Private Island'];
  if (velaa) {
    await insert(client, velaa, 'fact', 'Contacto reservas',
      'Email: reservations@velaaprivateisland.com | Tel: +960 656 1111 | VIP desk TDG: vipdesk@lilamonde.com', null);
    await insert(client, velaa, 'fact', 'Localização',
      'Noonu Atoll, Maldivas. Ilha privada exclusiva, acesso por hidroavião ou lancha privada.', null);
    await insert(client, velaa, 'fact', 'Tipologias de villa',
      'Beach Pool Villa, Deluxe Beach Pool Villa, Sunrise Water Pool Villa, Sunset Deluxe Water Pool Villa, Ocean Pool House, Romantic Pool Residence, Beach Pool House, Velaa Private Residence.', null);
    await insert(client, velaa, 'fact', 'Instalações e destaques',
      'Único campo de golfe nas Maldivas (par 3, 9 buracos), marina privada, múltiplos restaurantes de assinatura (Aragu, Tavaru, Athiri), Velaa Wellbeing Village (spa), Kids Club (um dos maiores das Maldivas), mergulho, snorkeling, regeneração de corais.', null);
    await insert(client, velaa, 'fact', 'Acumulação de ofertas',
      'Early Bird + Família: acumulável. Early Bird + Lua de Mel: acumulável. Stay Longer + Família/Lua de Mel/Fly&Dine: acumulável. Família + Lua de Mel: NÃO acumulável.', null);
    await insert(client, velaa, 'fact', 'Restrições datas Família 2026',
      'Datas indisponíveis para oferta Família: 24 Mar–15 Abr, 1–10 Mai, 1–12 Out, 20 Out–5 Nov 2026.', null);
    // Gallery + materials (Dropbox)
    await insert(client, velaa, 'link', 'Galeria — Acomodações (Dropbox)',
      null, 'https://www.dropbox.com/scl/fo/je06xuwxgjq2v0k739vzg/h?rlkey=o68wd2xue9bg0pw77d21lc0m2&e=1&dl=0');
    await insert(client, velaa, 'link', 'Press Kit (Dropbox)',
      null, 'https://www.dropbox.com/scl/fo/o0p14ie9g9skv2yt86q95/h?rlkey=k77x5sf4o0kfnpgmil5ywlllb&e=2&st=b7234n3w&dl=0');
    await insert(client, velaa, 'link', 'Brochura — Velaa Wellbeing Village',
      null, 'https://www.dropbox.com/scl/fo/hj5kzp5l0dzvmxawro7v5/h?rlkey=hzzsw3y0e40apylylolr0gbt2&e=1&dl=0');
    await insert(client, velaa, 'link', 'Ficha técnica — Fehikuramaa (Villa exclusiva)',
      null, 'https://www.dropbox.com/scl/fo/hyew9oknl50x0iej630xr/h?rlkey=ewp2eqsf3f8apgkavxnpdibpd&e=1&dl=0');
    console.log('Velaa Private Island — OK');
  }

  // Summary
  const { rows: [cnt] } = await client.query('SELECT count(*) as c FROM tdg_knowledge');
  console.log(`\nTotal knowledge items inserted: ${cnt.c}`);
  await client.end();
  console.log('Done.');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
