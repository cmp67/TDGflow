/**
 * Travel Documentation Layer — TDG Flow
 *
 * Cascade:
 *   1. Passport Index (GitHub CSV, cache 12h) → visa status ~60% queries
 *   2. State Dept Advisories API (free, no auth) → security level always
 *   3. Travel Buddy AI via RapidAPI (optional, $5/mês) → details when needed
 *   + CIVP (yellow fever) hardcoded logic for travelers from Brazil
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TravelRequirements {
  destination: string
  iso2: string
  visa_status: VisaStatus
  visa_label: string
  visa_details?: string
  civp_required: boolean
  security_level: number | null
  security_label: string | null
  security_message: string | null
  security_updated_at: string | null  // date of the advisory from State Dept
  eta_required?: boolean
  notes: string[]
  source: string[]
  embassy_link: string
  embassy_link_specific: boolean  // true = official authority for this exact country; false = generic Itamaraty fallback
  fetched_at: string  // ISO timestamp of when data was fetched
}

type VisaStatus = 'visa-free' | 'visa-on-arrival' | 'e-visa' | 'eta' | 'visa-required' | 'no-entry' | 'unknown'

// ── Country name → ISO2 mapping ───────────────────────────────────────────────

const COUNTRY_TO_ISO2: Record<string, string> = {
  // Americas
  'estados unidos': 'US', 'eua': 'US', 'usa': 'US', 'united states': 'US',
  'canadá': 'CA', 'canada': 'CA',
  'méxico': 'MX', 'mexico': 'MX',
  'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'peru': 'PE',
  'cuba': 'CU', 'república dominicana': 'DO', 'dominican republic': 'DO',
  'costa rica': 'CR', 'panamá': 'PA', 'jamaica': 'JM',
  'bahamas': 'BS', 'barbados': 'BB', 'trinidad e tobago': 'TT',

  // Europa
  'portugal': 'PT', 'espanha': 'ES', 'spain': 'ES',
  'franca': 'FR', 'França': 'FR', 'france': 'FR',
  'itália': 'IT', 'italia': 'IT', 'italy': 'IT',
  'alemanha': 'DE', 'germany': 'DE',
  'holanda': 'NL', 'países baixos': 'NL', 'netherlands': 'NL',
  'bélgica': 'BE', 'belgium': 'BE',
  'suíça': 'CH', 'switzerland': 'CH',
  'áustria': 'AT', 'austria': 'AT',
  'grécia': 'GR', 'greece': 'GR',
  'croácia': 'HR', 'croatia': 'HR',
  'república tcheca': 'CZ', 'czech republic': 'CZ', 'czechia': 'CZ',
  'hungria': 'HU', 'hungary': 'HU',
  'polônia': 'PL', 'poland': 'PL',
  'suécia': 'SE', 'sweden': 'SE',
  'noruega': 'NO', 'norway': 'NO',
  'dinamarca': 'DK', 'denmark': 'DK',
  'finlândia': 'FI', 'finland': 'FI',
  'islândia': 'IS', 'iceland': 'IS',
  'reino unido': 'GB', 'uk': 'GB', 'united kingdom': 'GB', 'inglaterra': 'GB',
  'irlanda': 'IE', 'ireland': 'IE',
  'turquia': 'TR', 'turkey': 'TR',
  'monaco': 'MC', 'mônaco': 'MC',

  // Ásia
  'japão': 'JP', 'japan': 'JP',
  'china': 'CN', 'chinese': 'CN',
  'tailândia': 'TH', 'thailand': 'TH',
  'indonésia': 'ID', 'indonesia': 'ID', 'bali': 'ID',
  'vietnam': 'VN', 'vietnã': 'VN',
  'cambodja': 'KH', 'camboja': 'KH', 'cambodia': 'KH',
  'singapura': 'SG', 'singapore': 'SG',
  'malásia': 'MY', 'malaysia': 'MY',
  'filipinas': 'PH', 'philippines': 'PH',
  'sri lanka': 'LK',
  'nepal': 'NP',
  'índia': 'IN', 'india': 'IN',
  'maldivas': 'MV', 'maldives': 'MV',
  'emirados árabes': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE', 'uae': 'AE', 'united arab emirates': 'AE',
  'jordânia': 'JO', 'jordan': 'JO',
  'israel': 'IL',
  'geórgia': 'GE', 'georgia': 'GE',
  'armênia': 'AM', 'armenia': 'AM',
  'azerbaijão': 'AZ', 'azerbaijan': 'AZ',
  'cazaquistão': 'KZ', 'kazakhstan': 'KZ',
  'coreia do sul': 'KR', 'south korea': 'KR',
  'hong kong': 'HK',
  'taiwan': 'TW',

  // África
  'áfrica do sul': 'ZA', 'south africa': 'ZA',
  'marrocos': 'MA', 'morocco': 'MA',
  'egito': 'EG', 'egypt': 'EG',
  'quênia': 'KE', 'kenya': 'KE',
  'tanzânia': 'TZ', 'tanzania': 'TZ',
  'etiópia': 'ET', 'ethiopia': 'ET',
  'ruanda': 'RW', 'rwanda': 'RW',
  'gana': 'GH', 'ghana': 'GH',
  'nigéria': 'NG', 'nigeria': 'NG',
  'angola': 'AO',
  'moçambique': 'MZ', 'mozambique': 'MZ',
  'maurício': 'MU', 'mauritius': 'MU', 'ilha maurício': 'MU',
  'seicheles': 'SC', 'seychelles': 'SC',
  'madagáscar': 'MG', 'madagascar': 'MG',
  'zâmbia': 'ZM', 'zambia': 'ZM',
  'zimbábue': 'ZW', 'zimbabwe': 'ZW',
  'botswana': 'BW',
  'namíbia': 'NA', 'namibia': 'NA',

  // Oceania
  'austrália': 'AU', 'australia': 'AU',
  'nova zelândia': 'NZ', 'new zealand': 'NZ',
  'fiji': 'FJ',
}

// ── CIVP (febre amarela) — países onde é OBRIGATÓRIO para brasileiros ────────
//
// Fonte: OMS/WHO + ANVISA (CIVNET: civnet.anvisa.gov.br)
// Brasil é área endêmica → qualquer país que exige CIVP de viajantes
// oriundos de áreas de risco exige o documento de brasileiros.
//
// Dois grupos:
//   A) Exige CIVP de TODOS os viajantes (incondicionalmente)
//   B) Exige CIVP de viajantes vindos de áreas endêmicas (Brasil = endêmico → obrigatório)
//
// Removidos da lista: países onde CIVP é apenas recomendado (não exigido na fronteira),
// destinos sem relevância turística (Coreia do Norte), e países onde a exigência
// é regional e não se aplica a viajantes de passaporte turístico comum.

// Grupo A — exigência incondicional (todos os viajantes):
const CIVP_MANDATORY_ALL = new Set([
  'AO', // Angola
  'BJ', // Benin
  'BF', // Burkina Faso
  'CF', // República Centro-Africana
  'TD', // Chade
  'CG', // Congo
  'CD', // DRC
  'CI', // Côte d'Ivoire
  'EC', // Equador
  'GQ', // Guiné Equatorial
  'GA', // Gabão
  'GH', // Gana
  'GN', // Guiné
  'GW', // Guiné-Bissau
  'LR', // Libéria
  'ML', // Mali
  'NE', // Níger
  'NG', // Nigéria
  'RW', // Ruanda
  'SN', // Senegal
  'SL', // Serra Leoa
  'SS', // Sudão do Sul
  'SD', // Sudão
  'TG', // Togo
  'TT', // Trinidad e Tobago
  'UG', // Uganda
  'CM', // Camarões
])

// Grupo B — exigência para viajantes de áreas endêmicas (Brasil é endêmico → obrigatório para brasileiros):
const CIVP_MANDATORY_FROM_RISK = new Set([
  'CN', // China
  'ZA', // África do Sul
  'MV', // Maldivas
  'KE', // Quênia
  'TZ', // Tanzânia
  'ET', // Etiópia
  'MG', // Madagáscar
  'MU', // Maurício
  'MZ', // Moçambique
  'NA', // Namíbia
  'SC', // Seicheles
  'SO', // Somália
  'ER', // Eritreia
  'DJ', // Djibuti
  'ZM', // Zâmbia
  'ZW', // Zimbábue
  'IN', // Índia
  'MM', // Myanmar
])

// Conjunto combinado para lookup rápido
const CIVP_REQUIRED_ISO2 = new Set([...CIVP_MANDATORY_ALL, ...CIVP_MANDATORY_FROM_RISK])

// Helper para gerar nota diferenciada por grupo
function getCivpNote(iso2: string): string {
  if (CIVP_MANDATORY_ALL.has(iso2)) {
    return (
      '⚠️ CIVP obrigatório: este país exige o Certificado Internacional de Vacinação contra Febre Amarela ' +
      'de TODOS os viajantes. Sem CIVP = recusa de embarque ou entrada.'
    )
  }
  return (
    '⚠️ CIVP obrigatório: Brasil é área endêmica de febre amarela. Este país exige o CIVP ' +
    'de viajantes vindos de áreas de risco — apresentar na chegada. Fonte: ANVISA/OMS.'
  )
}

// ── Countries requiring ETA for Brazilians ────────────────────────────────────

const ETA_COUNTRIES: Record<string, { cost: string; link: string; notes: string }> = {
  GB: {
    cost: '£10',
    link: 'https://www.gov.uk/get-electronic-travel-authorisation',
    notes: 'Obrigatório desde fev/2026. Solicitar antes de viajar.',
  },
  AU: {
    cost: 'AUD 20',
    link: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
    notes: 'ETA eVisitor — solicitar online antes de viajar.',
  },
  NZ: {
    cost: 'NZD 23',
    link: 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta',
    notes: 'NZeTA — solicitar com app antes de viajar.',
  },
  MV: {
    cost: 'Gratuito',
    link: 'https://imuga.immigration.gov.mv/',
    notes: 'IMUGA — declaração obrigatória 96h antes. Não pagar intermediários.',
  },
}

// ── Official visa/immigration authority per destination ──────────────────────
//
// Combinado na reunião com Adriano: além do resultado da API (que pode estar
// desatualizada), o consultor precisa de um link direto pra fonte oficial do
// governo de destino, pra verificar manualmente antes de orientar o cliente.
// Cada URL abaixo foi verificada (domínio oficial .gov/.gob/.go + página
// carrega) antes de entrar aqui — nunca um link adivinhado.
const EMBASSY_LINKS: Record<string, string> = {
  US: 'https://travel.state.gov/content/travel/en/us-visas.html',
  GB: 'https://www.gov.uk/get-electronic-travel-authorisation',
  FR: 'https://france-visas.gouv.fr/en/',
  IT: 'https://vistoperitalia.esteri.it/',
  ES: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Servicios-consulares.aspx',
  PT: 'https://vistos.mne.gov.pt/en/',
  DE: 'https://www.auswaertiges-amt.de/en/visa-service',
  CH: 'https://www.sem.admin.ch/sem/en/home/themen/einreise/info-einreise.html',
  AU: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
  NZ: 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta',
  JP: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
  AE: 'https://u.ae/en/information-and-services/visa-and-emirates-id',
  MV: 'https://imuga.immigration.gov.mv/',
  TH: 'https://www.thaievisa.go.th/',
  ID: 'https://evisa.imigrasi.go.id/',
  MX: 'https://www.gob.mx/inm',
  CA: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
  ZA: 'https://www.dha.gov.za/index.php/immigration-services',
  EG: 'https://visa2egypt.gov.eg/',
  IN: 'https://indianvisaonline.gov.in/evisa/',
  CN: 'https://consular.mfa.gov.cn/VISA/',
  TR: 'https://www.evisa.gov.tr/en/',
  GR: 'https://www.mfa.gr/en/services/visas-for-foreigners-traveling-to-greece/',
  AR: 'https://www.argentina.gob.ar/migraciones',
}

// Sem link curado pro destino → fonte de verificação genérica, nunca um link adivinhado
const EMBASSY_FALLBACK_LINK = 'https://www.gov.br/mre/pt-br'

// Schengen countries (same visa rules apply to all)
const SCHENGEN_COUNTRIES = new Set([
  'AT', 'BE', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL',
  'PT', 'SK', 'SI', 'ES', 'SE', 'CH', 'HR', 'MK', 'AL', 'BA',
])

// ── Passport Index cache ──────────────────────────────────────────────────────

let passportIndexCache: Record<string, string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

async function getBrazilVisaStatus(iso2: string): Promise<{ status: VisaStatus; days?: number }> {
  // Schengen rule: visa-free 90 days / 180 days
  if (SCHENGEN_COUNTRIES.has(iso2)) {
    return { status: 'visa-free', days: 90 }
  }

  // Well-known overrides
  if (iso2 === 'GB') return { status: 'eta' }
  if (iso2 === 'AU') return { status: 'eta' }
  if (iso2 === 'NZ') return { status: 'eta' }
  if (iso2 === 'MV') return { status: 'visa-on-arrival', days: 30 }
  if (iso2 === 'US') return { status: 'visa-required' }
  if (iso2 === 'CN') return { status: 'visa-free', days: 30 } // until 31/12/2026

  // Load Passport Index from GitHub
  try {
    if (!passportIndexCache || Date.now() - cacheTimestamp > CACHE_TTL) {
      const res = await fetch(
        'https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-matrix-iso2.csv',
        { signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const text = await res.text()
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        const brazilLine = lines.find(l => l.startsWith('BR,'))
        if (brazilLine) {
          const values = brazilLine.split(',').map(v => v.trim())
          passportIndexCache = {}
          headers.forEach((h, i) => { passportIndexCache![h] = values[i] || '' })
          cacheTimestamp = Date.now()
        }
      }
    }
  } catch {
    // fallback: unknown
  }

  const raw = passportIndexCache?.[iso2]
  if (!raw || raw === '') return { status: 'unknown' }

  const n = parseInt(raw)
  if (!isNaN(n) && n > 0) return { status: 'visa-free', days: n }

  switch (raw) {
    case 'VF': return { status: 'visa-free' }
    case 'VOA': return { status: 'visa-on-arrival' }
    case 'ETA': return { status: 'eta' }
    case 'VR': return { status: 'visa-required' }
    case 'NI': return { status: 'no-entry' }
    default: return { status: 'unknown' }
  }
}

// ── State Dept Advisories ─────────────────────────────────────────────────────

const ADVISORY_LABELS: Record<number, string> = {
  1: 'Normal',
  2: 'Exercer Cautela',
  3: 'Reconsiderar Viagem',
  4: 'Não Viajar',
}

interface StateDeptAdvisory {
  level: number
  label: string
  message: string
  updatedAt: string | null  // ISO date string from the API
}

async function getStateDeptAdvisory(iso2: string): Promise<StateDeptAdvisory | null> {
  try {
    const res = await fetch(
      `https://cadataapi.state.gov/api/TravelAdvisories/${iso2}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const level = data?.level ?? data?.Level ?? null
    const message = data?.message ?? data?.Message ?? data?.title ?? ''
    if (!level) return null

    // The State Dept API returns dates in various fields
    const rawDate =
      data?.date ?? data?.Date ??
      data?.last_updated ?? data?.lastUpdated ??
      data?.updated_at ?? data?.updatedAt ??
      data?.published_date ?? data?.publishedDate ?? null
    const updatedAt = rawDate ? String(rawDate) : null

    return {
      level: Number(level),
      label: ADVISORY_LABELS[Number(level)] || 'Desconhecido',
      message: typeof message === 'string' ? message.slice(0, 300) : '',
      updatedAt,
    }
  } catch {
    return null
  }
}

// ── Travel Buddy AI (primary live source — RapidAPI) ─────────────────────────

interface TravelBuddyResult {
  status: VisaStatus
  days?: number
  duration?: string
  passport_validity?: string
  embassy_link?: string
  evisa_link?: string
  notes?: string
}

async function getTravelBuddyLive(iso2: string, passport = 'BR'): Promise<TravelBuddyResult | null> {
  const apiKey = process.env.TRAVEL_BUDDY_API_KEY
  if (!apiKey) return null

  try {
    const body = new URLSearchParams({ passport, destination: iso2 })
    const res = await fetch(
      'https://visa-requirement.p.rapidapi.com/v2/visa/check',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-rapidapi-host': 'visa-requirement.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()

    // Map Travel Buddy response to our VisaStatus
    const raw = (data?.visa_type ?? data?.requirement ?? data?.type ?? '').toLowerCase()
    let status: VisaStatus = 'unknown'
    if (raw.includes('visa free') || raw.includes('visa-free') || raw === 'vf') status = 'visa-free'
    else if (raw.includes('on arrival') || raw === 'voa') status = 'visa-on-arrival'
    else if (raw.includes('e-visa') || raw.includes('evisa') || raw === 'ev') status = 'e-visa'
    else if (raw.includes('eta')) status = 'eta'
    else if (raw.includes('required') || raw === 'vr') status = 'visa-required'
    else if (raw.includes('no entry') || raw === 'ni') status = 'no-entry'

    const maxStay = data?.max_stay ?? data?.duration_of_stay ?? data?.days ?? null
    const days = maxStay ? parseInt(String(maxStay)) : undefined

    return {
      status,
      days: !isNaN(days!) ? days : undefined,
      duration: data?.duration ?? data?.max_stay ?? undefined,
      passport_validity: data?.passport_validity ?? undefined,
      embassy_link: data?.embassy_link ?? undefined,
      evisa_link: data?.evisa_link ?? data?.evisa_url ?? undefined,
      notes: data?.notes ?? data?.additional_info ?? undefined,
    }
  } catch {
    return null
  }
}

// ── visa labels ───────────────────────────────────────────────────────────────

const VISA_LABELS: Record<VisaStatus, string> = {
  'visa-free': 'Isento de visto',
  'visa-on-arrival': 'Visto na chegada',
  'e-visa': 'E-visa (solicitar online)',
  'eta': 'ETA obrigatório',
  'visa-required': 'Visto obrigatório',
  'no-entry': 'Entrada não permitida',
  'unknown': 'Verificar com embaixada',
}

// ── Main exported function ────────────────────────────────────────────────────

export async function checkTravelRequirements(destination: string, passport = 'BR'): Promise<TravelRequirements> {
  const key = destination.toLowerCase().trim()
  const iso2 = COUNTRY_TO_ISO2[key] ?? destination.toUpperCase().slice(0, 2)
  const isBrazilian = passport === 'BR'

  const notes: string[] = []
  const sources: string[] = []

  // ── Layer 1: Travel Buddy AI (live, primary) ──────────────────────────────
  const liveData = await getTravelBuddyLive(iso2, passport)

  let status: VisaStatus
  let days: number | undefined
  let visaDetails: string | undefined

  if (liveData && liveData.status !== 'unknown') {
    status = liveData.status
    days   = liveData.days
    sources.push('Travel Buddy AI')
    if (liveData.evisa_link) notes.push(`E-visa: ${liveData.evisa_link}`)
    if (liveData.embassy_link) notes.push(`Embaixada: ${liveData.embassy_link}`)
    if (liveData.notes) notes.push(liveData.notes)
  } else {
    // ── Layer 2 fallback: hardcoded overrides + Passport Index CSV ───────────
    const fallback = await getBrazilVisaStatus(iso2)
    status = fallback.status
    days   = fallback.days
    sources.push('Passport Index')
  }

  // Build visa details string
  if (status === 'visa-free') {
    visaDetails = days ? `Entrada sem visto por até ${days} dias` : 'Entrada sem visto'
  }

  // ── Hardcoded contextual notes (BR passport only) ────────────────────────

  const etaInfo = isBrazilian ? (ETA_COUNTRIES[iso2] ?? null) : null

  if (isBrazilian) {
    if (iso2 === 'CN') {
      notes.push('Isenção de visto temporária válida até 31/12/2026 (30 dias). Confirmar renovação.')
      if (!days) visaDetails = 'Entrada sem visto por até 30 dias'
    }

    if (SCHENGEN_COUNTRIES.has(iso2)) {
      notes.push('Área Schengen: máximo 90 dias em qualquer período de 180 dias.')
      notes.push('ETIAS previsto para 2026 (€20) — brasileiros precisarão solicitar.')
      if (!days) visaDetails = 'Entrada sem visto por até 90 dias'
    }

    if (etaInfo) {
      notes.push(`ETA: ${etaInfo.cost} — ${etaInfo.notes}`)
      visaDetails = `ETA: ${etaInfo.cost} (solicitar online antes de viajar)`
    }

    if (iso2 === 'US') {
      notes.push('Brasileiros NÃO são elegíveis para ESTA. Visto B1/B2 obrigatório (~USD 185 + entrevista consular).')
    }
  }

  // ── Layer 3: CIVP / febre amarela (BR only — país de risco) ──────────────
  const civpRequired = isBrazilian && CIVP_REQUIRED_ISO2.has(iso2)
  if (civpRequired) {
    notes.push(getCivpNote(iso2))
    sources.push('WHO/ANVISA')
  }

  // ── Layer 4: US State Dept security advisory ──────────────────────────────
  const advisory = await getStateDeptAdvisory(iso2)
  if (advisory) sources.push('US State Dept')
  if (advisory && advisory.level >= 3) {
    notes.push(`🚨 Alerta de segurança nível ${advisory.level}/4 (${advisory.label}): ${advisory.message}`)
  }

  const curatedEmbassyLink = EMBASSY_LINKS[iso2]

  return {
    destination,
    iso2,
    visa_status: status,
    visa_label: VISA_LABELS[status],
    visa_details: visaDetails,
    civp_required: civpRequired,
    security_level: advisory?.level ?? null,
    security_label: advisory?.label ?? null,
    security_message: advisory?.message ?? null,
    security_updated_at: advisory?.updatedAt ?? null,
    eta_required: !!etaInfo,
    notes,
    source: sources,
    embassy_link: curatedEmbassyLink ?? EMBASSY_FALLBACK_LINK,
    embassy_link_specific: !!curatedEmbassyLink,
    fetched_at: new Date().toISOString(),
  }
}
