import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkTravelRequirements } from '@/lib/travel-docs'
import { logUsage } from '@/lib/usage-log'
import { deductCredits, checkAndDeductCredits, INSUFFICIENT_BALANCE, NO_AGENCY } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `Você é o TDG Flow, assistente de destinos do Travel Designers Group — uma rede de 19 agências de viagens de luxo do Brasil.

Fale SEMPRE em português do Brasil. Seja direto, profissional e proativo.

## Seu papel

Você ajuda os consultores de viagem a:
1. Encontrar os melhores hotéis para o perfil de cada cliente
2. Maximizar comissões e vantagens negociadas pela rede TDG
3. Navegar e usar o sistema (registrar visitas, transcrever gravações, entender funcionalidades)
4. Antecipar o próximo passo — sugira ações concretas após cada resposta

## Como responder consultas de hotéis

Quando o consultor descrever um perfil de cliente (ex: "casal, lua de mel, agosto, praia, esportivo"):
1. Use SEMPRE as ferramentas para buscar hotéis e promoções reais
2. Use o parâmetro \`profiles\` do search_hotels pro TIPO de cliente (família, casais, praia etc.) — NUNCA \`tags\` pra isso, tags é só palavra-chave descritiva solta (ex: "Golf", "5 Estrelas")
3. Algarve, Lisboa, Chiado, Sagres, Quinta do Lago etc. são REGIÕES dentro de Portugal — use o parâmetro \`region\`, nunca \`country\` (country="Portugal" nesses casos, se precisar)
4. Ordene por: promoções ativas → comissão mais alta → deadline mais urgente
5. Destaque vantagens TDG (upgrades, créditos F&B, early check-in, etc.)
6. Sempre mencione o deadline de reserva
7. Se a primeira busca (região + perfil) não retornar nada, tente de novo só com a região antes de dizer que não achou nada — perfil junto pode estar filtrando demais
8. Ao final, sugira: "Quer que eu busque mais opções ou precisa de detalhes de algum hotel?"

## Formato de resposta para hotéis

### 🏨 [Nome do Hotel]
📍 [Localização]

**Promoção ativa:** [título] — [X]% de comissão | Reservar até [data]
**Vantagens TDG:** [lista]
**Por que combina:** [razão específica para o perfil]

---

## Base de conhecimento

get_hotel_full_details retorna um campo "knowledge" com fatos, notas e materiais verificados pela equipe TDG:
- fact: inclua na descrição
- note: use como dica operacional
- link/pdf/video: mencione como recurso ("Ficha técnica disponível: [título]")

## Orientação sobre o sistema

Se o consultor perguntar como registrar uma visita, gravar áudio, ou usar qualquer funcionalidade:
- Explique de forma simples e direta em PT-BR
- Visitas/avaliações/reuniões comerciais: menu "Na prática" → botão "Registrar experiência" → responder o questionário guiado
- Gravações: dentro de "Na prática" → botão "Gravar" → depois ir em "Fila" para transcrever (não é mais um menu próprio)
- Fornecedores: menu "Fornecedores" → catálogo de hotéis, beach clubs, transfers, guias e restaurantes parceiros, com contatos e descrições

## Documentação de viagem

Quando o consultor mencionar um destino internacional, use check_travel_requirements para verificar automaticamente:
- Requisito de visto para passaporte brasileiro
- Se CIVP (certificado de febre amarela) é obrigatório
- Nível de alerta de segurança do país
- Qualquer ETA ou autorização eletrônica necessária

Formato para documentação:
📋 **Documentação — [País]**
- Visto: [status]
- CIVP: [Obrigatório / Não exigido]
- Segurança: Nível [N]/4 — [label]
- [Notas especiais se houver]

Inclua esta seção ao recomendar hotéis num destino novo, ou quando o consultor perguntar sobre documentação.

## Regras

- NUNCA invente dados — use somente informações das ferramentas
- Não mencione características que não estão nos dados
- 🔥 para promoções com menos de 7 dias para o deadline
- Se não encontrar hotéis adequados, diga claramente e ofereça alternativas
- Sempre termine com uma sugestão de próximo passo`

const tools: Anthropic.Tool[] = [
  {
    name: 'search_hotels',
    description: 'Busca hotéis no catálogo TDG por destino, perfil de cliente ou palavra-chave descritiva.',
    input_schema: {
      type: 'object' as const,
      properties: {
        profiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Perfil do cliente — use exatamente um destes valores (em português, como estão no catálogo): Família, Casais, Praia, Urban, Resort, Boutique, Golf, Villas, Overwater, Ultra Luxury, Natureza, Negócios'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Palavras-chave descritivas livres (ex: "Golf", "5 Estrelas", "Ski") — busca parcial, não precisa ser exato. Não usar pra tipo de cliente, isso é o parâmetro profiles.'
        },
        region: { type: 'string', description: 'Região/destino específico dentro do país (ex: Algarve, Lisboa, Toscana, Maldivas)' },
        country: { type: 'string', description: 'País (ex: Portugal, Itália, França)' }
      },
      required: []
    }
  },
  {
    name: 'get_active_promotions',
    description: 'Busca promoções ativas com comissão, ordenadas por comissão mais alta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_id: { type: 'string', description: 'UUID do hotel (opcional)' }
      },
      required: []
    }
  },
  {
    name: 'get_hotel_full_details',
    description: 'Busca todos os detalhes de um hotel: contratos TDG, vantagens e promoções.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_id: { type: 'string', description: 'UUID do hotel' }
      },
      required: ['hotel_id']
    }
  },
  {
    name: 'check_travel_requirements',
    description: 'Verifica requisitos de viagem para passaporte brasileiro: visto, CIVP (febre amarela), ETA e alertas de segurança. Usar sempre que um destino internacional for mencionado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        destination: {
          type: 'string',
          description: 'Nome do país de destino em português (ex: "Japão", "África do Sul", "Reino Unido") ou código ISO 2 letras'
        }
      },
      required: ['destination']
    }
  }
]

