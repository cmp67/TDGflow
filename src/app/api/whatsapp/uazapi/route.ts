import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { parseUazapiWebhook, stripMention, isMentioned, learnInstanceLid } from '@/lib/max/webhook'
import { readUazapiConfig, sendWhatsAppText } from '@/lib/max/transport'
import { findUserByPhone } from '@/lib/max/identity'
import { recentTurns, rememberInbound, rememberOutbound, knownInstanceLid, rememberInstanceLid } from '@/lib/max/memory'
import { runMax, MAX_MODEL } from '@/lib/max/agent'
import { readCentralConfig, centralToolDefinitions } from '@/lib/max/central-mcp'
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

const SEM_LUMIS = 'Sua agência está sem Lumis neste ciclo. Dá pra comprar um pacote em Billing no Flow, ou esperar o dia 1.'
const SEM_AGENCIA = 'Sua conta no Flow ainda não está ligada a uma agência — pede pro administrador ajustar, que daí eu consigo registrar as coisas no seu nome.'
const FALHOU = 'Deu um problema aqui do meu lado. Tenta de novo em instantes?'

export async function POST(req: NextRequest) {
  const secret = (process.env.UAZAPI_WEBHOOK_SECRET ?? '').trim()
  const given = new URL(req.url).searchParams.get('s') ?? ''
  if (!secret || !same(given, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = readUazapiConfig(process.env)
  if (!config) return NextResponse.json({ error: 'uazapi não configurada' }, { status: 503 })

  const payload = await req.json().catch(() => null)
  // Eco do próprio Max: antes de ignorar, aprende o LID da instância (é assim
  // que a menção por toque "@<lid>" passa a ser reconhecida — 18/10/2026).
  const learnedLid = learnInstanceLid(payload)
  if (learnedLid) {
    const tokenOk = typeof payload === 'object' && payload !== null && same(String((payload as Record<string, unknown>).token ?? ''), config.instanceToken)
    if (tokenOk && (await knownInstanceLid()) !== learnedLid) await rememberInstanceLid(learnedLid)
    return NextResponse.json({ ok: true, ignored: 'eco', learned: 'lid' })
  }
  const inbound = parseUazapiWebhook(payload)
  if (!inbound) return NextResponse.json({ ok: true, ignored: 'sem mensagem de texto' })
  if (!same(inbound.instanceToken, config.instanceToken)) return NextResponse.json({ error: 'instância desconhecida' }, { status: 401 })
  const instanceLid = inbound.isGroup ? await knownInstanceLid() : null
  if (inbound.isGroup && !isMentioned(inbound.text, inbound.ownerPhone, [...inbound.mentionedJids], instanceLid)) return NextResponse.json({ ok: true, ignored: 'grupo sem menção' })

  const user = inbound.senderPhone ? await findUserByPhone(inbound.senderPhone) : null
  if (!user) {
    // Diagnóstico sem PII (18/10/2026, caso "número não registrado"): só o
    // tipo do JID e se a uazapi mandou sender_pn — nunca número nem LID.
    console.info('[max] remetente não identificado', { group: inbound.isGroup, jidKind: inbound.jidKind, hasSenderPn: inbound.hasSenderPn })
  }
  const text = stripMention(inbound.text, inbound.ownerPhone, instanceLid)
  const fresh = await rememberInbound({ messageId: inbound.messageId, chatId: inbound.chatId, isGroup: inbound.isGroup, senderPhone: inbound.senderPhone, senderJid: inbound.senderJid, userId: user?.id ?? null, content: text })
  if (!fresh) return NextResponse.json({ ok: true, ignored: 'duplicada' })

  const reply = async (body: string, tokens = { tokensIn: 0, tokensOut: 0 }) => {
    const sent = await sendWhatsAppText(config, { chatId: inbound.chatId, text: body, dedupeKey: `max:${inbound.messageId}` })
    await rememberOutbound({ messageId: sent.ok ? sent.messageId : `out:${inbound.messageId}`, chatId: inbound.chatId, isGroup: inbound.isGroup, userId: user?.id ?? null, content: body, ...tokens })
    if (!sent.ok) console.error('[max] envio falhou', { chat: inbound.chatId.slice(-6), error: sent.error })
    return NextResponse.json({ ok: true, sent: sent.ok })
  }

  // Número sem cadastro (ou conta inativa): atende do mesmo jeito, só não
  // registra em nome de ninguém e não debita Lumis de agência nenhuma
  // (decisão da Carla 11/09/2026: o Max nunca recusa por cadastro). Fica no
  // usage log com o telefone pra Bemgsy enxergar o custo.
  const identified = !!user && user.active
  if (identified) {
    const agencyId = await getAgencyId(user.email)
    const credit = await checkAndDeductCredits({ agencyId, action: 'chat', userEmail: user.email, isBemgsyAdmin: user.role === 'admin' })
    if (!credit.ok) return reply(credit.reason === NO_AGENCY ? SEM_AGENCIA : credit.reason === INSUFFICIENT_BALANCE ? SEM_LUMIS : FALHOU)
  }

  try {
    const history = await recentTurns(inbound.chatId, inbound.senderJid, inbound.isGroup)
    // a mensagem atual já está na memória — tira do histórico pra não duplicar
    const priorTurns = history.length && history[history.length - 1].role === 'user' && history[history.length - 1].content === text ? history.slice(0, -1) : history
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const central = readCentralConfig(process.env)
    const extraTools = await centralToolDefinitions(central)
    const identity = identified ? { user } : { user: null, senderName: inbound.senderName }
    const result = await runMax(anthropic.messages, { identity, isGroup: inbound.isGroup, text, history: priorTurns, extraTools, central })
    logUsage({ event_type: 'max_whatsapp', user_email: identified ? user.email : `whatsapp:${inbound.jidKind}`, tokens_in: result.tokensIn, tokens_out: result.tokensOut, meta: { model: MAX_MODEL, tools: result.toolCalls, group: inbound.isGroup, identified } })
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
