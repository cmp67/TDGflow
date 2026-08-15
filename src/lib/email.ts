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

const FROM_ADDRESS = 'TDG Flow <tdg-flow@bemgsy-flow.app>'
const APP_URL = 'https://traveldesignersgroup.com.br'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Sem a chave ainda: não falha silenciosamente pro caller, mas também
    // não expõe esse estado pro cliente (rota que chama isso sempre responde
    // sucesso genérico, ver /api/auth/forgot-password). Loga o suficiente
    // pra completar o teste manual do fluxo enquanto o Resend não está ligado.
    console.error(`[email] RESEND_API_KEY não configurada — e-mail para ${to} não enviado.\nAssunto: ${subject}\n${html}`)
    return
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

// Carta de estreia — só na edição #1 (pedido da Carla, 15/08, estilo
// newsletter da LilaMonde: carta assinada + retrato). Sem foto real dela
// disponível nesta sessão — usa avatar de iniciais no mesmo padrão do
// UserAvatar in-app (círculo navy + inicial dourada) até ela mandar uma
// foto de verdade pra substituir.
function firstIssueLetter(): string {
  return `
    <tr><td style="padding: 26px 32px 0;">
      <div style="background: ${BRAND.bg}; border-radius: 14px; padding: 26px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
          <tr>
            <td style="width: 44px; vertical-align: middle;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: ${BRAND.navy}; text-align: center; line-height: 40px; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 18px; color: ${BRAND.gold};">C</div>
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <p style="font-size: 13.5px; font-weight: 700; color: ${BRAND.navy}; margin: 0;">Carla Moura</p>
              <p style="font-size: 11px; color: ${BRAND.textMuted}; margin: 0;">Bemgsy</p>
            </td>
          </tr>
        </table>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14.5px; color: ${BRAND.textSecondary}; line-height: 1.7; margin: 0 0 14px;">
          Chegamos numa fase nova — o Flow já é realidade, construído com a confiança de cada uma de vocês. Obrigada por embarcarem nessa comigo.
        </p>
        <p style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14.5px; color: ${BRAND.textSecondary}; line-height: 1.7; margin: 0 0 14px;">
          Desejo a cada agência muito crescimento com esse novo superpoder — a força da inteligência coletiva, trabalhando por todos. Sigam contando com a gente pra amplificar cada vez mais a nossa forma de fazer hospitalidade.
        </p>
        <p style="font-size: 13.5px; color: ${BRAND.navy}; margin: 0;">
          Sigamos caminhando juntos. 🏃&zwj;♀️🏃<br/>
          <strong>Carla Moura</strong>
        </p>
      </div>
    </td></tr>
  `
}

export async function sendWeeklyDigestEmail(to: string, firstName: string, digest: WeeklyDigest): Promise<void> {
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
    const rows = digest.recentReviews.map((r, i) => `
      <tr>
        <td style="padding: 10px 0; ${i > 0 ? `border-top: 1px solid ${BRAND.border};` : ''}">
          <span style="font-size: 13.5px; color: ${BRAND.textSecondary};">
            <strong style="color: ${BRAND.navy};">${r.agent_name}</strong>
            <span style="color: ${BRAND.textMuted};"> (${r.agency_name})</span>
            — ${r.hotel_name}${r.country ? `, ${r.country}` : ''}
          </span>
        </td>
      </tr>`).join('')
    sections.push(emailSection('Quem foi pra onde', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`))
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

  if (digest.activeOfferHotels.length > 0) {
    let body = `<p style="font-size: 13.5px; color: ${BRAND.textSecondary}; margin: 0 0 8px;"><strong style="color: ${BRAND.navy};">Fornecedores com oferta ativa:</strong> ${digest.activeOfferHotels.join(', ')}</p>`
    if (digest.expiringOfferHotels.length > 0) {
      body += `<p style="font-size: 13.5px; color: ${BRAND.textSecondary}; margin: 0;"><strong style="color: ${BRAND.navy};">Vencendo em breve:</strong> ${digest.expiringOfferHotels.join(', ')}</p>`
    }
    sections.push(emailSection('Ofertas', body))
  }

  if (digest.newGuides.length > 0) {
    const rows = digest.newGuides.map(g => `<li style="font-size: 13.5px; line-height: 1.8; color: ${BRAND.textSecondary};">${g.title}</li>`).join('')
    sections.push(emailSection('Novo na Wiki', `<ul style="margin: 0; padding-left: 18px;">${rows}</ul>`))
  }

  const html = `
<div style="background: ${BRAND.bg}; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
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

    ${digest.issueNumber === 1 ? firstIssueLetter() : ''}

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

  await sendEmail(to, `TDG Flow Weekly Wrap-up #${digest.issueNumber}`, html)
}
