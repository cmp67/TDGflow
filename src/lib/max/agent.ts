import type Anthropic from '@anthropic-ai/sdk'
import { TOOL_DEFINITIONS, callMcpTool } from '@/lib/mcp-tools'
import { maxContextBlock, maxSystemPrompt } from '@/lib/max/prompt'
import type { MaxTurn } from '@/lib/max/memory'
import type { MaxUser } from '@/lib/max/identity'

export const MAX_MODEL = 'claude-sonnet-4-6'
export const MAX_TOOL_ROUNDS = 6
const MAX_TOKENS = 1024

type MessagesApi = { create: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message> }
export type ToolCaller = (name: string, args: Record<string, unknown>) => Promise<unknown>

export type MaxRunInput = {
  user: MaxUser
  isGroup: boolean
  text: string
  history: MaxTurn[]
}
export type MaxRunResult = { text: string; tokensIn: number; tokensOut: number; toolCalls: string[] }

/* WhatsApp não renderiza markdown: **x** vira *x*, títulos viram linha
   simples, listas com "-" ficam. */
export function toWhatsApp(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[•●]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* register_tip sempre em nome de quem está falando (telefone verificado) —
   o modelo não escolhe agent_name/agency_name, nem que a mensagem peça. */
export function bindToolsToUser(user: MaxUser, call: ToolCaller = callMcpTool): ToolCaller {
  return (name, args) => {
    if (name === 'register_tip') return call(name, { ...args, agent_name: user.name, agency_name: user.agency_name })
    return call(name, args)
  }
}

export async function runMax(messages: MessagesApi, input: MaxRunInput, call: ToolCaller = bindToolsToUser(input.user)): Promise<MaxRunResult> {
  const system = `${maxSystemPrompt()}\n\n${maxContextBlock({ userName: input.user.name, agencyName: input.user.agency_name, isGroup: input.isGroup })}`
  const tools = TOOL_DEFINITIONS as unknown as Anthropic.Tool[]
  const convo: Anthropic.MessageParam[] = [...input.history.map(t => ({ role: t.role, content: t.content })), { role: 'user', content: input.text }]
  let tokensIn = 0, tokensOut = 0
  const toolCalls: string[] = []
  let lastText = ''

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const msg = await messages.create({ model: MAX_MODEL, max_tokens: MAX_TOKENS, system, tools, messages: [...convo] })
    tokensIn += msg.usage?.input_tokens ?? 0
    tokensOut += msg.usage?.output_tokens ?? 0
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('\n').trim()
    if (text) lastText = text
    if (msg.stop_reason !== 'tool_use' || round === MAX_TOOL_ROUNDS) break
    const uses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(uses.map(async u => {
      toolCalls.push(u.name)
      let result: unknown
      try { result = await call(u.name, (u.input ?? {}) as Record<string, unknown>) } catch (err) { result = { error: err instanceof Error ? err.message : String(err) } }
      return { type: 'tool_result' as const, tool_use_id: u.id, content: JSON.stringify(result).slice(0, 12000) }
    }))
    convo.push({ role: 'assistant', content: msg.content })
    convo.push({ role: 'user', content: results })
  }
  return { text: toWhatsApp(lastText || 'Não consegui responder agora. Tenta de novo em instantes?'), tokensIn, tokensOut, toolCalls }
}
