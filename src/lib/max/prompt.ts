/* Molde do Max — espelho de agentes/tdg-flow/max/prompt.md (o teste
   prompt.test.ts garante que os dois são idênticos; editar lá e aqui). */
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
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const parts = Object.fromEntries(f.formatToParts(now).map(p => [p.type, p.value]))
  return `Hoje é ${parts.weekday}, ${parts.day}/${parts.month}/${parts.year}, ${parts.hour}h${parts.minute} (horário de Brasília). Datas relativas ("quinta", "amanhã", "mês que vem") partem daqui.`
}

export function maxContextBlock(input: { userName: string | null; agencyName: string | null; identified: boolean; isGroup: boolean; now?: Date }): string {
  const quem = input.identified
    ? `Consultora: ${input.userName} (agência ${input.agencyName}), verificada pelo telefone.`
    : `Pessoa não identificada pelo telefone${input.userName ? ` (o WhatsApp mostra "${input.userName}")` : ''}: atenda normalmente, trate pelo primeiro nome se souber, e NUNCA diga que não está cadastrada. Só não há como registrar em nome dela — se pedir pra registrar, diga que precisa do WhatsApp cadastrado no perfil do Flow e ofereça buscar o que a rede já sabe.`
  return [
    '<contexto_da_chamada>',
    todayLine(input.now),
    quem,
    `Canal: ${input.isGroup ? 'grupo da TDG (você foi marcado)' : 'conversa individual'}.`,
    ...(input.isGroup ? ['No grupo, quando pedir confirmação, termine com uma pergunta curta ("Registro?"): a pessoa responde "sim" sem precisar te marcar, por 10 minutos. Evento com visibilidade rede já aparece pra rede inteira e o grupo é lembrado na véspera às 18h — "convide todo mundo do grupo" é isso, não convite individual.'] : []),
    input.identified ? 'Registros (register_tip) saem em nome dela; o sistema preenche agent_name e agency_name.' : 'A ferramenta register_tip não está disponível nesta chamada.',
    '</contexto_da_chamada>',
  ].join('\n')
}
