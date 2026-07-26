import { sql } from '@vercel/postgres'
import SignupView from '@/components/SignupView'

// PUBLIC route — deliberately outside src/middleware.ts's protected matcher
// (see middleware.ts: '/flow/((?!login|signup).*)') and outside the
// src/app/flow/(app) route group, so it never goes through auth() or
// FlowLayout. This is the only page in the app a signed-out stranger with a
// valid invite link is meant to reach.
//
// Token validation happens here, server-side, via a direct read — not a
// public GET API — so there is nothing to probe from the outside beyond
// this one render. The actual redemption (the security-sensitive,
// concurrency-sensitive part) still goes through POST /api/signup with its
// own SELECT ... FOR UPDATE transaction; this page never marks anything as
// used.

interface Props {
  params: Promise<{ token: string }>
}

export default async function SignupPage({ params }: Props) {
  const { token } = await params

  const { rows } = await sql`
    SELECT i.role, i.used_at, i.expires_at, a.name AS agency_name
    FROM tdg_invites i
    JOIN tdg_agencies a ON a.id = i.agency_id
    WHERE i.token = ${token}
    LIMIT 1
  `

  const invite = rows[0]
  const isValid = Boolean(invite) && !invite.used_at && new Date(invite.expires_at as string) > new Date()

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Convite inválido
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Este link de convite é inválido, expirou ou já foi utilizado. Fale com quem te enviou o link para solicitar um novo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <SignupView
      token={token}
      agencyName={invite.agency_name as string}
      role={invite.role as string}
    />
  )
}
