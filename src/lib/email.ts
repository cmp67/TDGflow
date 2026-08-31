// Envio transacional via Resend — decisão da Carla, 06/08/2026: não misturar
// com o Mailjet já usado pra newsletter/marketing (LilaMonde), infraestrutura
// separada por natureza do envio, não só por produto.
//
// Domínio de envio: bemgsy-flow.app (Cloudflare) — escopado por linha de
// produto ("Flow"), não por cliente individual, mesmo raciocínio do rodapé
// "Powered by Bemgsy": é assinatura de infraestrutura, nunca a marca do
// cliente. RESEND_API_KEY ainda não configurada nesta sessão — ver aviso no
// log se chamado antes disso.

import type { WeeklyDigest } from '@/lib/weekly-digest'
import type { DailyDigest } from '@/lib/daily-digest'

const FROM_ADDRESS = 'TDG Flow <tdg-flow@bemgsy-flow.app>'
export const APP_URL = 'https://traveldesignersgroup.com.br'

// Retorna o id do Resend (usado pra rastrear entrega/abertura no relatório
// pós-envio, 16/08) — null quando a chave não está configurada, nunca lança
// nesse caso (ver comentário abaixo).
async function sendEmail(to: string, subject: string, html: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Sem a chave ainda: não falha silenciosamente pro caller, mas também
    // não expõe esse estado pro cliente (rota que chama isso sempre responde
    // sucesso genérico, ver /api/auth/forgot-password). Loga o suficiente
    // pra completar o teste manual do fluxo enquanto o Resend não está ligado.
    console.error(`[email] RESEND_API_KEY não configurada — e-mail para ${to} não enviado.\nAssunto: ${subject}\n${html}`)
    return null
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend respondeu ${res.status}: ${body}`)
  }

  const { id } = await res.json() as { id: string }
  return id
}

// Relatório de entrega da newsletter — mandado pro cron de +1h (16/08),
// não tem template de marca, é uma mensagem operacional só pra Carla.
export async function sendDigestReportEmail(to: string, subject: string, bodyHtml: string): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #112630;">
      <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #7A9AA5; margin: 0 0 24px;">TDG Flow — relatório</p>
      ${bodyHtml}
    </div>
  `.trim()
  await sendEmail(to, subject, html)
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #112630;">
      <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #7A9AA5; margin: 0 0 24px;">TDG Flow</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Redefinir sua senha</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 0 0 24px;">
        Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique no botão abaixo — o link expira em 1 hora.
      </p>
      <a href="${resetUrl}" style="display: inline-block; background: #112630; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Redefinir senha
      </a>
      <p style="font-size: 12px; line-height: 1.6; color: #7A9AA5; margin: 24px 0 0;">
        Se você não pediu isso, pode ignorar este e-mail com segurança — sua senha continua a mesma.
      </p>
    </div>
  `.trim()

  await sendEmail(to, 'Redefinir sua senha — TDG Flow', html)
}

export async function sendFirstAccessEmail(
  to: string,
  contactName: string,
  agencyName: string,
  signupUrl: string,
  videoUrl: string
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #112630;">
      <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #7A9AA5; margin: 0 0 24px;">TDG Flow</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Seu acesso ao TDG Flow já está pronto</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 0 0 8px;">Olá, ${contactName} 👋</p>
      <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 0 0 16px;">
        A partir de hoje, a <strong>${agencyName}</strong> passa a fazer parte do <strong>TDG Flow</strong> — um espaço pensado para potencializar a inteligência coletiva da rede: buscar informação confiável com agilidade, numa fonte de verdade compartilhada e enriquecida por quem, como vocês, escolheu avançar nessa direção.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 0 0 24px;">
        Ofertas, hotéis testados e a experiência real de cada agência, tudo num só lugar.
      </p>
      <a href="${signupUrl}" style="display: inline-block; background: #112630; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 8px;">
        Criar minha senha e entrar
      </a>
      <p style="font-size: 12px; line-height: 1.6; color: #7A9AA5; margin: 8px 0 24px;">
        Link pessoal e único da sua agência.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 0 0 8px;">
        Preparei também um vídeo rápido mostrando como acessar e os primeiros passos:
      </p>
      <a href="${videoUrl}" style="font-size: 14px; color: #112630; font-weight: 600;">🎥 Assistir ao vídeo</a>
      <p style="font-size: 14px; line-height: 1.6; color: #4A7580; margin: 24px 0 4px;">
        Estou muito feliz de darmos esse passo juntos — é um prazer contribuir para essa nova fase da rede ao seu lado.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #112630; margin: 16px 0 0;">
        Um abraço e sigamos avançando 🏃&zwj;♀️<br />
        Carla Moura
      </p>
    </div>
  `.trim()

  await sendEmail(to, 'Seu acesso ao TDG Flow já está pronto', html)
}

