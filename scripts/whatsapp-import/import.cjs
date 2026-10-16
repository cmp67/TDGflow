// Importação incremental do grupo de WhatsApp da TDG → produção.
// Fase 9 (out/2026). Entrada: JSONs extraídos por agente (formato em
// extract-prompt.md) + mapa de autores. Mesmas regras das fases 4a/4b/5:
// hotel só nasce com evidência de review, contato vira 'hotel'/'fornecedor'
// conforme vínculo, review/conhecimento nascem import_approval='pending',
// source_author/source_date sempre preenchidos, photo_url nunca.
//
// Uso (da raiz do repo):
//   NODE_PATH=./node_modules node scripts/whatsapp-import/import.cjs \
//     --authors <authors.json> <chunk1.json> [<chunk2.json> ...]            (ensaio)
//   ... --commit                                                             (grava)
// Resumível: reexecutar com --commit pula o que já existe (chave natural).
const fs = require('fs')
const path = require('path')

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)="?([^"\n]*)"?$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2] }
const { sql, db } = require('@vercel/postgres')
const Anthropic = require('@anthropic-ai/sdk').default

const args = process.argv.slice(2)
const COMMIT = args.includes('--commit')
const authorsPath = args[args.indexOf('--authors') + 1]
const files = args.filter(a => a.endsWith('.json') && a !== authorsPath)
if (!authorsPath || files.length === 0) { console.error('uso: --authors <authors.json> <chunk.json>... [--commit]'); process.exit(1) }

const AUTHORS = JSON.parse(fs.readFileSync(authorsPath, 'utf8'))
const TAGS = new Set('hospedagem vistos-documentacao passeios-atracoes restaurantes comissao dmc-operadoras aereo transfer-transporte familia-criancas epoca-viagem saude menor-desacompanhado plataforma-reserva cruzeiro seguranca legislacao-fiscal esqui seguro-viagem cambio-dinheiro aluguel-carro golpe pandemia'.split(' '))
const ENTITY = new Set(['hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'dmc', 'other'])
const SINCE = '2026-07-20'
const MODEL = 'claude-haiku-4-5-20251001'

// ── helpers ──────────────────────────────────────────────────────────────────
const norm = s => (s ?? '').toString().normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\b(hotel|resort|the|&|and|spa|by|a|o|de|da|do)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
const normLoose = s => (s ?? '').toString().normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const digits = s => (s ?? '').toString().replace(/\D/g, '')
const email = s => (s ?? '').toString().trim().toLowerCase() || null
const author = raw => {
  if (!(raw in AUTHORS)) return { ok: false, reason: `autor sem mapa: ${raw}` }
  const a = AUTHORS[raw]
  if (!a || a.startsWith('__')) return { ok: false, reason: `autor descartado: ${raw}` }
  return { ok: true, name: a }
}
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '') && d >= SINCE
const loc = (city, country) => [city, country].filter(Boolean).join(', ') || null

// ── load + validate ──────────────────────────────────────────────────────────
const input = { hotels: [], reviews: [], contacts: [], knowledge: [] }
const dropped = []
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const k of Object.keys(input)) for (const it of d[k] ?? []) input[k].push({ ...it, _file: path.basename(f) })
}
function prep(list, kind) {
  const out = []
  for (const it of list) {
    if (kind === 'hotels') { if (!it.name || !ENTITY.has(it.entity_type)) { dropped.push([kind, 'sem nome/entity_type', it.name]); continue } out.push(it); continue }
    const a = author(it.author); if (!a.ok) { dropped.push([kind, a.reason, it.hotel_name ?? it.title ?? it.name]); continue }
    if (!validDate(it.date)) { dropped.push([kind, `data inválida ${it.date}`, it.hotel_name ?? it.title ?? it.name]); continue }
    if (kind === 'reviews' && (!it.hotel_name || !it.text || !ENTITY.has(it.entity_type))) { dropped.push([kind, 'campos faltando', it.hotel_name]); continue }
    if (kind === 'contacts' && (!it.name || !(it.email || it.whatsapp || (it.title && it.organization)))) { dropped.push([kind, 'sem dado de contato', it.name]); continue }
    if (kind === 'knowledge') {
      if (!it.title || !(it.content || it.url)) { dropped.push([kind, 'sem título/conteúdo', it.title]); continue }
      it.tags = (it.tags ?? []).filter(t => TAGS.has(t)); if (!['fact', 'note', 'link'].includes(it.type)) it.type = it.url ? 'link' : 'note'
    }
    out.push({ ...it, author: a.name })
  }
  return out
}
const hotels = prep(input.hotels, 'hotels'), reviews = prep(input.reviews, 'reviews')
const contacts = prep(input.contacts, 'contacts'), knowledge = prep(input.knowledge, 'knowledge')