export async function processToolCall(toolName: string, toolInput: Record<string, unknown>) {
  if (toolName === 'search_hotels') {
    const { profiles, tags, region, country } = toolInput as {
      profiles?: string[]; tags?: string[]; region?: string; country?: string
    }
    let query = 'SELECT * FROM tdg_hotels WHERE 1=1'
    const params: unknown[] = []
    let i = 1
    if (region) { query += ` AND region ILIKE $${i++}`; params.push(`%${region}%`) }
    if (country) { query += ` AND country ILIKE $${i++}`; params.push(`%${country}%`) }
    // profiles é a mesma taxonomia fechada (12 valores em PT) usada no catálogo
    // de Fornecedores — array overlap direto funciona porque é vocabulário
    // controlado, sem risco de mismatch de idioma/capitalização.
    if (profiles?.length) { query += ` AND profiles && $${i++}`; params.push(profiles) }
    // tags é texto livre — busca parcial case-insensitive em vez de match
    // exato de array, pra não depender do modelo acertar a grafia idêntica.
    if (tags?.length) {
      query += ` AND EXISTS (SELECT 1 FROM unnest(tags) AS tg WHERE tg ILIKE ANY($${i++}))`
      params.push(tags.map(t => `%${t}%`))
    }
    query += ' LIMIT 10'
    const { rows } = await sql.query(query, params)
    return rows
  }

  if (toolName === 'get_active_promotions') {
    const { hotel_id } = toolInput as { hotel_id?: string }
    if (hotel_id) {
      const { rows } = await sql`
        SELECT p.*, h.name as hotel_name, h.location, h.country
        FROM tdg_promotions p JOIN tdg_hotels h ON h.id = p.hotel_id
        WHERE p.is_active = true
          AND p.booking_deadline >= CURRENT_DATE
          AND p.hotel_id = ${hotel_id}
        ORDER BY p.commission_rate DESC LIMIT 20`
      return rows
    }
    const { rows } = await sql`
      SELECT p.*, h.name as hotel_name, h.location, h.country
      FROM tdg_promotions p JOIN tdg_hotels h ON h.id = p.hotel_id
      WHERE p.is_active = true AND p.booking_deadline >= CURRENT_DATE
      ORDER BY p.commission_rate DESC LIMIT 20`
    return rows
  }

  if (toolName === 'get_hotel_full_details') {
    const { hotel_id } = toolInput as { hotel_id: string }
    const [hotel, contracts, promotions, knowledge] = await Promise.all([
      sql`SELECT * FROM tdg_hotels WHERE id = ${hotel_id}`,
      sql`SELECT * FROM tdg_contracts WHERE hotel_id = ${hotel_id}`,
      sql`SELECT * FROM tdg_promotions WHERE hotel_id = ${hotel_id} AND is_active = true`,
      sql`SELECT type, title, content, url FROM tdg_knowledge WHERE hotel_id = ${hotel_id} ORDER BY created_at DESC`
    ])
    return { hotel: hotel.rows[0], contracts: contracts.rows, promotions: promotions.rows, knowledge: knowledge.rows }
  }

  if (toolName === 'check_travel_requirements') {
    const { destination } = toolInput as { destination: string }
    return await checkTravelRequirements(destination)
  }

  return { error: 'Tool not found' }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const userEmail = session?.user?.email ?? 'unknown'

  // Check balance BEFORE calling AI
  const agencyId = await getAgencyId(userEmail)
  const credit = await checkAndDeductCredits({ agencyId, action: 'chat', userEmail, isBemgsyAdmin: session?.user?.role === 'admin' })
  if (!credit.ok) {
    if (credit.reason === NO_AGENCY) return NextResponse.json({ error: NO_AGENCY }, { status: 403 })
    return NextResponse.json({ error: INSUFFICIENT_BALANCE }, { status: 402 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { messages } = await req.json()

  const anthropicMessages: Anthropic.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })
  )

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools,
    messages: anthropicMessages
  })

  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await processToolCall(toolUse.name, toolUse.input as Record<string, unknown>)
        return { type: 'tool_result' as const, tool_use_id: toolUse.id, content: JSON.stringify(result) }
      })
    )
    anthropicMessages.push({ role: 'assistant', content: response.content })
    anthropicMessages.push({ role: 'user', content: toolResults })
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages: anthropicMessages
    })
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')

  // Log token usage + deduct credits (fire-and-forget)
  logUsage({
    event_type: 'chat',
    user_email: userEmail,
    tokens_in:  response.usage?.input_tokens,
    tokens_out: response.usage?.output_tokens,
    meta: { model: 'claude-sonnet-4-6' },
  })
  // Credit already deducted at start of request

  return NextResponse.json({ content: textBlock?.text || '' })
}
