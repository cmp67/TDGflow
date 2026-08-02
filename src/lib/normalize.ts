/* Super Busca (padrão obrigatório em todo campo de busca Bemgsy) —
   case-insensitive, accent-insensitive, parcial. Sem extensão `unaccent`
   no Postgres deste projeto, então o accent-folding acontece em JS. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(haystackParts: (string | null | undefined)[], query: string): boolean {
  const haystack = normalizeSearch(haystackParts.filter(Boolean).join(' '))
  return haystack.includes(normalizeSearch(query))
}
