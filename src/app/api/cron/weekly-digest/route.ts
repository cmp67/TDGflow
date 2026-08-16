import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { buildWeeklyDigest, isIssueApproved, recordNewsletterSend } from '@/lib/weekly-digest'
import { sendWeeklyDigestEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* Newsletter semanal (14/08) — Vercel Cron, mesmo padrão de proteção do
   /api/cron/recompute-badges (Bearer CRON_SECRET). Manda pra todo usuário
   ativo, não só admin/agency_admin — mesmo espírito de inteligência
   coletiva do resto do produto: a rede inteira vê o que a rede fez. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const digest = await buildWeeklyDigest()

  // Aprovação obrigatória (16/08, pedido da Carla) — ela revê a prévia de
  // 7h e aprova pelo link antes do disparo pra rede sair. FAIL-CLOSED: sem
  // aprovação registrada pra essa edição, não manda nada, mesmo que o cron
  // rode. ?preview= abaixo ignora esse gate de propósito — é ela mesma
  // testando, não o disparo real.
  const previewCheck = req.nextUrl.searchParams.get('preview')
  if (!previewCheck && !(await isIssueApproved(digest.issueNumber))) {
    return NextResponse.json({ sent: 0, skipped: 'não aprovado', issue: digest.issueNumber })
  }

  // ?preview=email@... manda só pra esse endereço (precisa já existir em
  // tdg_users), pra testar/revisar o conteúdo real antes do disparo geral —
  // sem isso, o único jeito de ver o e-mail de verdade era mandar pra rede
  // inteira.
  const previewEmail = req.nextUrl.searchParams.get('preview')
  if (previewEmail) {
    const { rows } = await sql`SELECT name, email FROM tdg_users WHERE email = ${previewEmail} LIMIT 1`
    if (!rows.length) return NextResponse.json({ error: 'E-mail de preview não encontrado em tdg_users' }, { status: 404 })
    const firstName = (rows[0].name as string)?.split(' ')[0] ?? 'Travel Advisor'
    await sendWeeklyDigestEmail(rows[0].email as string, firstName, digest)
    return NextResponse.json({ preview: true, sent_to: previewEmail, digest })
  }

  // Sem nada pra contar essa semana, não manda e-mail vazio — silêncio é
  // melhor que ruído.
  const hasContent = digest.reviewCount > 0 || digest.changelog.length > 0 || digest.activeOfferHotels.length > 0
  if (!hasContent) {
    return NextResponse.json({ sent: 0, skipped: 'sem conteúdo essa semana' })
  }

  const { rows: recipients } = await sql`
    SELECT name, email FROM tdg_users WHERE active = true AND email IS NOT NULL
  `

  let sent = 0
  const errors: string[] = []
  for (const r of recipients) {
    const firstName = (r.name as string)?.split(' ')[0] ?? 'Travel Advisor'
    try {
      const resendId = await sendWeeklyDigestEmail(r.email as string, firstName, digest)
      await recordNewsletterSend(digest.issueNumber, r.email as string, resendId)
      sent++
    } catch (e) {
      errors.push(`${r.email}: ${String(e)}`)
    }
  }

  return NextResponse.json({ sent, total: recipients.length, errors: errors.length > 0 ? errors : undefined })
}
