import { sql } from '@vercel/postgres'
import Anthropic from '@anthropic-ai/sdk'

// Relatório diário — pedido da Carla, 16/08: acontecimentos do dia (janela
// rolante de 24h, não "desde meia-noite" — mesmo raciocínio do digest
// semanal) + insights de melhoria. Só pra ela, não é o Weekly Wrap-up que
// vai pra rede.

export interface DailyDigest {
  periodStart: string
  periodEnd: string
  reviewCount: number
  discoveryCount: number
  newReviews: { hotel_name: string; agent_name: string; agency_name: string; status: string }[]
  loginCount: number
  activeUserCount: number
  newSuggestions: { title: string; type: string; agency_name: string }[]
  newBadgeCount: number
  newAudioCount: number
  newSignups: { name: string; agency_name: string }[]
  lumisUsedToday: number
  inactiveAgencies: string[]
  pendingBugReports: number
  topPendingSuggestion: { title: string; agency_name: string; score: number } | null
}

export async function buildDailyDigest(): Promise<DailyDigest> {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000)
  const startIso = periodStart.toISOString()

  const [reviews, logins, suggestions, badges, audios, signups, lumis, inactive, bugReports, topSuggestion] = await Promise.all([
    sql`
      SELECT hotel_name, agent_name, agency_name, status FROM tdg_hotel_reviews
      WHERE created_at >= ${startIso}
        AND agency_name IS DISTINCT FROM 'TDD' AND agent_name IS DISTINCT FROM 'TDD'
        AND agency_name NOT ILIKE '\\_\\_TDD\\_%' ESCAPE '\\'
      ORDER BY created_at DESC
    `,
    sql`SELECT COUNT(*)::int AS total, COUNT(DISTINCT user_id)::int AS distinct_users FROM tdg_login_events WHERE created_at >= ${startIso}`,
    sql`
      SELECT title, type, agency_name FROM tdg_suggestions
      WHERE created_at >= ${startIso}
      ORDER BY created_at DESC
    `,
    sql`SELECT COUNT(*)::int AS total FROM tdg_badges WHERE earned_at >= ${startIso}`,
    sql`SELECT COUNT(*)::int AS total FROM tdg_audio_inputs WHERE created_at >= ${startIso}`,
    sql`
      SELECT u.name, u.agency_name FROM tdg_users u
      JOIN tdg_invites i ON i.used_by = u.id
      WHERE i.used_at >= ${startIso}
    `,
    sql`SELECT COALESCE(SUM(ABS(amount)), 0)::int AS total FROM tdg_credits_ledger WHERE amount < 0 AND created_at >= ${startIso}`,
    sql`
      WITH activity AS (
        SELECT agent_id AS user_id, created_at FROM tdg_hotel_reviews WHERE agent_id IS NOT NULL
        UNION ALL
        SELECT user_id, created_at FROM tdg_login_events
        UNION ALL
        SELECT agent_id, created_at FROM tdg_audio_inputs WHERE agent_id IS NOT NULL
      )
      SELECT a.name
      FROM tdg_agencies a
      JOIN tdg_users u ON u.agency_id = a.id AND u.active = true
      LEFT JOIN activity act ON act.user_id = u.id
      WHERE a.active = true AND a.is_test = false
      GROUP BY a.name
      HAVING MAX(act.created_at) IS NULL OR MAX(act.created_at) < NOW() - INTERVAL '7 days'
      ORDER BY a.name
    `,
    sql`SELECT COUNT(*)::int AS total FROM tdg_suggestions WHERE type = 'bug_report' AND status = 'pending'`,
    sql`
      SELECT title, agency_name, (votes * impact) AS score FROM tdg_suggestions
      WHERE status = 'pending'
      ORDER BY score DESC LIMIT 1
    `,
  ])

  const published = reviews.rows.filter(r => r.status === 'published')
  const discoveries = reviews.rows.filter(r => r.status === 'a_testar')

  return {
    periodStart: startIso,
    periodEnd: periodEnd.toISOString(),
    reviewCount: published.length,
    discoveryCount: discoveries.length,
    newReviews: reviews.rows.map(r => ({
      hotel_name: r.hotel_name as string, agent_name: r.agent_name as string,
      agency_name: r.agency_name as string, status: r.status as string,
    })),
    loginCount: logins.rows[0].total as number,
    activeUserCount: logins.rows[0].distinct_users as number,
    newSuggestions: suggestions.rows.map(s => ({
      title: s.title as string, type: s.type as string, agency_name: s.agency_name as string,
    })),
    newBadgeCount: badges.rows[0].total as number,
    newAudioCount: audios.rows[0].total as number,
    newSignups: signups.rows.map(s => ({ name: s.name as string, agency_name: s.agency_name as string })),
    lumisUsedToday: lumis.rows[0].total as number,
    inactiveAgencies: inactive.rows.map(r => r.name as string),
    pendingBugReports: bugReports.rows[0].total as number,
    topPendingSuggestion: topSuggestion.rows[0]
      ? { title: topSuggestion.rows[0].title as string, agency_name: topSuggestion.rows[0].agency_name as string, score: topSuggestion.rows[0].score as number }
      : null,
  }
}

