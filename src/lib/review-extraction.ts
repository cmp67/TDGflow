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
    '  "highlights": ["array de 3 a 5 pontos mais relevantes — específicos, úteis para outros agentes decidirem se recomendam ou não"],',
    `  "client_profile": "perfil ideal em 1-2 frases — quem deve se beneficiar disso?"${hasMustExperience || hasHeadsUp ? ',' : ''}`,
  ]
  if (hasMustExperience) outputSchemaLines.push(`  "must_experience": "UMA experiência obrigatória, baseada na resposta do advisor abaixo"${hasHeadsUp ? ',' : ''}`)
  if (hasHeadsUp) outputSchemaLines.push('  "heads_up": "ressalva ou informação importante, baseada na resposta do advisor abaixo"')

  return `Você é um assistente especializado em turismo de luxo. Com base nas respostas do travel advisor abaixo sobre uma visita, extraia as informações estruturadas.

Avaliação geral do advisor: ${overallRating} (escala -5 a +5) — visita ${sentimentLabel}.
CRÍTICO: preserve o tom e o sentimento original das respostas abaixo. Se a visita foi ${sentimentLabel.toLowerCase()}, o texto extraído precisa refletir isso com igual precisão — nunca transforme uma crítica em elogio, nunca "positive" um comentário negativo. O objetivo é informar outros agentes com honestidade, não vender a experiência.

Respostas do advisor:
${Object.entries(rawAnswers).map(([k, v]) => `${k}: ${v}`).join('\n')}

Retorne APENAS um JSON válido com esta estrutura (inclua só as chaves abaixo — nunca invente uma chave sem pergunta correspondente nas respostas):
{
${outputSchemaLines.join('\n')}
}`
}
