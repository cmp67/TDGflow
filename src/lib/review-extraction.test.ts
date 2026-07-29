import { describe, it, expect } from 'vitest'
import { buildReviewExtractionPrompt } from './review-extraction'

describe('buildReviewExtractionPrompt — bug do sentimento invertido (28/07)', () => {
  it('marca a visita como NEGATIVA e instrui a preservar o tom quando a nota é negativa', () => {
    const prompt = buildReviewExtractionPrompt({ impressions: 'espaço pequeno, fórmula demasiadamente turística' }, -3)
    expect(prompt).toContain('visita NEGATIVA')
    expect(prompt).toContain('nunca transforme uma crítica em elogio')
    expect(prompt).toContain('-3')
  })

  it('marca a visita como POSITIVA quando a nota é positiva', () => {
    const prompt = buildReviewExtractionPrompt({ impressions: 'excelente experiência' }, 4)
    expect(prompt).toContain('visita POSITIVA')
  })

  it('omite must_experience e heads_up do schema de saída quando não vieram nas respostas (trilho leve)', () => {
    const prompt = buildReviewExtractionPrompt({ impressions: 'praia linda', client_profile: 'casais' }, 2)
    expect(prompt).not.toContain('"must_experience"')
    expect(prompt).not.toContain('"heads_up"')
    expect(prompt).toContain('"highlights"')
    expect(prompt).toContain('"client_profile"')
  })

  it('inclui must_experience e heads_up no schema de saída quando vieram nas respostas (trilho completo de hotel)', () => {
    const prompt = buildReviewExtractionPrompt({
      impressions: 'ótimo serviço',
      client_profile: 'famílias',
      must_experience: 'jantar à beira-mar',
      heads_up: 'wifi fraco no quarto',
    }, 3)
    expect(prompt).toContain('"must_experience"')
    expect(prompt).toContain('"heads_up"')
  })

  it('nunca inventa chave sem pergunta correspondente — instrução explícita no prompt', () => {
    const prompt = buildReviewExtractionPrompt({ impressions: 'ok' }, 0)
    expect(prompt).toContain('nunca invente uma chave sem pergunta correspondente')
    expect(prompt).toContain('visita NEUTRA')
  })
})
