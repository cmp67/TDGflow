/* Molde do Max — espelho de agentes/tdg-flow/max/prompt.md (o teste
   prompt.test.ts garante que os dois são idênticos; editar lá e aqui). */
import { BR_TZ } from '@/lib/tz'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let cached: string | null = null

/* Lê o molde do repositório. Na Vercel o arquivo é incluído no bundle via
   outputFileTracingIncludes (next.config.ts). */
export function maxSystemPrompt(): string {
  if (cached) return cached
  cached = readFileSync(join(process.cwd(), 'agentes/tdg-flow/max/prompt.md'), 'utf8').trim()
  return cached
}

/* "Hoje é segunda-feira, 19/10/2026" em Brasília — sem isso o modelo chuta o
   ano ("próxima quinta" virou 22/05/2025, 19/10/2026). */
export function todayLine(now = new Date()): string {
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: BR_TZ, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const parts = Object.fromEntries(f.formatToParts(now).map(p => [p.type, p.value]))
  return `Hoje é ${parts.weekday}, ${parts.day}/${parts.month}/${parts.year}, ${parts.hour}h${parts.minute} (horário de Brasília). Datas relativas ("quinta", "amanhã", "mês que vem") partem daqui.`
}

/* Próximos 21 dias já resolvidos em São Paulo — o modelo errava o dia da
   semana ("quinta 23/10", que é sexta; 19/10/2026). Ele lê daqui, não calcula. */
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export function maxCalendar(now = new Date(), days = 21): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: BR_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(p => [p.type, p.value]))
  const base = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base + i * 86_400_000)
    const label = `${WD[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    return i === 0 ? `${label} (hoje)` : label
  }).join(' · ')
}

export function maxContextBlock(input: { userName: string | null; agencyName: string | null; identified: boolean; isGroup: boolean; now?: Date }): string {
  const quem = input.identified
    ? `Consultora: ${input.userName} (agência ${input.agencyName}), verificada pelo telefone.`
    : `Pessoa não identificada pelo telefone${input.userName ? ` (o WhatsApp mostra "${input.userName}")` : ''}: atenda normalmente, trate pelo primeiro nome se souber, e NUNCA diga que não está cadastrada. Só não há como registrar em nome dela — se pedir pra registrar, diga que precisa do WhatsApp cadastrado no perfil do Flow e ofereça buscar o que a rede já sabe.`
  return [
    '<contexto_da_chamada>',
    todayLine(input.now),
    `Calendário (use estes dias da semana, não calcule): ${maxCalendar(input.now)}.`,
    quem,
    `Canal: ${input.isGroup ? 'grupo da TDG (você foi marcado)' : 'conversa individual'}.`,
    ...(input.isGroup ? ['No grupo, quando pedir confirmação, termine com uma pergunta curta ("Registro?"): a pessoa responde "sim" sem precisar te marcar, por 10 minutos. Evento com visibilidade rede já aparece pra rede inteira e o grupo é lembrado na véspera às 18h — "convide todo mundo do grupo" é isso, não convite individual.'] : []),
    input.identified ? 'Registros (register_tip) saem em nome dela; o sistema preenche agent_name e agency_name.' : 'A ferramenta register_tip não está disponível nesta chamada.',
    '</contexto_da_chamada>',
  ].join('\n')
}
