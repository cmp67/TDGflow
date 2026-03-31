import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Você é o TDG Flow, assistente de destinos do Travel Designers Group — uma rede de 19 agências de viagens de luxo do Brasil.

Seu papel é ajudar os agentes de viagem a encontrar os melhores hotéis para os clientes deles E a maximizar os ganhos da agência.

## Como responder consultas

Quando um agente fizer uma consulta (ex: "casal, lua de mel, agosto, praia, surf"):
1. Use SEMPRE as ferramentas disponíveis para buscar hotéis e promoções reais
2. Ordene os resultados por: promoções ativas + comissão mais alta + urgência do deadline
3. Destaque vantagens negociadas TDG (upgrades, créditos F&B, etc.)
4. Mencione sempre os deadlines de reserva das promoções

## Formato de resposta para hotéis

Para cada hotel recomendado, use este formato:

### 🏨 [Nome do Hotel]
📍 [Localização] | 🏷️ [Redes: Virtuoso, SLH, etc.]

**💰 Promoção ativa:** [título] — [X]% comissão | Reservar até [data]
**🎁 Vantagens TDG:** [lista de vantagens negociadas]
**✅ Por que combina:** [razão específica para o perfil do cliente]

---

## Regras importantes

- NUNCA invente informações — use apenas dados das ferramentas
- Se uma promoção tem deadline próximo, mencione com destaque (🔥)
- Priorize hotéis com promoções ativas sobre os sem promoção
- Seja direto e profissional — os agentes são especialistas
- Se não encontrar hotéis adequados, diga claramente e sugira alternativas`

const tools: Anthropic.Tool[] = [
  {
    name: 'search_hotels',
    description: 'Busca hotéis no catálogo TDG por destino, perfil de cliente ou tipo de viagem.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags: beach, surf, family, honeymoon, romance, spa, wine, nature, all-inclusive'
        },
        region: { type: 'string', description: 'Região: Europa, Ásia, Américas, África, Oceania' },
        country: { type: 'string', description: 'País específico' }
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
  }
]

async function processToolCall(toolName: string, toolInput: Record<string, unknown>) {
  if (toolName === 'search_hotels') {
    const { tags, region, country } = toolInput as {
      tags?: string[]; region?: string; country?: string
    }
    let query = 'SELECT * FROM tdg_hotels WHERE 1=1'
    const params: unknown[] = []
    let i = 1
    if (region) { query += ` AND region ILIKE $${i++}`; params.push(`%${region}%`) }
    if (country) { query += ` AND country ILIKE $${i++}`; params.push(`%${country}%`) }
    if (tags?.length) { query += ` AND tags && $${i++}`; params.push(tags) }
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
    const [hotel, contracts, promotions] = await Promise.all([
      sql`SELECT * FROM tdg_hotels WHERE id = ${hotel_id}`,
      sql`SELECT * FROM tdg_contracts WHERE hotel_id = ${hotel_id}`,
      sql`SELECT * FROM tdg_promotions WHERE hotel_id = ${hotel_id} AND is_active = true`
    ])
    return { hotel: hotel.rows[0], contracts: contracts.rows, promotions: promotions.rows }
  }

  return { error: 'Tool not found' }
}

export async function POST(req: NextRequest) {
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
  return NextResponse.json({ content: textBlock?.text || '' })
}