// ── Newsletter semanal — v2, identidade visual oficial (15/08) ─────────
// Tokens copiados de src/app/globals.css (email não lê CSS vars, precisa
// de hex direto). Teal só na marca TDG — no resto do produto teal foi
// substituído por navy/gold, então a newsletter segue a mesma regra.
const BRAND = {
  navy: '#1A2B4C',
  navyDim: '#0D1826',
  gold: '#D4AF37',
  bg: '#F3F7F8',
  surface: '#FFFFFF',
  border: '#D0E2E5',
  textPrimary: '#112630',
  textSecondary: '#104C64',
  textMuted: '#4A7580',
}

function emailSectionLabel(text: string): string {
  return `<p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.gold}; margin: 0 0 12px;">${text}</p>`
}

function emailSection(title: string, bodyHtml: string, isFirst = false): string {
  return `
    <tr><td style="padding: ${isFirst ? '0' : '28px'} 32px 0;">
      <div style="${isFirst ? '' : `border-top: 1px solid ${BRAND.border}; padding-top: 28px;`}">
        ${emailSectionLabel(title)}
        ${bodyHtml}
      </div>
    </td></tr>
  `
}

// Dica de uso + script de bolso — pedido da Carla, 31/08. Achado no mesmo
// pedido, 31/08: cards soltos fora do corpo branco principal empurravam o
// "Powered by Bemgsy" pro meio do e-mail em vez do fim, e cada seção nova
// ganhava um tratamento visual diferente — virou bagunça, não newsletter.
// Regra fixa daqui pra frente: só a carta de estreia (edição #1) e o
// banner de aprovação (interno, nunca vai pra rede) ficam fora do corpo
// único; TUDO mais — incluindo isso — é emailSection() como qualquer
// outra seção, mesma tipografia, mesma cor, sem card/fundo próprio.
function usageTipSectionBody(): string {
  const steps = [
    'Manda um <strong style="color: ' + BRAND.navy + ';">áudio curto pro Max</strong> — 30 a 60 segundos, direto ao ponto — contando o que achou do fornecedor.',
    'Ele <strong style="color: ' + BRAND.navy + ';">estrutura tudo sozinho</strong> — nota, destaques, ressalvas — sem você digitar nada.',
    'Mais tarde, abre o TDG Flow no celular pra <strong style="color: ' + BRAND.navy + ';">conferir o que ele registrou</strong> em seu nome, ajusta se precisar — e aproveita pra <strong style="color: ' + BRAND.navy + ';">anexar as fotos que já estão no seu celular</strong>, direto da viagem — antes de aprovar pra rede toda ver.',
  ]
  const stepRows = steps.map((text, i) => `
    <tr>
      <td width="24" valign="top" style="padding: 0 10px 10px 0;">
        <div style="width: 18px; height: 18px; border-radius: 50%; background: ${BRAND.bg}; color: ${BRAND.navy}; font-size: 10px; font-weight: 700; text-align: center; line-height: 18px; border: 1px solid ${BRAND.border};">${i + 1}</div>
      </td>
      <td style="padding: 0 0 10px;">
        <p style="font-size: 13.5px; line-height: 1.55; color: ${BRAND.textSecondary}; margin: 0;">${text}</p>
      </td>
    </tr>`).join('')

  const scriptLines = [
    '"Fui ao <strong>[hotel]</strong>, em <strong>[destino]</strong> — <strong>[fam trip / inspeção / hospedagem própria]</strong>, em <strong>[mês]</strong>."',
    '"Nota de 1 a 5: <strong>[nota]</strong>."',
    '"O que mais chamou atenção: <strong>[2 a 3 destaques]</strong>."',
    '"Recomendo pra: <strong>[perfil de cliente ideal]</strong>."',
    '"Não pode perder: <strong>[experiência obrigatória]</strong>."',
    '"Fica ligado: <strong>[ressalva — preço, localização, algo pra avisar o cliente antes]</strong>."',
  ]
  const scriptText = scriptLines.map((line, i) => `${i + 1}. ${line}`).join('<br/>')

  return `
    <p style="font-size: 13.5px; line-height: 1.6; color: ${BRAND.textSecondary}; margin: 0 0 12px;">Aquela espera no embarque ou no transfer de saída é a hora certa pra registrar — a experiência ainda está fresca, e você já tem tempo livre mesmo.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepRows}</table>
    <div style="border-left: 3px solid ${BRAND.gold}; background: ${BRAND.bg}; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 4px 0 14px;">
      <p style="font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${BRAND.textMuted}; margin: 0 0 6px;">Script de bolso — o que falar no áudio</p>
      <p style="font-size: 12.5px; line-height: 1.7; color: ${BRAND.textSecondary}; margin: 0;">${scriptText}</p>
    </div>
    <p style="font-size: 13.5px; line-height: 1.6; color: ${BRAND.textSecondary}; margin: 0 0 14px;">E já que é no celular que isso acontece: dá pra <strong style="color: ${BRAND.navy};">instalar o TDG Flow como aplicativo</strong> — pensado assim de propósito, pra usar on the go, sem abrir navegador nem digitar endereço.</p>
    <a href="${APP_URL}/flow" style="display: inline-block; background: ${BRAND.gold}; color: ${BRAND.navyDim}; font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 999px; text-decoration: none;">Acessar e instalar o TDG Flow</a>
  `
}