export interface DailyInsight {
  insights: string[]
}

// Mesmo padrão de src/app/api/analytics/insights/route.ts (Claude Haiku,
// JSON forçado, fallback sem IA se a chave faltar ou a chamada falhar) —
// não reinventa o mecanismo, só troca os dados de entrada pro recorte
// diário/operacional.
export async function generateDailyInsights(digest: DailyDigest): Promise<string[]> {
  const prompt = `Você é consultor de operações do TDG Flow, plataforma de inteligência coletiva pra uma rede de agências de viagem de luxo no Brasil.

Com base nos dados de hoje abaixo, gere no máximo 4 insights em português do Brasil sobre O QUE PODE MELHORAR na operação — não é resumo, é diagnóstico. Seja específico e acionável, cite os dados. Se não houver problema real nos dados, diga isso em vez de inventar.

DADOS DE HOJE:
- Avaliações publicadas: ${digest.reviewCount}, descobertas em aberto: ${digest.discoveryCount}
- Logins: ${digest.loginCount} (${digest.activeUserCount} usuários distintos)
- Novas sugestões: ${digest.newSuggestions.length} (${digest.newSuggestions.filter(s => s.type === 'bug_report').length} bug reports)
- Novos cadastros completados: ${digest.newSignups.length}
- Lumis consumidos: ${digest.lumisUsedToday}
- Áudios registrados: ${digest.newAudioCount}

SINAIS DE SAÚDE DA REDE (não é só hoje):
- Agências sem nenhuma atividade (login/review/áudio) há mais de 7 dias: ${digest.inactiveAgencies.length > 0 ? digest.inactiveAgencies.join(', ') : 'nenhuma'}
- Bug reports pendentes no total: ${digest.pendingBugReports}
- Sugestão mais votada pendente: ${digest.topPendingSuggestion ? `"${digest.topPendingSuggestion.title}" (${digest.topPendingSuggestion.agency_name}, score ${digest.topPendingSuggestion.score})` : 'nenhuma'}

Retorne APENAS um JSON válido:
{ "insights": ["frase 1", "frase 2", "frase 3", "frase 4"] }`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const textBlock = response.content.find(b => b.type === 'text')
    if (textBlock?.type === 'text') {
      const match = textBlock.text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { insights?: string[] }
        if (parsed.insights?.length) return parsed.insights
      }
    }
  } catch { /* cai no fallback abaixo */ }

  // Fallback sem IA — direto dos sinais, sem narrativa.
  const fallback: string[] = []
  if (digest.inactiveAgencies.length > 0) {
    fallback.push(`${digest.inactiveAgencies.length} agência(s) sem atividade há mais de 7 dias: ${digest.inactiveAgencies.join(', ')}.`)
  }
  if (digest.pendingBugReports > 0) {
    fallback.push(`${digest.pendingBugReports} bug report(s) pendente(s) — vale revisar antes que virem reclamação recorrente.`)
  }
  if (digest.topPendingSuggestion) {
    fallback.push(`Sugestão mais votada ainda sem resposta: "${digest.topPendingSuggestion.title}" (${digest.topPendingSuggestion.agency_name}).`)
  }
  if (fallback.length === 0) {
    fallback.push('Sem sinal de problema nos dados de hoje.')
  }
  return fallback
}
