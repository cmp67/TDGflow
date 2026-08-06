// Envio transacional via Resend — decisão da Carla, 06/08/2026: não misturar
// com o Mailjet já usado pra newsletter/marketing (LilaMonde), infraestrutura
// separada por natureza do envio, não só por produto.
//
// Domínio de envio: bemgsy-flow.app (Cloudflare) — escopado por linha de
// produto ("Flow"), não por cliente individual, mesmo raciocínio do rodapé
// "Powered by Bemgsy": é assinatura de infraestrutura, nunca a marca do
// cliente. RESEND_API_KEY ainda não configurada nesta sessão — ver aviso no
// log se chamado antes disso.

const FROM_ADDRESS = 'TDG Flow <tdg-flow@bemgsy-flow.app>'

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
