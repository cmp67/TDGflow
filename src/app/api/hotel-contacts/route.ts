import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { CATEGORY_TO_ENTITY, ENTITY_TO_CATEGORY, parseSource, SOURCE_KIND_LABELS } from '@/lib/contacts'
import { proposeEnrichmentInBackground } from '@/lib/enrichment'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tdg_hotel_contacts (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_id            UUID REFERENCES tdg_hotels(id) ON DELETE SET NULL,
      added_by            TEXT,
      name                TEXT NOT NULL,
      surname             TEXT NOT NULL,
      title               TEXT,
      email               TEXT,
      whatsapp            TEXT,
      notes               TEXT,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      source_author       TEXT,
      source_date         DATE,
      category            TEXT,
      context_trigger     TEXT,
      organization        TEXT
    )
  `
}

/* Contact Hub: um contato pode ou não estar vinculado a um fornecedor.
   Sem hotelId → contato de rede (pessoa), aparece na lente "Contatos".
   Com hotelId → contato daquela ficha, também visível na lente Contatos
   via organization/hotel_id (uma fonte, duas vistas). */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  const hotelId = req.nextUrl.searchParams.get('hotelId')
  const search = req.nextUrl.searchParams.get('search')?.trim().toLowerCase()
  const category = req.nextUrl.searchParams.get('category')

  if (hotelId) {
    const { rows } = await sql`
      SELECT id, hotel_id, added_by, name, surname, title, email, whatsapp, notes, category, organization, created_at, added_by_email, source_kind, source_detail
      FROM tdg_hotel_contacts
      WHERE hotel_id = ${hotelId}
      ORDER BY created_at DESC
    `
    return NextResponse.json({ contacts: rows })
  }

  // Lente "Contatos" — rede inteira, sem escopo de fornecedor
  const { rows } = await sql`
    SELECT
      id, hotel_id, added_by, name, surname, title, email, whatsapp, notes,
      source_author, source_date::text AS source_date, category, context_trigger,
      organization, created_at, added_by_email, source_kind, source_detail
    FROM tdg_hotel_contacts
    ORDER BY source_date ASC NULLS LAST, created_at DESC
  `

  let contacts = rows
  if (category && category !== 'all') {
    contacts = contacts.filter(c => c.category === category)
  }
  if (search) {
    contacts = contacts.filter(c =>
      `${c.name} ${c.surname}`.toLowerCase().includes(search) ||
      c.organization?.toLowerCase().includes(search) ||
      c.context_trigger?.toLowerCase().includes(search) ||
      c.source_author?.toLowerCase().includes(search) ||
      c.whatsapp?.includes(search)
    )
  }

  const counts: Record<string, number> = {}
  for (const c of rows) {
    counts[c.category ?? 'outro'] = (counts[c.category ?? 'outro'] ?? 0) + 1
  }

  return NextResponse.json({ contacts, total: rows.length, counts })
}

/* Fornecedor automático (16/10/2026): pessoa que chega com organização e
   categoria de fornecedor de viagem (DMC, guia, hospedagem...) ganha o card
   do fornecedor — acha pelo nome (sem acento/caixa) ou cria, compartilhado
   com a rede, com created_by de quem cadastrou. Caso real: cartão da Tekser
   (DMC) lido pela câmera virou só pessoa, sem card. */
async function findOrCreateSupplier(organization: string, entityType: string, email: string): Promise<{ id: string; name: string; created: boolean }> {
  const name = organization.trim().replace(/\s+/g, ' ')
  const { rows: found } = await sql`SELECT id, name FROM tdg_hotels WHERE lower(trim(name)) = lower(${name}) AND agency_id IS NULL ORDER BY (entity_type = ${entityType}) DESC LIMIT 1`
  if (found[0]) return { id: found[0].id as string, name: found[0].name as string, created: false }
  const { rows } = await sql`
    INSERT INTO tdg_hotels (name, entity_type, created_by) VALUES (${name}, ${entityType}, ${email})
    ON CONFLICT (lower(trim(name)), entity_type) WHERE agency_id IS NULL DO NOTHING
    RETURNING id, name`
  if (rows[0]) return { id: rows[0].id as string, name: rows[0].name as string, created: true }
  const { rows: raced } = await sql`SELECT id, name FROM tdg_hotels WHERE lower(trim(name)) = lower(${name}) AND agency_id IS NULL LIMIT 1`
  return { id: raced[0].id as string, name: raced[0].name as string, created: false }
}

async function createDiscoveryLead(hotelId: string, hotelName: string, entityType: string, email: string, name: string, sourceKind: string | null, sourceDetail: string | null): Promise<void> {
  const { rows } = await sql`SELECT id, agency_name, agency_id FROM tdg_users WHERE email = ${email} LIMIT 1`
  const u = rows[0]
  if (!u) return
  const where = sourceKind ? ` (${SOURCE_KIND_LABELS[sourceKind as keyof typeof SOURCE_KIND_LABELS] ?? sourceKind}${sourceDetail ? `: ${sourceDetail}` : ''})` : ''
  const why = `Contato registrado por ${name}${where}. Ninguém da rede testou ainda.`
  await sql`
    INSERT INTO tdg_hotel_reviews (hotel_name, hotel_id, entity_type, agent_id, agent_name, agency_name, agency_id, visit_type, status, heads_up, raw_answers, source)
    VALUES (${hotelName}, ${hotelId}, ${entityType === 'dmc' || entityType === 'other' ? entityType : entityType}, ${u.id}, ${name}, ${(u.agency_name as string) ?? name}, ${(u.agency_id as string | null) ?? null}, 'commercial_meeting', 'a_testar', ${why}, ${JSON.stringify({ why_it_matters: why })}, 'contact')`
}

async function categoryForHotel(hotelId: string): Promise<{ name: string | null; category: string }> {
  const { rows } = await sql`SELECT name, entity_type FROM tdg_hotels WHERE id = ${hotelId}`
  return { name: (rows[0]?.name as string | undefined) ?? null, category: ENTITY_TO_CATEGORY[(rows[0]?.entity_type as string) ?? 'hotel'] ?? 'hotel' }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureTable()

  const body = await req.json()
  const { name, surname, title, email, whatsapp, notes, category, organization } = body
  let hotelId: string | null = body.hotelId ?? null

  if (!name || !surname) {
    return NextResponse.json({ error: 'name and surname required' }, { status: 400 })
  }
  if (!hotelId && !category) {
    return NextResponse.json({ error: 'category is required for a contact without hotelId' }, { status: 400 })
  }
  const source = parseSource(body)
  if (!source.ok) return NextResponse.json({ error: source.error }, { status: 400 })

  const addedBy = session.user?.name ?? 'Agente'

  // Vinculado a um fornecedor: categoria vem do tipo do fornecedor e a
  // organization é snapshot do nome dele (subtítulo na lente Contatos).
  // Sem fornecedor mas com organização de fornecedor de viagem: cria/acha
  // o card e vincula. Senão: pessoa avulsa com a categoria escolhida.
  let finalOrganization: string | null = organization ?? null
  let finalCategory: string = category ?? 'hotel'
  let supplierCreated = false
  if (hotelId) {
    const h = await categoryForHotel(hotelId)
    finalOrganization = h.name ?? finalOrganization
    finalCategory = h.category
  } else if (organization && CATEGORY_TO_ENTITY[category]) {
    const supplier = await findOrCreateSupplier(organization, CATEGORY_TO_ENTITY[category], session.user.email)
    hotelId = supplier.id
    finalOrganization = supplier.name
    supplierCreated = supplier.created
    if (supplier.created) {
      // Card recém-nascido: busca foto/endereço/site como proposta pendente (18/10/2026).
      proposeEnrichmentInBackground(supplier.id)
      // E nasce organizado no modelo da rede: um contato vindo de feira,
      // indicação ou reunião é uma DESCOBERTA ("Aguardando teste", selo coral),
      // em nome de quem cadastrou, com o botão "Registrar teste real" à mão.
      // Pergunta da Carla 18/10: "qual é a lógica de registro? Testado? Onde
      // está o review?" — antes o card ficava sem selo nenhum.
      await createDiscoveryLead(supplier.id, supplier.name, CATEGORY_TO_ENTITY[category], session.user.email, addedBy, source.source_kind, source.source_detail)
    }
  }

  const { rows } = await sql`
    INSERT INTO tdg_hotel_contacts
      (hotel_id, added_by, added_by_email, name, surname, title, email, whatsapp, notes, category, organization, source_kind, source_detail)
    VALUES (${hotelId}, ${addedBy}, ${session.user.email}, ${name}, ${surname}, ${title ?? null}, ${email ?? null}, ${whatsapp ?? null}, ${notes ?? null}, ${finalCategory}, ${finalOrganization}, ${source.source_kind}, ${source.source_detail})
    RETURNING *
  `

  return NextResponse.json({ contact: rows[0], supplier_created: supplierCreated })
}

/* Editar contato — aberto a qualquer TD logado, não só quem cadastrou.
   Achado da Carla (02/08): quem percebe que um contato ficou desatualizado
   (pessoa trocou de hotel, saiu da empresa) raramente é quem trouxe a
   informação original — é quem tentou usar o contato agora. Por isso não
   trava em "só o autor edita", diferente da fila de confirmação do autor
   (reviews/conhecimento de destino, que são "confirme o que VOCÊ disse"). */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, hotelId, name, surname, title, email, whatsapp, notes, category, organization } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!name || !surname) {
    return NextResponse.json({ error: 'name and surname required' }, { status: 400 })
  }

  // Reatribuição de fornecedor (Fase 8c) — mesma regra do cadastro: com
  // hotelId, organização vira snapshot do nome do fornecedor; sem, é o que
  // o TD digitou (permite corrigir um vínculo errado, ex. contato de "Vila
  // Oyá" preso em "Vila Joya" por nome parecido na importação do WhatsApp).
  const source = parseSource(body)
  if (!source.ok) return NextResponse.json({ error: source.error }, { status: 400 })
  let finalOrganization = organization ?? null
  let finalCategory = category ?? null
  if (hotelId) {
    const h = await categoryForHotel(hotelId)
    finalOrganization = h.name ?? finalOrganization
    finalCategory = h.category
  }

  const { rows } = await sql`
    UPDATE tdg_hotel_contacts
    SET hotel_id = ${hotelId ?? null}, name = ${name}, surname = ${surname}, title = ${title ?? null},
        email = ${email ?? null}, whatsapp = ${whatsapp ?? null}, notes = ${notes ?? null},
        category = ${finalCategory}, organization = ${finalOrganization},
        source_kind = COALESCE(${source.source_kind}, source_kind), source_detail = COALESCE(${source.source_detail}, source_detail)
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows[0]) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })

  return NextResponse.json({ contact: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await sql`DELETE FROM tdg_hotel_contacts WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
