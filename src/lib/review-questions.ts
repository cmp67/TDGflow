export interface ReviewQuestion {
  id: string
  text: string
  type: 'text' | 'date' | 'select' | 'sentiment' | 'sub_sentiment' | 'sentiment_map' | 'voice_text'
  placeholder?: string
  options?: string[]
}

export const ENTITY_TYPES = ['hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const VISIT_TYPES = ['fam_trip', 'site_inspection', 'personal_stay', 'commercial_meeting'] as const
export type VisitType = (typeof VISIT_TYPES)[number]

const BASE_QUESTIONS: ReviewQuestion[] = [
  { id: 'entity_type', text: 'O que você está avaliando?', type: 'select', options: [...ENTITY_TYPES] },
  { id: 'hotel_name', text: 'Qual o nome?', type: 'text', placeholder: 'Hotel, beach club, guia, transfer...' },
  { id: 'country', text: 'Onde fica?', type: 'text', placeholder: 'Ex: Portugal, Comporta, Maldivas...' },
  { id: 'visit_date', text: 'Quando foi?', type: 'date' },
  { id: 'visit_type', text: 'Qual o tipo de visita?', type: 'select', options: [...VISIT_TYPES] },
]

const COMMERCIAL_MEETING_QUESTION: ReviewQuestion = {
  id: 'why_it_matters',
  text: 'Por que essa reunião chamou sua atenção? O que vale a pena testar?',
  type: 'voice_text',
  placeholder: 'O que você viu ou ouviu que merece atenção da rede...',
}

const STAY_QUESTIONS: ReviewQuestion[] = [
  { id: 'overall_rating', text: 'Qual a sua avaliação geral?', type: 'sentiment' },
  { id: 'sub_ratings', text: 'Como você avalia cada aspecto?', type: 'sub_sentiment' },
  { id: 'sentiment_map', text: 'Quer mapear sentimentos por aspecto?', type: 'sentiment_map' },
  { id: 'impressions', text: 'O que mais te impressionou durante a visita?', type: 'voice_text', placeholder: 'Descreva os pontos de destaque...' },
  { id: 'client_profile', text: 'Para qual perfil de cliente você recomendaria?', type: 'voice_text', placeholder: 'Famílias, casais, golf...' },
  { id: 'must_experience', text: 'Qual experiência você considera obrigatória?', type: 'voice_text', placeholder: 'Uma atividade, restaurante, serviço...' },
  { id: 'heads_up', text: 'Há alguma ressalva ou ponto de atenção?', type: 'voice_text', placeholder: 'Opcional — deixe em branco se não houver.' },
]

const LIGHT_TIP_QUESTIONS: ReviewQuestion[] = [
  { id: 'overall_rating', text: 'Qual a sua avaliação geral?', type: 'sentiment' },
  { id: 'impressions', text: 'O que mais te impressionou?', type: 'voice_text', placeholder: 'Descreva os pontos de destaque...' },
  { id: 'client_profile', text: 'Para qual perfil de cliente você recomendaria?', type: 'voice_text', placeholder: 'Famílias, casais, lua de mel...' },
]

/**
 * Ramifica o questionário por entity_type e visit_type. Reunião comercial
 * nunca pergunta sobre estadia (não houve estadia) — ganha só a pergunta do
 * porquê. Fora de hotel, pula sub-notas e mapa de sentimento por aspecto,
 * que não fazem sentido pra beach club/transfer/guia/restaurante.
 */
export function getQuestions(answers: Record<string, unknown>): ReviewQuestion[] {
  const entityType = (answers.entity_type as string) || 'hotel'
  const visitType = answers.visit_type as string | undefined

  if (visitType === 'commercial_meeting') {
    return [...BASE_QUESTIONS, COMMERCIAL_MEETING_QUESTION]
  }
  if (entityType === 'hotel') {
    return [...BASE_QUESTIONS, ...STAY_QUESTIONS]
  }
  return [...BASE_QUESTIONS, ...LIGHT_TIP_QUESTIONS]
}

/** Reunião comercial nasce como lead a testar, nunca como review publicado. */
export function isLeadSubmission(answers: Record<string, unknown>): boolean {
  return answers.visit_type === 'commercial_meeting'
}
