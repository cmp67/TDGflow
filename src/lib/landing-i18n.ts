import type { Lang } from '@/lib/i18n'

/* Traduções da landing page pública (src/app/page.tsx) — dicionário próprio,
   separado de `t` em src/lib/i18n.ts porque aquele cobre a UI do app logado
   (/flow), não o site institucional. EN/ES aqui são traduções novas, feitas
   pra este pedido (03/08/2026) — ainda não revisadas por um falante nativo
   nem aprovadas pela Carla linha a linha, ao contrário do texto oficial em
   PT-BR (esse sim veio verbatim do "SITE TDG FLOW.docx"). */
export const LANDING_COPY: Record<Lang, Record<string, string>> = {
  'pt-BR': {
    'nav.grupo': 'O Grupo',
    'nav.flow': 'TDG Flow',
    'nav.cta': 'Acessar o Flow',

    'hero.eyebrow': 'Travel Designers Group · Brasil',
    'hero.h1a': 'Dezenove agências.',
    'hero.h1b': 'Uma visão do luxo.',
    'hero.sub': 'Uma rede colaborativa das principais agências boutique e consultores de turismo de alto padrão do Brasil.',
    'hero.cta1': 'Torne-se parceiro do grupo',
    'hero.cta2': 'Como funciona o Flow',
    'hero.recognized': 'Reconhecidos por',

    'grupo.eyebrow': 'O grupo',
    'grupo.h2': 'Algumas parcerias chegam a uma agência. Esta chega a dezenove.',
    'grupo.p1': 'Somos uma rede colaborativa das principais agências boutique e consultores de turismo de alto padrão do Brasil. Compartilhamos conhecimentos estratégicos, percepções colhidas em viagens de inspeção pelo mundo e experiências vivenciadas por nossos clientes, com o objetivo de proporcionar a cada viajante experiências de viagem ainda mais exclusivas e inesquecíveis.',
    'grupo.statLabel': 'Agências no grupo',
    'grupo.p2': 'Buscamos fornecedores e experiências que mereçam recomendação exclusiva às nossas dezenove agências — e, em troca, o acesso direto a um comitê de consultores de alto padrão que decide, todos os dias, o que vale a pena oferecer aos viajantes mais exigentes do Brasil.',
    'grupo.cta': 'Falar com o grupo',
    'grupo.instagram': 'Instagram',

    'flow.eyebrow': 'Como o grupo opera',
    'flow.p1': 'Estruturado em contrato com a Bemgsy — com know-how em operação de luxury travel — o TDG Flow funciona como um ecossistema digital colaborativo fechado, no qual o banco de dados alimentado diariamente pelo grupo de experts é conectado a agentes de inteligência artificial especialmente treinados para otimizar conhecimento, cruzar informações e buscar recomendações lastreadas nessa genuína curadoria de experiências exclusivas globais.',
    'flow.pillar1Title': 'Curadoria Compartilhada',
    'flow.pillar1Desc': 'Avaliações de hotéis, vilas, serviços receptivos e gastronomia sob o rigoroso crivo do padrão TDG, gerando um feedback construtivo para o segmento.',
    'flow.pillar2Title': 'Agilidade Operacional',
    'flow.pillar2Desc': 'Respostas rápidas a cenários complexos de viagens globais com base no histórico e conexões do grupo.',
    'flow.pillar3Title': 'Promoção Eficiente',
    'flow.pillar3Desc': 'Novidades, renovações, ofertas e experiências inéditas dos fornecedores ganham tração na rede das agências.',
    'flow.pillar4Title': 'Tendências Antecipadas',
    'flow.pillar4Desc': 'Monitoramento em tempo real dos destinos e experiências que estão entrando no radar dos viajantes mais exigentes.',
    'flow.p2': 'Diferente de sistemas de busca ou agentes de IA que pesquisam na rede mundial informações majoritariamente produzidas por robôs — muitas falsas e quase todas com interesse comercial — o TDG Flow trabalha em ambiente exclusivo e curado, priorizando a qualidade do dado humano e o "olhar do designer" que caracteriza o grupo. A plataforma apresenta uma vitrine qualificada e hipersegmentada, otimizando o relacionamento comercial ao garantir que as qualidades técnicas e os diferenciais de cada serviço sejam mapeados e compreendidos instantaneamente por todo o comitê de agências.',
    'flow.cta': 'Acessar o Flow',

    'footer.grupo': 'O Grupo',
    'footer.flow': 'TDG Flow',
    'footer.instagram': 'Instagram',
  },

  'en': {
    'nav.grupo': 'The Group',
    'nav.flow': 'TDG Flow',
    'nav.cta': 'Access Flow',

    'hero.eyebrow': 'Travel Designers Group · Brazil',
    'hero.h1a': 'Nineteen agencies.',
    'hero.h1b': 'One vision of luxury.',
    'hero.sub': "A collaborative network of Brazil's leading boutique travel agencies and high-end travel consultants.",
    'hero.cta1': 'Become a partner of the group',
    'hero.cta2': 'How Flow works',
    'hero.recognized': 'Recognized by',

    'grupo.eyebrow': 'The group',
    'grupo.h2': 'Some partnerships reach one agency. This one reaches nineteen.',
    'grupo.p1': "We are a collaborative network of Brazil's leading boutique travel agencies and high-end travel consultants. We share strategic knowledge, insights gathered on inspection trips around the world, and experiences lived by our clients — all with one goal: giving every traveler even more exclusive, unforgettable journeys.",
    'grupo.statLabel': 'Agencies in the group',
    'grupo.p2': "We're looking for suppliers and experiences that deserve an exclusive recommendation to our nineteen agencies — and, in return, direct access to a committee of high-end consultants who decide, every day, what's worth offering to Brazil's most discerning travelers.",
    'grupo.cta': 'Talk to the group',
    'grupo.instagram': 'Instagram',

    'flow.eyebrow': 'How the group operates',
    'flow.p1': "Built under contract with Bemgsy — with deep expertise in luxury travel operations — TDG Flow works as a closed, collaborative digital ecosystem, where a database fed daily by the group's own experts connects to specially trained AI agents that organize knowledge, cross-reference information, and surface recommendations grounded in this genuine curation of exclusive, global experiences.",
    'flow.pillar1Title': 'Shared Curation',
    'flow.pillar1Desc': "Reviews of hotels, villas, ground services and dining held to TDG's rigorous standard, generating constructive feedback for the industry.",
    'flow.pillar2Title': 'Operational Agility',
    'flow.pillar2Desc': "Fast answers to complex global travel scenarios, built on the group's history and connections.",
    'flow.pillar3Title': 'Efficient Promotion',
    'flow.pillar3Desc': 'News, renewals, offers and new experiences from suppliers gain real traction across the agency network.',
    'flow.pillar4Title': 'Early Trend Detection',
    'flow.pillar4Desc': 'Real-time monitoring of the destinations and experiences entering the radar of the most demanding travelers.',
    'flow.p2': 'Unlike search engines or AI agents that scan the open web for information mostly produced by bots — much of it false, nearly all of it commercially motivated — TDG Flow operates in an exclusive, curated environment, prioritizing human-sourced quality and the "designer\'s eye" that defines the group. The platform presents a qualified, hyper-segmented showcase, streamlining business relationships by ensuring every supplier\'s technical qualities and distinctions are mapped and instantly understood by the entire agency committee.',
    'flow.cta': 'Access Flow',

    'footer.grupo': 'The Group',
    'footer.flow': 'TDG Flow',
    'footer.instagram': 'Instagram',
  },

  'es': {
    'nav.grupo': 'El Grupo',
    'nav.flow': 'TDG Flow',
    'nav.cta': 'Acceder a Flow',

    'hero.eyebrow': 'Travel Designers Group · Brasil',
    'hero.h1a': 'Diecinueve agencias.',
    'hero.h1b': 'Una visión del lujo.',
    'hero.sub': 'Una red colaborativa de las principales agencias boutique y consultores de turismo de alto nivel de Brasil.',
    'hero.cta1': 'Conviértete en socio del grupo',
    'hero.cta2': 'Cómo funciona Flow',
    'hero.recognized': 'Reconocidos por',

    'grupo.eyebrow': 'El grupo',
    'grupo.h2': 'Algunas alianzas llegan a una agencia. Esta llega a diecinueve.',
    'grupo.p1': 'Somos una red colaborativa de las principales agencias boutique y consultores de turismo de alto nivel de Brasil. Compartimos conocimientos estratégicos, percepciones recogidas en viajes de inspección por el mundo y experiencias vividas por nuestros clientes, con el objetivo de ofrecer a cada viajero experiencias aún más exclusivas e inolvidables.',
    'grupo.statLabel': 'Agencias en el grupo',
    'grupo.p2': 'Buscamos proveedores y experiencias que merezcan una recomendación exclusiva para nuestras diecinueve agencias — y, a cambio, acceso directo a un comité de consultores de alto nivel que decide, cada día, qué vale la pena ofrecer a los viajeros más exigentes de Brasil.',
    'grupo.cta': 'Hablar con el grupo',
    'grupo.instagram': 'Instagram',

    'flow.eyebrow': 'Cómo opera el grupo',
    'flow.p1': 'Estructurado mediante contrato con Bemgsy — con know-how en operación de viajes de lujo — TDG Flow funciona como un ecosistema digital colaborativo y cerrado, en el que la base de datos alimentada a diario por el grupo de expertos se conecta a agentes de inteligencia artificial especialmente entrenados para organizar el conocimiento, cruzar información y ofrecer recomendaciones respaldadas por esta genuina curaduría de experiencias exclusivas a nivel global.',
    'flow.pillar1Title': 'Curaduría Compartida',
    'flow.pillar1Desc': 'Evaluaciones de hoteles, villas, servicios receptivos y gastronomía bajo el riguroso criterio del estándar TDG, generando una retroalimentación constructiva para el sector.',
    'flow.pillar2Title': 'Agilidad Operativa',
    'flow.pillar2Desc': 'Respuestas rápidas a escenarios complejos de viajes globales, basadas en el historial y las conexiones del grupo.',
    'flow.pillar3Title': 'Promoción Eficiente',
    'flow.pillar3Desc': 'Novedades, renovaciones, ofertas y experiencias inéditas de los proveedores ganan tracción en la red de agencias.',
    'flow.pillar4Title': 'Tendencias Anticipadas',
    'flow.pillar4Desc': 'Monitoreo en tiempo real de los destinos y experiencias que están entrando en el radar de los viajeros más exigentes.',
    'flow.p2': 'A diferencia de los buscadores o agentes de IA que rastrean la red mundial en busca de información producida mayoritariamente por robots — mucha de ella falsa y casi toda con interés comercial — TDG Flow opera en un entorno exclusivo y curado, priorizando la calidad del dato humano y la "mirada del diseñador" que caracteriza al grupo. La plataforma presenta una vitrina calificada e hipersegmentada, optimizando la relación comercial al garantizar que las cualidades técnicas y los diferenciales de cada servicio sean mapeados y comprendidos al instante por todo el comité de agencias.',
    'flow.cta': 'Acceder a Flow',

    'footer.grupo': 'El Grupo',
    'footer.flow': 'TDG Flow',
    'footer.instagram': 'Instagram',
  },
}
