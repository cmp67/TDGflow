import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    description: 'Busca hotéis no catálogo TDG por destino, perfil de cliente, tipo de viagem ou amenidades. Use para encontrar hotéis relevantes para a consulta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags para filtrar: beach, surf, family, honeymoon, romance, spa, wine, nature, all-inclusive, etc.'
        },
        region: {
          type: 'string',
          description: 'Região: Europa, Ásia, Américas, África, Oceania'
        },
        country: {
          type: 'string',
          description: 'País específico'
        }
      },
      required: []
    }
  },
  {
    name: 'get_active_promotions',
    description: 'Busca promoções ativas com comissão, opcionalmente filtradas por hotel ou período de viagem.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_id: {
          type: 'string',
          description: 'UUID do hotel específico (opcional)'
        },
        travel_month: {
          type: 'string',
          description: 'Mês de viagem ex: "agosto", "julho" (opcional)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_hotel_full_details',
    description: 'Busca todos os detalhes de um hotel: contratos TDG, vantagens negociadas e promoções ativas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hotel_id: {
          type: 'string',
          description: 'UUID do hotel'
        }
      },
      required: ['hotel_id']
    }
  }
]

async function searchHotels(tags?: string[], region?: string, country?: string) {
  let query = supabase.from('tdg_hotels').select('*')
  if (region) query = query.ilike('region', `%${region}%`)
  if (country) query = query.ilike('country', `%${country}%`)
  if (tags && tags.length > 0) query = query.overlaps('tags', tags)
  const { data } = await query.limit(10)
  return data || []
}

async function getActivePromotions(hotel_id?: string, travel_month?: string) {
  let query = supabase
    .from('tdg_promotions')
    .select('*, tdg_hotels(name, location, country)')
    .eq('is_active', true)
    .gte('booking_deadline', new Date().toISOString().split('T')[0])
    .order('commission_rate', { ascending: false })

  if (hotel_id) query = query.eq('hotel_id', hotel_id)

  const { data } = await query.limit(20)
  return data || []
}

async function getHotelFullDetails(hotel_id: string) {
  const [hotelRes, contractsRes, promotionsRes] = await Promise.all([
    supabase.from('tdg_hotels').select('*').eq('id', hotel_id).single(),
    supabase.from('tdg_contracts').select('*').eq('hotel_id', hotel_id),
    supabase.from('tdg_promotions').select('*').eq('hotel_id', hotel_id).eq('is_active', true)
  ])
  return {
    hotel: hotelRes.data,
    contracts: contractsRes.data || [],
    promotions: promotionsRes.data || []
  }
}

async function processToolCall(toolName: string, toolInput: Record<string, unknown>) {
  switch (toolName) {
    case 'search_hotels':
      return await searchHotels(
        toolInput.tags as string[] | undefined,
        toolInput.region as string | undefined,
        toolInput.country as string | undefined
      )
    case 'get_active_promotions':
      return await getActivePromotions(
        toolInput.hotel_id as string | undefined,
        toolInput.travel_month as string | undefined
      )
    case 'get_hotel_full_details':
      return await getHotelFullDetails(toolInput.hotel_id as string)
    default:
      return { error: 'Tool not found' }
  }
}

export async function POST(req: NextRequest) {
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

  // Agentic loop — processa tool calls
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await processToolCall(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        )
        return {
          type: 'tool_result' as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        }
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

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )

  return NextResponse.json({ content: textBlock?.text || '' })
}
