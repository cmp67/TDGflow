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

export function maxContextBlock(input: { userName: string; agencyName: string; isGroup: boolean }): string {
  return [
    '<contexto_da_chamada>',
    `Consultora: ${input.userName} (agência ${input.agencyName}), verificada pelo telefone.`,
    `Canal: ${input.isGroup ? 'grupo da TDG (você foi marcado)' : 'conversa individual'}.`,
    'Registros (register_tip) saem em nome dela; o sistema preenche agent_name e agency_name.',
    '</contexto_da_chamada>',
  ].join('\n')
}
