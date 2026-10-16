import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { parseUazapiWebhook, stripMention } from '@/lib/max/webhook'
import { readUazapiConfig, sendWhatsAppText } from '@/lib/max/transport'
import { findUserByPhone } from '@/lib/max/identity'
import { recentTurns, rememberInbound, rememberOutbound } from '@/lib/max/memory'
import { runMax, MAX_MODEL } from '@/lib/max/agent'
import { checkAndDeductCredits, INSUFFICIENT_BALANCE, NO_AGENCY } from '@/lib/credits'
import { getAgencyId } from '@/lib/agency'
import { logUsage } from '@/lib/usage-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* Max dentro do Flow (16/10/2026): webhook da uazapi. Autenticação em duas
   camadas: segredo na URL (?s=) e token da instância no payload. Nunca loga
   o payload (traz o token). Regras: ignora eco e mensagem sem texto; em
   grupo só responde quando marcado; identidade pelo telefone (nunca pelo
   que a mensagem diz); Lumis debitados ANTES da IA (falha fechado);
   idempotente por message_id; falha da IA vira mensagem curta, nunca 500
   silencioso (a uazapi não reentrega por erro nosso). */

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

const SEM_CADASTRO = 'Oi! Não achei este número no TDG Flow. Pede pra quem administra a sua agência cadastrar o seu WhatsApp no seu perfil, que daí a gente conversa por aqui.'
const SEM_LUMIS = 'Sua agência está sem Lumis neste ciclo. Dá pra comprar um pacote em Billing no Flow, ou esperar o dia 1.'
const SEM_AGENCIA = 'Sua conta no Flow ainda não está ligada a uma agência — pede pro administrador ajustar, que daí eu consigo registrar as coisas no seu nome.'
const FALHOU = 'Deu um problema aqui do meu lado. Tenta de novo em instantes?'

export async function POST(req: NextRequest) {
  const secret = (process.env.UAZAPI_WEBHOOK_SECRET ?? '').trim()
  const given = new URL(req.url).searchParams.get('s') ?? ''
  if (!secret || !same(given, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = readUazapiConfig(process.env)
  if (!config) return NextResponse.json({ error: 'uazapi não configurada' }, { status: 503 })

  const inbound = parseUazapiWebhook(await req.json().catch(() => null))
  if (!inbound) return NextResponse.json({ ok: true, ignored: 'sem mensagem de texto' })
  if (!same(inbound.instanceToken, config.instanceToken)) return NextResponse.json({ error: 'instância desconhecida' }, { status: 401 })
  if (inbound.isGroup && !inbound.mentioned) return NextResponse.json({ ok: true, ignored: 'grupo sem menção' })

  const user = await findUserByPhone(inbound.senderPhone)
  const text = stripMention(inbound.text, inbound.ownerPhone)
  const fresh = await rememberInbound({ messageId: inbound.messageId, chatId: inbound.chatId, isGroup: inbound.isGroup, senderPhone: inbound.senderPhone, userId: user?.id ?? null, content: text })
  if (!fresh) return NextResponse.json({ ok: true, ignored: 'duplicada' })

  const reply = async (body: string, tokens = { tokensIn: 0, tokensOut: 0 }) => {
    const sent = await sendWhatsAppText(config, { chatId: inbound.chatId, text: body, dedupeKey: `max:${inbound.messageId}` })
    await rememberOutbound({ messageId: sent.ok ? sent.messageId : `out:${inbound.messageId}`, chatId: inbound.chatId, isGroup: inbound.isGroup, userId: user?.id ?? null, content: body, ...tokens })
    if (!sent.ok) console.error('[max] envio falhou', { chat: inbound.chatId.slice(-6), error: sent.error })
    return NextResponse.json({ ok: true, sent: sent.ok })
  }

  if (!user || !user.active) return reply(SEM_CADASTRO)

  const agencyId = await getAgencyId(user.email)
  const credit = await checkAndDeductCredits({ agencyId, action: 'chat', userEmail: user.email, isBemgsyAdmin: user.role === 'admin' })
  if (!credit.ok) return reply(credit.reason === NO_AGENCY ? SEM_AGENCIA : credit.reason === INSUFFICIENT_BALANCE ? SEM_LUMIS : FALHOU)

  try {
    const history = await recentTurns(inbound.chatId, inbound.senderPhone, inbound.isGroup)
    // a mensagem atual já está na memória — tira do histórico pra não duplicar
    const priorTurns = history.length && history[history.length - 1].role === 'user' && history[history.length - 1].content === text ? history.slice(0, -1) : history
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const result = await runMax(anthropic.messages, { user, isGroup: inbound.isGroup, text, history: priorTurns })
    logUsage({ event_type: 'max_whatsapp', user_email: user.email, tokens_in: result.tokensIn, tokens_out: result.tokensOut, meta: { model: MAX_MODEL, tools: result.toolCalls, group: inbound.isGroup } })
    return reply(result.text, { tokensIn: result.tokensIn, tokensOut: result.tokensOut })
  } catch (err) {
    console.error('[max] agente falhou', { error: err instanceof Error ? err.message : String(err) })
    return reply(FALHOU)
  }
}

/* GET — só pra conferir que a rota existe (a uazapi testa o webhook com GET
   em alguns painéis). Nunca revela config. */
export async function GET() {
  return NextResponse.json({ ok: true, agent: 'max' })
}
