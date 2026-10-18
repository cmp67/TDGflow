// Extraído de POST /api/reviews pra ser testável sem precisar mockar Anthropic
// SDK + checkAndDeductCredits. Bug real capturado 28/07 (review Saint Tropez
// Nikki, nota -3): sem a nota geral no prompt, o modelo não sabia que a
// visita foi ruim e "positivava" críticas em elogio. E como as 4 chaves de
// saída eram sempre pedidas mesmo fora do trilho leve (beach_club/transfer/
// etc não têm pergunta de must_experience/heads_up — ver LIGHT_TIP_QUESTIONS
// em review-questions.ts), o modelo inventava conteúdo do zero em vez de
// omitir.

export function buildReviewExtractionPrompt(rawAnswers: Record<string, string>, overallRating: number): string {
  const hasMustExperience = Boolean(rawAnswers?.must_experience?.trim())
  const hasHeadsUp = Boolean(rawAnswers?.heads_up?.trim())
  const sentimentLabel = overallRating < 0 ? 'NEGATIVA' : overallRating > 0 ? 'POSITIVA' : 'NEUTRA'

  const outputSchemaLines = [
    '  "highlights": ["1 a 4 trechos literais das respostas (frases ou pedaços de frase copiados), os mais úteis pra outra agente decidir"],',
    `  "client_profile": "o perfil de cliente nas palavras da pessoa, copiado da resposta correspondente"${hasMustExperience || hasHeadsUp ? ',' : ''}`,
  ]
  if (hasMustExperience) outputSchemaLines.push(`  "must_experience": "a experiência obrigatória, copiada da resposta do advisor"${hasHeadsUp ? ',' : ''}`)
  if (hasHeadsUp) outputSchemaLines.push('  "heads_up": "a ressalva, copiada da resposta do advisor"')

  return `Você é um assistente especializado em turismo de luxo. Com base nas respostas do travel advisor abaixo sobre uma visita, extraia as informações estruturadas.

Avaliação geral do advisor: ${overallRating} (escala -5 a +5) — visita ${sentimentLabel}.
CRÍTICO: preserve o tom e o sentimento original das respostas abaixo. Se a visita foi ${sentimentLabel.toLowerCase()}, o texto extraído precisa refletir isso com igual precisão — nunca transforme uma crítica em elogio, nunca "positive" um comentário negativo. O objetivo é informar outros agentes com honestidade, não vender a experiência.
REGRA DE PALAVRAS (a rede não quer o que disse "melhorado"): copie trechos literais das respostas, no vocabulário da própria pessoa, só cortando pra caber. Nunca reescreva, nunca parafraseie em tom de marketing, nunca acrescente adjetivo, informação ou conclusão que não esteja escrita. Se não há trecho pra um campo, omita o campo.

Respostas do advisor:
${Object.entries(rawAnswers).map(([k, v]) => `${k}: ${v}`).join('\n')}

Retorne APENAS um JSON válido com esta estrutura (inclua só as chaves abaixo — nunca invente uma chave sem pergunta correspondente nas respostas):
{
${outputSchemaLines.join('\n')}
}`
}
