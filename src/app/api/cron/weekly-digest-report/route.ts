import { NextRequest, NextResponse } from 'next/server'
import { getCurrentIssueNumber, getNewsletterSends } from '@/lib/weekly-digest'
import { sendDigestReportEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Relatório de entrega — roda 1h depois do disparo real (20h57 BRT, cron
// separado de /api/cron/weekly-digest às 19h57). Pedido da Carla, 16/08.
//
// Só cobre ENTREGA (delivered/bounced/complained via GET /emails/:id do
// Resend), não ABERTURA — abertura exige open_tracking habilitado no
// domínio bemgsy-flow.app, que por sua vez exige um tracking_subdomain
// verificado no DNS (Cloudflare). Não habilitei isso agora por dois
// motivos: (1) não tenho acesso ao DNS pra verificar o subdomínio, e (2)
// open_tracking é por domínio inteiro — ligaria pixel de rastreio também
// nos e-mails de redefinição de senha e primeiro acesso, que usam o mesmo
// domínio de envio. Decisão de deliverability da Carla, não algo pra
// decidir sozinho dentro de uma rota. Quando ela confirmar o subdomínio,
// habilitar open_tracking via PATCH /domains/:id do Resend e trocar o
// "opened"/"clicked" abaixo de "indisponível" pra números reais —
// last_event já cobre esses casos, o polling não muda.
const REPORT_RECIPIENT = 'carla@bemgsy.com'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const issueNumber = getCurrentIssueNumber()
  const sends = await getNewsletterSends(issueNumber)

  if (sends.length === 0) {
    return NextResponse.json({ issue: issueNumber, sent: 0, skipped: 'nenhum envio registrado (não aprovado ou sem conteúdo essa semana)' })
  }

  // Chave separada da que envia (17/08) — RESEND_API_KEY é "Sending
  // access" só, GET /emails/:id dava 401. RESEND_READ_API_KEY é uma
  // segunda chave "Full access" dedicada a leitura, menor privilégio do
  // que trocar a chave de envio inteira pra Full access.
  const apiKey = process.env.RESEND_READ_API_KEY
  const tally: Record<string, string[]> = {}
  for (const s of sends) {
    let status = 'sem id (RESEND_READ_API_KEY ausente)'
    if (s.resend_email_id && apiKey) {
      try {
        const res = await fetch(`https://api.resend.com/emails/${s.resend_email_id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (res.ok) {
          const data = await res.json() as { last_event?: string }
          status = data.last_event ?? 'desconhecido'
        } else {
          status = `erro consultando Resend (${res.status})`
        }
      } catch {
        status = 'erro consultando Resend'
      }
    }
    tally[status] = tally[status] ?? []
    tally[status].push(s.email)
  }

  const rows = Object.entries(tally)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([status, emails]) => `<li style="font-size: 14px; line-height: 1.8; color: #4A7580;"><strong style="color: #112630;">${emails.length}</strong> ${status} <span style="color: #7A9AA5; font-size: 12px;">(${emails.join(', ')})</span></li>`)
    .join('')

  const bodyHtml = `
    <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Edição #${issueNumber} — status 1h depois do envio</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 0 0 16px;">${sends.length} destinatários. Abertura ainda não rastreada (falta habilitar tracking no domínio — ver nota técnica).</p>
    <ul style="margin: 0; padding-left: 18px;">${rows}</ul>
  `

  await sendDigestReportEmail(REPORT_RECIPIENT, `Relatório de envio — Weekly Wrap-up #${issueNumber}`, bodyHtml)

  return NextResponse.json({ issue: issueNumber, total: sends.length, tally: Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v.length])) })
}
