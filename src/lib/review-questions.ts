export interface ReviewQuestion {
  id: string
  text: string
  type: 'text' | 'date' | 'select' | 'sentiment' | 'sentiment_map' | 'voice_text' | 'photo' | 'name_list'
  placeholder?: string
  options?: string[]
}

export const ENTITY_TYPES = ['hotel', 'beach_club', 'transfer', 'guide', 'restaurant', 'other'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const VISIT_TYPES = ['fam_trip', 'site_inspection', 'personal_stay', 'commercial_meeting'] as const
export type VisitType = (typeof VISIT_TYPES)[number]

// entity_type e visit_type vêm primeiro em todo caminho — é o que decide se
// o resto do questionário pede 1 nome (visita real) ou uma lista de nomes
// (Por testar, achado da Carla 10/08: pedir a mesma coisa 3x só porque o
// nome muda era fricção repetida sem motivo — o contexto é o mesmo).
const ENTITY_QUESTION: ReviewQuestion = { id: 'entity_type', text: 'O que você está avaliando?', type: 'select', options: [...ENTITY_TYPES] }
const VISIT_TYPE_QUESTION: ReviewQuestion = { id: 'visit_type', text: 'O que você está registrando?', type: 'select', options: [...VISIT_TYPES] }
const NAME_QUESTION: ReviewQuestion = { id: 'hotel_name', text: 'Qual o nome?', type: 'text', placeholder: 'Hotel, beach club, guia, transfer...' }
const COUNTRY_QUESTION: ReviewQuestion = { id: 'country', text: 'Onde fica?', type: 'text', placeholder: 'Ex: Portugal, Comporta, Maldivas...' }
const DATE_QUESTION: ReviewQuestion = { id: 'visit_date', text: 'Quando foi?', type: 'date' }

const COMMERCIAL_MEETING_QUESTION: ReviewQuestion = {
  id: 'why_it_matters',
  text: 'Por que isso chamou sua atenção? O que vale a pena testar?',
  type: 'voice_text',
  placeholder: 'O que você viu ou ouviu que merece atenção da rede...',
}

const NAMES_LIST_QUESTION: ReviewQuestion = {
  id: 'hotel_names',
  text: 'Quais nomes?',
  type: 'name_list',
  placeholder: 'Um por linha — adicione quantos quiser da mesma fonte.',
}

const PHOTO_QUESTION: ReviewQuestion = {
  id: 'photo',
  text: 'Tem uma foto sua dessa visita?',
  type: 'photo',
  placeholder: 'Opcional — mas é o que prova que alguém esteve lá de verdade.',
}

const STAY_QUESTIONS: ReviewQuestion[] = [
  { id: 'overall_rating', text: 'Qual a sua avaliação geral?', type: 'sentiment' },
  // sub_ratings (4 sub-notas numéricas fixas: Acomodações/Serviço/Gastronomia/
  // Localização) removido — Fase 3. Repetia a mesma pergunta 2x (achado do
  // parecer de design: overall → sub-notas → sentiment_map perguntavam a
  // mesma coisa 3 vezes). sentiment_map já cobre aspectos específicos de
  // forma mais leve (tags reais, não 4 categorias forçadas mesmo quando não
  // se aplicam à visita).
  { id: 'sentiment_map', text: 'Quer mapear sentimentos por aspecto?', type: 'sentiment_map' },
  { id: 'impressions', text: 'O que mais te impressionou durante a visita?', type: 'voice_text', placeholder: 'Descreva os pontos de destaque...' },
  { id: 'client_profile', text: 'Para qual perfil de cliente você recomendaria?', type: 'voice_text', placeholder: 'Famílias, casais, golf...' },
  { id: 'must_experience', text: 'Qual experiência você considera obrigatória?', type: 'voice_text', placeholder: 'Uma atividade, restaurante, serviço...' },
  { id: 'heads_up', text: 'Há alguma ressalva ou ponto de atenção?', type: 'voice_text', placeholder: 'Opcional — deixe em branco se não houver.' },
  PHOTO_QUESTION,
]

const LIGHT_TIP_QUESTIONS: ReviewQuestion[] = [
  { id: 'overall_rating', text: 'Qual a sua avaliação geral?', type: 'sentiment' },
  { id: 'impressions', text: 'O que mais te impressionou?', type: 'voice_text', placeholder: 'Descreva os pontos de destaque...' },
  { id: 'client_profile', text: 'Para qual perfil de cliente você recomendaria?', type: 'voice_text', placeholder: 'Famílias, casais, lua de mel...' },
  PHOTO_QUESTION,
]

/**
 * Ramifica o questionário por entity_type e visit_type — os dois vêm
 * sempre primeiro, antes de qualquer pergunta que dependa deles. "Por
 * testar" (commercial_meeting) nunca pergunta sobre estadia (não houve
 * visita) e pede uma LISTA de nomes em vez de um só, já que o motivo/fonte é
 * o mesmo pra todos. Fora de hotel, pula mapa de sentimento por aspecto, que
 * não faz sentido pra beach club/transfer/guia/restaurante.
 */
export function getQuestions(answers: Record<string, unknown>): ReviewQuestion[] {
  const entityType = (answers.entity_type as string) || 'hotel'
  const visitType = answers.visit_type as string | undefined

  if (!visitType) {
    return [ENTITY_QUESTION, VISIT_TYPE_QUESTION]
  }

  if (visitType === 'commercial_meeting') {
    return [ENTITY_QUESTION, VISIT_TYPE_QUESTION, COUNTRY_QUESTION, COMMERCIAL_MEETING_QUESTION, NAMES_LIST_QUESTION]
  }

  const stayQuestions = entityType === 'hotel' ? STAY_QUESTIONS : LIGHT_TIP_QUESTIONS
  return [ENTITY_QUESTION, VISIT_TYPE_QUESTION, NAME_QUESTION, COUNTRY_QUESTION, DATE_QUESTION, ...stayQuestions]
}

/** "Por testar" nasce como lead a testar, nunca como review publicado. */
export function isLeadSubmission(answers: Record<string, unknown>): boolean {
  return answers.visit_type === 'commercial_meeting'
}
