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

export function maxContextBlock(input: { userName: string | null; agencyName: string | null; identified: boolean; isGroup: boolean }): string {
  const quem = input.identified
    ? `Consultora: ${input.userName} (agência ${input.agencyName}), verificada pelo telefone.`
    : `Pessoa não identificada pelo telefone${input.userName ? ` (o WhatsApp mostra "${input.userName}")` : ''}: atenda normalmente, trate pelo primeiro nome se souber, e NUNCA diga que não está cadastrada. Só não há como registrar em nome dela — se pedir pra registrar, diga que precisa do WhatsApp cadastrado no perfil do Flow e ofereça buscar o que a rede já sabe.`
  return [
    '<contexto_da_chamada>',
    quem,
    `Canal: ${input.isGroup ? 'grupo da TDG (você foi marcado)' : 'conversa individual'}.`,
    input.identified ? 'Registros (register_tip) saem em nome dela; o sistema preenche agent_name e agency_name.' : 'A ferramenta register_tip não está disponível nesta chamada.',
    '</contexto_da_chamada>',
  ].join('\n')
}