// ── main ─────────────────────────────────────────────────────────────────────
;(async () => {
  // catálogo existente
  const { rows: cat } = await sql`SELECT id, name, entity_type FROM tdg_hotels`
  const byNorm = new Map(); for (const h of cat) if (!byNorm.has(norm(h.name))) byNorm.set(norm(h.name), h)
  const resolveHotel = name => byNorm.get(norm(name)) ?? null

  // 1. hotéis a criar = só os que têm review nesta leva e não existem
  const toCreate = new Map()
  for (const r of reviews) {
    if (resolveHotel(r.hotel_name) || toCreate.has(norm(r.hotel_name))) continue
    const h = hotels.find(x => norm(x.name) === norm(r.hotel_name)) ?? {}
    toCreate.set(norm(r.hotel_name), { name: r.hotel_name.trim(), entity_type: r.entity_type, city: h.city_literal ?? r.city_literal ?? null, country: h.country_literal ?? r.country_literal ?? null })
  }

  // 2. reviews — chave natural pra não duplicar (resumível / relevas sobrepostas)
  const { rows: exR } = await sql`SELECT source_author, source_date::text d, hotel_name FROM tdg_hotel_reviews WHERE source_date >= ${SINCE}`
  // chave: autor + data + hotel (o mesmo relato pode ter sido recortado diferente em duas extrações)
  const rKey = (a, d, h) => `${normLoose(a)}|${d}|${norm(h)}`
  const seenR = new Set(exR.map(r => rKey(r.source_author, r.d, r.hotel_name)))
  const newReviews = []
  for (const r of reviews) { const k = rKey(r.author, r.date, r.hotel_name); if (seenR.has(k)) { dropped.push(['reviews', 'já existe', r.hotel_name]); continue } seenR.add(k); newReviews.push(r) }

  // 3. contatos — e-mail ou whatsapp iguais = mesmo contato; senão nome+organização
  const { rows: exC } = await sql`SELECT name, surname, organization, email, whatsapp, hotel_id FROM tdg_hotel_contacts`
  const seenEmail = new Set(exC.map(c => email(c.email)).filter(Boolean)), seenPhone = new Set(exC.map(c => digits(c.whatsapp)).filter(p => p.length >= 8))
  const seenNameOrg = new Set(exC.map(c => `${normLoose(c.name + ' ' + (c.surname ?? ''))}|${normLoose(c.organization)}`))
  const newContacts = []
  for (const c of contacts) {
    const e = email(c.email), p = digits(c.whatsapp)
    if ((e && seenEmail.has(e)) || (p.length >= 8 && seenPhone.has(p)) || seenNameOrg.has(`${normLoose(c.name + ' ' + (c.surname ?? ''))}|${normLoose(c.organization)}`)) { dropped.push(['contacts', 'já existe', c.name]); continue }
    if (e) seenEmail.add(e); if (p.length >= 8) seenPhone.add(p); seenNameOrg.add(`${normLoose(c.name + ' ' + (c.surname ?? ''))}|${normLoose(c.organization)}`)
    const hotel = c.hotel_name ? (resolveHotel(c.hotel_name) ?? (toCreate.has(norm(c.hotel_name)) ? { pending: norm(c.hotel_name) } : null)) : null
    newContacts.push({ ...c, _hotel: hotel })
  }

  // 4. conhecimento — título normalizado igual, ou mesmo autor+data+início do conteúdo
  const { rows: exK } = await sql`SELECT title, source_author, source_date::text d, content FROM tdg_destination_knowledge WHERE source_date >= ${SINCE}`
  const seenT = new Set(exK.map(k => normLoose(k.title))), seenK = new Set(exK.map(k => `${normLoose(k.source_author)}|${k.d}|${normLoose(k.content).slice(0, 40)}`))
  const newKnowledge = []
  for (const k of knowledge) {
    const t = normLoose(k.title), kk = `${normLoose(k.author)}|${k.date}|${normLoose(k.content).slice(0, 40)}`
    if (seenT.has(t) || seenK.has(kk)) { dropped.push(['knowledge', 'já existe', k.title]); continue }
    seenT.add(t); seenK.add(kk); newKnowledge.push(k)
  }

  // ── relatório ──
  const count = (list, f) => Object.entries(list.reduce((m, x) => (m[f(x)] = (m[f(x)] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1])
  console.log(`\n== ENSAIO ${COMMIT ? '(COMMIT)' : '(sem gravar)'} — arquivos: ${files.map(f => path.basename(f)).join(', ')}`)
  console.log(`entrada: hotéis ${input.hotels.length}, reviews ${input.reviews.length}, contatos ${input.contacts.length}, conhecimento ${input.knowledge.length}`)
  console.log(`a gravar: hotéis novos ${toCreate.size} (reviews em hotel já no catálogo: ${newReviews.filter(r => resolveHotel(r.hotel_name)).length}), reviews ${newReviews.length}, contatos ${newContacts.length} (com hotel: ${newContacts.filter(c => c._hotel).length}), conhecimento ${newKnowledge.length}`)
  console.log('descartados:', count(dropped, d => `${d[0]}/${d[1]}`).slice(0, 12))
  console.log('autores:', count([...newReviews, ...newContacts, ...newKnowledge], x => x.author).slice(0, 12))
  console.log('sentimento:', count(newReviews, r => r.sentiment), ' entity:', count(newReviews, r => r.entity_type))
  console.log('tags:', count(newKnowledge.flatMap(k => k.tags.length ? k.tags : ['(sem tag)']), t => t))
  console.log('país em review:', newReviews.filter(r => r.country_literal).length, '/', newReviews.length, '· país em conhecimento:', newKnowledge.filter(k => k.country).length, '/', newKnowledge.length)
  console.log('\nexemplos hotéis novos:', [...toCreate.values()].slice(0, 8).map(h => `${h.name} [${h.entity_type}${h.country ? ', ' + h.country : ''}]`).join(' · '))
  console.log('exemplo review:', JSON.stringify(newReviews[0] ?? null).slice(0, 300))
  console.log('exemplo contato:', JSON.stringify(newContacts[0] ?? null).slice(0, 300))
  console.log('exemplo conhecimento:', JSON.stringify(newKnowledge[0] ?? null).slice(0, 300))
  if (!COMMIT) { process.exit(0) }

  // ── gravação ──
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  async function extract(r) {
    const label = { positive: 'POSITIVA', negative: 'NEGATIVA', mixed: 'MISTA (elogios e ressalvas)', neutral: 'NEUTRA' }[r.sentiment] ?? 'NEUTRA'
    const wantHeads = r.sentiment === 'negative' || r.sentiment === 'mixed'
    const prompt = `Você é um assistente especializado em turismo de luxo. O texto abaixo é um relato real de uma travel advisor num grupo de WhatsApp sobre "${r.hotel_name}" (${r.entity_type}). Extraia informações estruturadas.

Tom do relato: ${label}. CRÍTICO: preserve o tom e o sentimento original — nunca transforme crítica em elogio, nunca "positive" um comentário negativo, nunca invente o que não está escrito. Se o relato é curto, devolva poucos itens curtos; nunca encha com generalidades.

Relato:
${r.text}

Retorne APENAS um JSON válido com esta estrutura (só estas chaves):
{
  "highlights": ["1 a 4 pontos específicos, fiéis ao relato"],
  "client_profile": "perfil de cliente que se beneficia, em 1 frase, ou null se o relato não permite dizer"${wantHeads ? ',\n  "heads_up": "a ressalva ou alerta principal do relato, em 1 frase"' : ''}
}`
    try {
      const res = await anthropic.messages.create({ model: MODEL, max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
      const txt = res.content.map(c => c.text ?? '').join('')
      const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1))
      return { highlights: Array.isArray(j.highlights) ? j.highlights.slice(0, 5) : null, client_profile: j.client_profile || null, heads_up: wantHeads ? (j.heads_up || null) : null }
    } catch (e) { console.warn('  extração falhou, review entra sem campos derivados:', r.hotel_name, e.message); return { highlights: null, client_profile: null, heads_up: null } }
  }

  const client = await db.connect()
  const created = new Map() // norm → id
  try {
    await client.sql`BEGIN`
    for (const [k, h] of toCreate) {
      const { rows } = await client.sql`INSERT INTO tdg_hotels (name, entity_type, location, country, origin, is_partner) VALUES (${h.name}, ${h.entity_type === 'dmc' ? 'other' : h.entity_type}, ${loc(h.city, h.country)}, ${h.country}, 'whatsapp_import', false) RETURNING id`
      created.set(k, rows[0].id)
    }
    for (const c of newContacts) {
      const hotelId = c._hotel?.id ?? (c._hotel?.pending ? created.get(c._hotel.pending) : null) ?? null
      await client.sql`INSERT INTO tdg_hotel_contacts (hotel_id, name, surname, title, organization, email, whatsapp, notes, category, context_trigger, source_author, source_date)
        VALUES (${hotelId}, ${c.name.trim()}, ${c.surname?.trim() || ''}, ${c.title || null}, ${c.organization || null}, ${email(c.email)}, ${c.whatsapp || null}, ${null}, ${hotelId ? 'hotel' : 'fornecedor'}, ${c.context || null}, ${c.author}, ${c.date})`
    }
    for (const k of newKnowledge) {
      await client.sql`INSERT INTO tdg_destination_knowledge (type, title, content, url, country, region, tags, source_author, source_date, import_approval)
        VALUES (${k.type}, ${k.title.trim()}, ${k.content || null}, ${k.url || null}, ${k.country || null}, ${k.region || null}, ${k.tags}, ${k.author}, ${k.date}, 'pending')`
    }
    await client.sql`COMMIT`
    console.log(`\ngravados: hotéis ${created.size}, contatos ${newContacts.length}, conhecimento ${newKnowledge.length}`)
  } catch (e) { await client.sql`ROLLBACK`; console.error('ROLLBACK hotéis/contatos/conhecimento:', e.message); process.exit(1) } finally { client.release() }

  // reviews: uma a uma (extração de IA no meio) — resumível pela chave natural já checada acima
  let done = 0
  const queue = [...newReviews]
  async function worker() {
    while (queue.length) {
      const r = queue.shift()
      const hotelId = resolveHotel(r.hotel_name)?.id ?? created.get(norm(r.hotel_name)) ?? null
      // tdg_hotel_reviews não aceita 'dmc' (CHECK só tem hotel/beach_club/transfer/guide/restaurant/roteiro/other);
      // e a UI (ENTITY_TYPE_LABELS) não tem rótulo pra 'dmc' — fornecedor e review entram como 'other'.
      const reviewEntity = r.entity_type === 'dmc' ? 'other' : r.entity_type
      const ex = await extract(r)
      await sql`INSERT INTO tdg_hotel_reviews (hotel_name, hotel_id, agent_name, agency_name, visit_type, entity_type, country, raw_answers, highlights, client_profile, heads_up, status, source_author, source_date, import_approval, photo_url, source)
        VALUES (${r.hotel_name.trim()}, ${hotelId}, ${r.author}, ${r.author}, ${null}, ${reviewEntity}, ${r.country_literal || null}, ${JSON.stringify({ impressions: r.text })}, ${ex.highlights ? JSON.stringify(ex.highlights) : null}, ${ex.client_profile}, ${ex.heads_up}, 'published', ${r.author}, ${r.date}, 'pending', ${null}, 'whatsapp_import')`
      done++; if (done % 20 === 0) console.log(`  reviews ${done}/${newReviews.length}`)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  console.log(`gravadas reviews: ${done}/${newReviews.length}`)
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
