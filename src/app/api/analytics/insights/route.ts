import { sql } from '@vercel/postgres'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gather key stats for the prompt
  const [totals, byType, byCountry, topHotel, trend] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT hotel_name)::int AS hotels,
        COUNT(DISTINCT agency_name)::int AS agencies,
        ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('quarter', NOW()))::int AS this_quarter
      FROM tdg_hotel_reviews
    `,
    sql`
      SELECT visit_type, COUNT(*)::int AS count
      FROM tdg_hotel_reviews WHERE visit_type IS NOT NULL
      GROUP BY visit_type ORDER BY count DESC
    `,
    sql`
      SELECT country, COUNT(*)::int AS count
      FROM tdg_hotel_reviews WHERE country IS NOT NULL
      GROUP BY country ORDER BY count DESC LIMIT 5
    `,
    sql`
      SELECT hotel_name, COUNT(*)::int AS visits, ROUND(AVG(overall_rating)::numeric,1) AS rating
      FROM tdg_hotel_reviews
      GROUP BY hotel_name ORDER BY visits DESC LIMIT 1
    `,
    sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int AS reviews
      FROM tdg_hotel_reviews
      WHERE created_at >= NOW() - INTERVAL '3 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `,
  ])

  const stats = {
    total: totals.rows[0]?.total ?? 0,
    hotels: totals.rows[0]?.hotels ?? 0,
    agencies: totals.rows[0]?.agencies ?? 0,
    avg_rating: totals.rows[0]?.avg_rating ?? 0,
    this_month: totals.rows[0]?.this_month ?? 0,
    this_quarter: totals.rows[0]?.this_quarter ?? 0,
    by_type: byType.rows as { visit_type: string; count: number }[],
    by_country: byCountry.rows as { country: string; count: number }[],
    top_hotel: topHotel.rows[0] ?? null,
    trend: trend.rows,
  }

  const prompt = `Você é um analista de dados especializado em turismo de luxo, trabalhando para o Travel Designers Group (rede de 19 agências de viagem premium no Brasil).

Com base nos dados abaixo, gere exatamente 4 insights em português do Brasil — frases curtas, diretas, com dados reais. Cada insight deve ser factual, relevante e útil para um travel advisor. Nada genérico.

DADOS:
- Total de dicas: ${stats.total}
- Hotéis únicos avaliados: ${stats.hotels}
- Agências ativas: ${stats.agencies}
- Avaliação média da rede: ${stats.avg_rating} ★
- Este mês: ${stats.this_month} dicas
- Este trimestre: ${stats.this_quarter} dicas
- Por tipo: ${stats.by_type.map(t => `${t.visit_type}: ${t.count}`).join(', ')}
- Top países: ${stats.by_country.map(c => `${c.country}: ${c.count}`).join(', ')}
- Hotel mais avaliado: ${stats.top_hotel ? `${(stats.top_hotel as {hotel_name: string; visits: number; rating: number}).hotel_name} (${(stats.top_hotel as {hotel_name: string; visits: number; rating: number}).visits} visitas, ${(stats.top_hotel as {hotel_name: string; visits: number; rating: number}).rating} ★)` : 'N/A'}
- Últimos 3 meses: ${(stats.trend as {month: string; reviews: number}[]).map(t => `${t.month}: ${t.reviews}`).join(', ')}

Retorne APENAS um JSON válido:
{
  "insights": [
    "frase 1 com dado real",
    "frase 2 com dado real",
    "frase 3 com dado real",
    "frase 4 com dado real"
  ]
}`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (textBlock?.type === 'text') {
      const match = textBlock.text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        return NextResponse.json({ insights: parsed.insights ?? [] })
      }
    }
  } catch { /* fall through to fallback */ }

  // Fallback: generate from data without AI
  const topType = stats.by_type[0]
  const topCountry = stats.by_country[0]
  const fallback = [
    `A rede TDG acumulou ${stats.total} dicas sobre ${stats.hotels} hotéis únicos em ${stats.agencies} agências.`,
    topType ? `${topType.visit_type === 'site_inspection' ? 'Site Inspections' : topType.visit_type === 'fam_trip' ? 'Fam Trips' : topType.visit_type} lideram com ${topType.count} registros na rede.` : `Avaliação média da rede: ${stats.avg_rating} ★`,
    topCountry ? `${topCountry.country} é o destino mais avaliado, com ${topCountry.count} visitas registradas.` : `Avaliação média da rede: ${stats.avg_rating} ★`,
    stats.top_hotel ? `${(stats.top_hotel as {hotel_name: string; visits: number; rating: number}).hotel_name} é o hotel mais visitado pela rede: ${(stats.top_hotel as {hotel_name: string; visits: number; rating: number}).visits} visitas, ${(stats.top_hotel as {hotel_name: string; visits: number; rating: number}).rating} ★.` : `Este mês: ${stats.this_month} novas dicas registradas.`,
  ]

  return NextResponse.json({ insights: fallback })
}