// approveUrl: só passado pela prévia (07h) — pedido da Carla, 16/08: o
// disparo real pra rede fica condicionado a ela aprovar essa edição depois
// de ver a prévia, não é mais automático. Banner unico, fica de fora do
// e-mail que vai pra rede.
export async function sendWeeklyDigestEmail(
  to: string,
  firstName: string,
  digest: WeeklyDigest,
  approveUrl?: string
): Promise<string | null> {
  const sections: string[] = []

  sections.push(emailSection(
    'Essa semana na rede',
    `<div style="border-left: 3px solid ${BRAND.gold}; background: ${BRAND.bg}; border-radius: 0 8px 8px 0; padding: 14px 18px;">
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.textSecondary}; margin: 0;">
        <strong style="color: ${BRAND.navy}; font-size: 17px;">${digest.reviewCount}</strong> avaliaç${digest.reviewCount === 1 ? 'ão registrada' : 'ões registradas'} por ${digest.reviewsByAgency.length} agência${digest.reviewsByAgency.length === 1 ? '' : 's'}${digest.openDiscoveries > 0 ? `, e <strong style="color: ${BRAND.navy};">${digest.openDiscoveries}</strong> descoberta${digest.openDiscoveries === 1 ? '' : 's'} nova${digest.openDiscoveries === 1 ? '' : 's'} esperando alguém confirmar de perto` : ''}.
      </p>
    </div>`,
    true
  ))

  if (digest.recentReviews.length > 0) {
    // Selo sutil pra dica capturada pelo Max via WhatsApp — pedido da
    // Carla, 26/08, mesmo tratamento discreto já aplicado nos cards do
    // app: só um "· via WhatsApp" pequeno e apagado, não compete com a
    // atribuição real (quem escreveu continua sendo o dado principal).
    const rows = digest.recentReviews.map((r, i) => `
      <tr>
        <td style="padding: 10px 0; ${i > 0 ? `border-top: 1px solid ${BRAND.border};` : ''}">
          <span style="font-size: 13.5px; color: ${BRAND.textSecondary};">
            <strong style="color: ${BRAND.navy};">${r.agent_name}</strong>
            <span style="color: ${BRAND.textMuted};"> (${r.agency_name})</span>
            — ${r.hotel_name}${r.country ? `, ${r.country}` : ''}
            ${r.source === 'max_whatsapp' ? `<span style="font-size: 11px; color: ${BRAND.textMuted}; opacity: 0.65;"> · via WhatsApp</span>` : ''}
          </span>
        </td>
      </tr>`).join('')
    sections.push(emailSection('Quem foi pra onde', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`))
  }

  // Dica atualizada essa semana — seção própria, separada de "Quem foi pra
  // onde" (achado da Carla, 30/08: editar/corrigir uma dica antiga é
  // trabalho real, mas é diferente de registrar uma visita nova; misturar
  // os dois esconderia qual é qual).
  if (digest.updatedReviews.length > 0) {
    const rows = digest.updatedReviews.map((r, i) => `
      <tr>
        <td style="padding: 10px 0; ${i > 0 ? `border-top: 1px solid ${BRAND.border};` : ''}">
          <span style="font-size: 13.5px; color: ${BRAND.textSecondary};">
            <strong style="color: ${BRAND.navy};">${r.agent_name}</strong>
            <span style="color: ${BRAND.textMuted};"> (${r.agency_name})</span>
            atualizou a dica de <strong style="color: ${BRAND.navy};">${r.hotel_name}</strong>
          </span>
        </td>
      </tr>`).join('')
    sections.push(emailSection('Dicas atualizadas essa semana', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`))
  }

  if (digest.featuredReview) {
    const f = digest.featuredReview
    const photo = f.photo_url
      ? `<img src="${f.photo_url}" alt="${f.hotel_name}" width="536" style="width: 100%; max-width: 536px; height: auto; border-radius: 10px; display: block; margin: 0 0 14px;" />`
      : ''
    const stars = f.overall_rating != null
      ? `<span style="color: ${BRAND.gold}; font-size: 13px; font-weight: 700;">★ ${f.overall_rating}</span>`
      : ''
    sections.push(emailSection(
      'Fornecedor em destaque',
      `${photo}
      <p style="font-size: 16px; font-weight: 700; color: ${BRAND.navy}; margin: 0 0 2px;">${f.hotel_name} ${stars}</p>
      <p style="font-size: 12.5px; color: ${BRAND.textMuted}; margin: 0 0 10px;">${f.country ?? ''}${f.country ? ' · ' : ''}por ${f.agent_name}</p>
      ${f.heads_up ? `<p style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14px; color: ${BRAND.textSecondary}; line-height: 1.55; margin: 0;">&ldquo;${f.heads_up}&rdquo;</p>` : ''}`
    ))
  }

  // Insight de colaboração — pedido da Carla, 31/08, depois de reler as
  // matérias de imprensa sobre o TDG Flow: reforçar que a rede se apoia
  // de verdade (inteligência coletiva de fato acontecendo), nunca virar
  // métrica de negociação com fornecedor. Sem sinal forte nenhuma semana,
  // a seção simplesmente não aparece — ver buildWeeklyDigest.
  if (digest.networkInsight) {
    const ni = digest.networkInsight
    const body = ni.type === 'consensus'
      ? `<p style="font-size: 13.5px; line-height: 1.6; color: ${BRAND.textSecondary}; margin: 0;">
          <strong style="color: ${BRAND.navy}; font-size: 15px;">${ni.agencyCount} agências diferentes</strong> já registraram experiência própria no <strong style="color: ${BRAND.navy};">${ni.hotel_name}</strong> — ${ni.reviewCount} relatos, pontos de vista diferentes, mesma confiança.
        </p>`
      : `<p style="font-size: 13.5px; line-height: 1.6; color: ${BRAND.textSecondary}; margin: 0;">
          A dica da <strong style="color: ${BRAND.navy};">${ni.agent_name}</strong> sobre o <strong style="color: ${BRAND.navy};">${ni.hotel_name}</strong> já foi consultada <strong style="color: ${BRAND.navy};">${ni.viewCount}</strong> vez${ni.viewCount === 1 ? '' : 'es'} por colegas de outras agências.
        </p>`
    sections.push(emailSection('A rede se apoiou nisso', body))
  }

  if (digest.changelog.length > 0) {
    const rows = digest.changelog.map(c => `
      <tr>
        <td valign="top" style="padding: 0 8px 12px 0; width: 14px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${BRAND.gold}; margin-top: 6px;"></div>
        </td>
        <td style="padding: 0 0 12px;">
          <span style="font-size: 13.5px; color: ${BRAND.textSecondary};">
            <strong style="color: ${BRAND.navy};">${c.title}</strong>${c.description ? ` — ${c.description}` : ''}
          </span>
        </td>
      </tr>`).join('')
    sections.push(emailSection('Novidades no Flow', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`))
  }

  {
    // Lembrete de curadoria sempre presente (pedido da Carla, 26/08) — a
    // listagem de ofertas ativas é condicional (só existe quando já tem
    // dado), mas o convite pra começar/continuar mandando ofertas precisa
    // aparecer toda edição, não só quando já existe alguma cadastrada.
    let body = ''
    if (digest.activeOfferHotels.length > 0) {
      body += `<p style="font-size: 13.5px; color: ${BRAND.textSecondary}; margin: 0 0 8px;"><strong style="color: ${BRAND.navy};">Fornecedores com oferta ativa:</strong> ${digest.activeOfferHotels.join(', ')}</p>`
      if (digest.expiringOfferHotels.length > 0) {
        body += `<p style="font-size: 13.5px; color: ${BRAND.textSecondary}; margin: 0 0 8px;"><strong style="color: ${BRAND.navy};">Vencendo em breve:</strong> ${digest.expiringOfferHotels.join(', ')}</p>`
      }
    }
    body += `<p style="font-size: 13.5px; color: ${BRAND.textSecondary}; margin: 0; line-height: 1.6;">
      Tem oferta ativa com algum fornecedor? Manda pra <a href="mailto:flow@traveldesignersgroup.com.br" style="color: ${BRAND.navy}; font-weight: 600;">flow@traveldesignersgroup.com.br</a> pra entrar no catálogo e aparecer pra rede toda.
    </p>`
    sections.push(emailSection('Ofertas', body))
  }

  if (digest.newGuides.length > 0) {
    const rows = digest.newGuides.map(g => `<li style="font-size: 13.5px; line-height: 1.8; color: ${BRAND.textSecondary};">${g.title}</li>`).join('')
    sections.push(emailSection('Novo na Wiki', `<ul style="margin: 0; padding-left: 18px;">${rows}</ul>`))
  }

  // Fixa, toda edição, sempre por último entre as seções (logo antes do
  // CTA) — é convite pra ação, faz sentido fechar o corpo de conteúdo.
  sections.push(emailSection('Dica de uso da semana', usageTipSectionBody()))

  const approvalBanner = approveUrl ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto 20px; background: ${BRAND.navy}; border-radius: 16px; overflow: hidden;">
  <tr><td style="padding: 22px 28px; text-align: center;">
    <p style="font-size: 13.5px; color: #EAF1F5; margin: 0 0 14px; line-height: 1.6;">
      Prévia da edição #${digest.issueNumber}. A rede só recebe depois que você aprovar.
    </p>
    <a href="${approveUrl}" style="display: inline-block; background: ${BRAND.gold}; color: ${BRAND.navyDim}; font-size: 13.5px; font-weight: 700; padding: 11px 26px; border-radius: 999px; text-decoration: none;">
      Aprovar envio de hoje
    </a>
  </td></tr>
</table>
  ` : ''

  const html = `
<div style="background: ${BRAND.bg}; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">

  ${approvalBanner}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: ${BRAND.surface}; border-radius: 16px; overflow: hidden; border: 1px solid ${BRAND.border};">

    <!-- Header -->
    <tr>
      <td style="background: ${BRAND.navyDim}; padding: 36px 32px 26px; text-align: center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle;">
              <img src="${APP_URL}/brand/tdg-mark.png" alt="TDG" height="26" style="height: 26px; width: auto; display: block;" />
            </td>
            <td style="padding: 0 14px; vertical-align: middle;">
              <div style="width: 1px; height: 22px; background: rgba(234,241,245,0.25);"></div>
            </td>
            <td style="vertical-align: middle;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 30px; color: ${BRAND.gold}; line-height: 1;">Flow</span>
            </td>
          </tr>
        </table>
        <div style="width: 56px; height: 2px; background: ${BRAND.gold}; opacity: 0.6; margin: 16px auto 14px; border-radius: 2px;"></div>
        <p style="font-size: 10.5px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #7E93A3; margin: 0;">Weekly Wrap-up · Edição #${digest.issueNumber}</p>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 32px 0;">
        <p style="font-size: 20px; color: ${BRAND.navy}; margin: 0 0 4px; line-height: 1.35;">
          Olá, <strong>${firstName}</strong>
        </p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 15px; color: ${BRAND.gold}; margin: 0 0 24px;">
          aqui vai o que a rede fez essa semana
        </p>
      </td>
    </tr>

    ${sections.join('')}

    <!-- CTA -->
    <tr>
      <td style="padding: 32px 32px 8px; text-align: center;">
        <a href="${APP_URL}/flow/dicas" style="display: inline-block; background: ${BRAND.gold}; color: ${BRAND.navyDim}; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 999px; text-decoration: none;">
          Ver tudo no TDG Flow
        </a>
      </td>
    </tr>

    <!-- Convite fechando o e-mail — reforça inteligência coletiva com
         pergunta pessoal, não só CTA transacional (pedido da Carla, 15/08) -->
    <tr>
      <td style="padding: 22px 32px 4px; text-align: center;">
        <p style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14px; color: ${BRAND.textSecondary}; margin: 0; line-height: 1.6;">
          E essa semana — o que você vai trazer pra rede?
        </p>
      </td>
    </tr>

    <!-- Footer — Bemgsy é assinatura de infraestrutura, discreta de
         propósito (Carla pediu mais discrição 2x, 15/08: primeiro cortou
         a menção duplicada no header, depois pediu ainda mais discreto
         que o rodapé in-app — opacidade mais baixa que a referência
         (0.45 vs 0.6 do app), texto pequeno, sem negrito/destaque). -->
    <tr>
      <td style="padding: 22px 32px 26px; text-align: center;">
        <p style="font-size: 9px; color: ${BRAND.textMuted}; margin: 0; opacity: 0.45;">
          Powered by <img src="${APP_URL}/brand/bemgsy-mark.png" alt="Bemgsy" height="8" style="height: 8px; width: auto; vertical-align: middle; opacity: 0.6;" />
        </p>
      </td>
    </tr>

  </table>
</div>
  `.trim()

  return sendEmail(to, `TDG Flow Weekly Wrap-up #${digest.issueNumber}`, html)
}

// ── Relatório diário (16/08) ─────────────────────────────────────────────
// Operacional, só pra Carla — mesmos tokens de marca do Weekly Wrap-up mas
// layout mais denso (não é peça editorial pra rede, é painel de operação).
export async function sendDailyDigestEmail(to: string, digest: DailyDigest, insights: string[]): Promise<void> {
  const dateLabel = new Date(digest.periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

  const reviewRows = digest.newReviews.slice(0, 10).map(r => `
    <tr><td style="padding: 6px 0; font-size: 13px; color: ${BRAND.textSecondary};">
      <strong style="color: ${BRAND.navy};">${r.agent_name}</strong> (${r.agency_name}) — ${r.hotel_name}
      <span style="color: ${BRAND.textMuted};">${r.status === 'a_testar' ? '· descoberta' : ''}</span>
    </td></tr>`).join('')

  const suggestionRows = digest.newSuggestions.map(s => `
    <tr><td style="padding: 6px 0; font-size: 13px; color: ${BRAND.textSecondary};">
      ${s.type === 'bug_report' ? '🐞' : '💡'} ${s.title} <span style="color: ${BRAND.textMuted};">(${s.agency_name})</span>
    </td></tr>`).join('')

  const insightItems = insights.map(i => `<li style="font-size: 13.5px; line-height: 1.8; color: ${BRAND.textSecondary};">${i}</li>`).join('')

  const html = `
<div style="background: ${BRAND.bg}; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: ${BRAND.surface}; border-radius: 16px; overflow: hidden; border: 1px solid ${BRAND.border};">

    <tr>
      <td style="background: ${BRAND.navyDim}; padding: 26px 32px; text-align: center;">
        <img src="${APP_URL}/brand/tdg-mark.png" alt="TDG" height="24" style="height: 24px; width: auto;" />
        <p style="font-size: 10.5px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #7E93A3; margin: 12px 0 0;">Relatório diário · ${dateLabel}</p>
      </td>
    </tr>

    <tr><td style="padding: 24px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 10px;">
        <tr>
          <td style="padding: 14px 16px; text-align: center; width: 25%;"><p style="font-size: 20px; font-weight: 700; color: ${BRAND.navy}; margin: 0;">${digest.reviewCount}</p><p style="font-size: 10.5px; color: ${BRAND.textMuted}; margin: 0;">avaliações</p></td>
          <td style="padding: 14px 16px; text-align: center; width: 25%;"><p style="font-size: 20px; font-weight: 700; color: ${BRAND.navy}; margin: 0;">${digest.loginCount}</p><p style="font-size: 10.5px; color: ${BRAND.textMuted}; margin: 0;">logins</p></td>
          <td style="padding: 14px 16px; text-align: center; width: 25%;"><p style="font-size: 20px; font-weight: 700; color: ${BRAND.navy}; margin: 0;">${digest.newSuggestions.length}</p><p style="font-size: 10.5px; color: ${BRAND.textMuted}; margin: 0;">sugestões</p></td>
          <td style="padding: 14px 16px; text-align: center; width: 25%;"><p style="font-size: 20px; font-weight: 700; color: ${BRAND.navy}; margin: 0;">${digest.lumisUsedToday}</p><p style="font-size: 10.5px; color: ${BRAND.textMuted}; margin: 0;">Lumis</p></td>
        </tr>
      </table>
    </td></tr>

    ${digest.newReviews.length > 0 ? emailSection('Avaliações e descobertas', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${reviewRows}</table>`) : ''}
    ${digest.newSuggestions.length > 0 ? emailSection('Sugestões novas', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${suggestionRows}</table>`) : ''}
    ${digest.newSignups.length > 0 ? emailSection('Cadastros completados', `<p style="font-size: 13px; color: ${BRAND.textSecondary}; margin: 0;">${digest.newSignups.map(s => `${s.name} (${s.agency_name})`).join(', ')}</p>`) : ''}

    <tr><td style="padding: 28px 32px 0;">
      <div style="border-top: 1px solid ${BRAND.border}; padding-top: 24px;">
        ${emailSectionLabel('Insights')}
        <ul style="margin: 0; padding-left: 18px;">${insightItems}</ul>
      </div>
    </td></tr>

    <tr><td style="padding: 24px 32px 26px; text-align: center;">
      <p style="font-size: 9px; color: ${BRAND.textMuted}; margin: 0; opacity: 0.45;">
        Powered by <img src="${APP_URL}/brand/bemgsy-mark.png" alt="Bemgsy" height="8" style="height: 8px; width: auto; vertical-align: middle; opacity: 0.6;" />
      </p>
    </td></tr>

  </table>
</div>
  `.trim()

  await sendEmail(to, `TDG Flow — relatório diário, ${dateLabel}`, html)
}
