/* Casa o source_author extraído do WhatsApp (texto livre, muitas vezes
   nome parcial/apelido — "Elaine Scanavacca", "Dani Filippozzi") com o nome
   legal completo cadastrado em tdg_users ("Elaine Alvarenga Scanavacca",
   "DANIELLE FILIPPOZZI"). Substring exato falha sempre que falta um nome do
   meio ou sobrenome — achado real, 10/08: 1600+ itens presos na fila do
   admin mesmo com o autor já tendo conta real, só porque o nome extraído
   era mais curto que o nome legal completo.

   Regra: pelo menos 2 palavras do nome do usuário (a primeira + qualquer
   outra) precisam aparecer como palavra inteira no texto do autor. Duas
   palavras em vez de uma evita falso positivo entre pessoas que dividem o
   mesmo primeiro nome (a rede tem 3 "Ana"s, 2 "Caroline"s cadastradas). */

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
}

function words(s: string): string[] {
  return normalize(s).match(/[\p{L}\d]+/gu) ?? []
}

export function isAuthorMatch(sourceAuthor: string | null | undefined, userName: string | null | undefined): boolean {
  if (!sourceAuthor || !userName) return false
  const nameWords = words(userName).filter(w => w.length > 1) // ignora iniciais soltas
  if (nameWords.length === 0) return false
  const authorWords = new Set(words(sourceAuthor))

  const [first, ...rest] = nameWords
  if (!authorWords.has(first)) return false
  if (rest.length === 0) return true // nome de uma palavra só — a 1ª já basta
  return rest.some(w => authorWords.has(w))
}
