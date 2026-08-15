import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkTravelRequirements } from '@/lib/travel-docs'
import { logUsage } from '@/lib/usage-log'
import { checkAndDeductCredits, INSUFFICIENT_BALANCE, NO_AGENCY } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'
import { TOOL_DEFINITIONS, callMcpTool } from '@/lib/mcp-tools'

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

## Ferramentas disponíveis

- search_tdg_suppliers — buscar fornecedor (hotel, beach club, transfer, guia, restaurante) por nome, região, país, perfil de cliente ou palavra-chave
- get_tdg_supplier_details — ficha completa de um fornecedor: dados gerais, condições negociadas pela rede (comissão diferenciada, amenidade exclusiva, condição de pagamento), contatos e reviews recentes
- search_tdg_offers — ofertas ativas com comissão negociada, ordenadas por comissão mais alta
- search_reviews / get_review / list_hotel_tips — o que a rede já disse sobre um hotel (avaliações, highlights, perfil de cliente ideal, ressalvas)
- check_travel_requirements — visto, CIVP, ETA e segurança pra um destino

## Como responder consultas de hotéis

Quando o consultor descrever um perfil de cliente (ex: "casal, lua de mel, agosto, praia, esportivo"):
1. Use SEMPRE as ferramentas para buscar fornecedores, ofertas e reviews reais — nunca responda de memória
2. Use o parâmetro \`profiles\` do search_tdg_suppliers pro TIPO de cliente (família, casais & lua de mel, praia etc.) — NUNCA \`tags\` pra isso, tags é só palavra-chave descritiva solta (ex: "Golf", "5 Estrelas")
3. Algarve, Lisboa, Chiado, Sagres, Quinta do Lago etc. são REGIÕES dentro de Portugal — use o parâmetro \`region\`, nunca \`country\` (country="Portugal" nesses casos, se precisar)
4. Depois de achar o fornecedor, busque list_hotel_tips ou search_tdg_offers pra enriquecer a resposta — ordene por: oferta ativa → comissão mais alta → deadline mais urgente
5. Destaque condições negociadas pela rede (comissão diferenciada, amenidade exclusiva, condição de pagamento) quando get_tdg_supplier_details retornar alguma
6. Se houver oferta ativa, sempre mencione o deadline de reserva
7. Se a primeira busca (região + perfil) não retornar nada, tente de novo só com a região antes de dizer que não achou nada — perfil junto pode estar filtrando demais
8. Ao final, sugira: "Quer que eu busque mais opções ou precisa de detalhes de algum hotel?"

## Formato de resposta para hotéis

### 🏨 [Nome do Hotel]
📍 [Localização]

**Oferta ativa:** [título/tipo] — [X]% de comissão | Reservar até [data] (se houver, via search_tdg_offers)
**Condições negociadas pela rede:** [lista, se get_tdg_supplier_details retornar]
**O que a rede diz:** [highlights de list_hotel_tips/search_reviews, se houver]
**Por que combina:** [razão específica para o perfil]

---

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
- 🔥 para ofertas com menos de 7 dias para o deadline
- Se não encontrar hotéis adequados, diga claramente e ofereça alternativas
- Sempre termine com uma sugestão de próximo passo`

// Fase 8e (02/08): reaproveita as mesmas ferramentas do servidor MCP do MAX
// (src/lib/mcp-tools.ts) — antes o chat só tinha search_hotels básico +
// get_hotel_full_details lendo de tdg_contracts/tdg_promotions/tdg_knowledge,
// as 3 tabelas legadas vazias (schema antigo), nunca retornando nada de
// verdade. Agora busca fornecedor/oferta/review/dica igual ao MAX no
// WhatsApp — uma implementação só, dois consumidores.
const tools: Anthropic.Tool[] = [
  ...TOOL_DEFINITIONS.filter(t => t.name !== 'register_tip'),
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
  if (toolName === 'check_travel_requirements') {
    const { destination } = toolInput as { destination: string }
    return await checkTravelRequirements(destination)
  }

  return await callMcpTool(toolName, toolInput)
}

// Streaming (06/08): antes o chat esperava a resposta completa — incluindo
// todas as idas e vindas de tool_use — antes de mostrar qualquer coisa,
// o que a Carla sentiu como lentidão. Mensagem de status só aparece
// atrelada a uma ferramenta que está DE FATO rodando naquele instante
// (nunca uma lista fixa de "possíveis" ações) — abordagem Tesla: zero
// expectativa criada por uma ação que não está de fato acontecendo.
const TOOL_STATUS_LABELS: Record<string, string> = {
  search_tdg_suppliers: 'Buscando fornecedores que combinam com o perfil...',
  get_tdg_supplier_details: 'Consultando condições negociadas pela rede...',
  search_tdg_offers: 'Consultando ofertas vigentes...',
  search_reviews: 'Conferindo o que a rede disse sobre esses hotéis...',
  get_review: 'Conferindo o que a rede disse sobre esses hotéis...',
  list_hotel_tips: 'Conferindo o que a rede disse sobre esses hotéis...',
  check_travel_requirements: 'Verificando documentação de viagem...',
}

function statusLabelForTool(toolName: string): string {
  return TOOL_STATUS_LABELS[toolName] ?? 'Buscando informações...'
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

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      let tokensIn = 0
      let tokensOut = 0
      // Achado da Carla, 15/08: narração colava sem espaço ("...Ibiza!Nenhum
      // resultado..."). Causa: o modelo intercala blocos de texto curtos
      // entre chamadas de ferramenta (texto → tool_use → texto → tool_use →
      // texto...), inclusive entre voltas separadas deste while (cada volta
      // é uma stream nova). Concatenar os deltas direto, sem separador entre
      // um bloco de texto e o próximo, gruda frase com frase. anyTextSent
      // precisa sobreviver entre as voltas do loop (por isso fora dele).
      let anyTextSent = false

      try {
        let finalMessage: Anthropic.Message
        while (true) {
          const messageStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools,
            messages: anthropicMessages
          })

          messageStream.on('streamEvent', (event) => {
            if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
              send({ type: 'status', label: statusLabelForTool(event.content_block.name) })
            } else if (event.type === 'content_block_start' && event.content_block.type === 'text' && anyTextSent) {
              send({ type: 'text', delta: '\n\n' })
            }
          })
          messageStream.on('text', (delta) => {
            anyTextSent = true
            send({ type: 'text', delta })
          })

          finalMessage = await messageStream.finalMessage()
          tokensIn += finalMessage.usage?.input_tokens ?? 0
          tokensOut += finalMessage.usage?.output_tokens ?? 0

          if (finalMessage.stop_reason !== 'tool_use') break

          const toolUseBlocks = finalMessage.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
          )
          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (toolUse) => {
              const result = await processToolCall(toolUse.name, toolUse.input as Record<string, unknown>)
              return { type: 'tool_result' as const, tool_use_id: toolUse.id, content: JSON.stringify(result) }
            })
          )
          anthropicMessages.push({ role: 'assistant', content: finalMessage.content })
          anthropicMessages.push({ role: 'user', content: toolResults })
        }

        logUsage({
          event_type: 'chat',
          user_email: userEmail,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          meta: { model: 'claude-sonnet-4-6' },
        })

        send({ type: 'done' })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    }
  })
}
