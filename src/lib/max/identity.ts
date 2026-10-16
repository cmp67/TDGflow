import { sql } from '@vercel/postgres'

/* Identidade pelo telefone — a única que vale. Celular BR chega do WhatsApp
   às vezes sem o 9 depois do DDD (achado 11/09/2026: 555181477111 vs
   5551981477111). Só ganha o 9 quem já era celular (começa com 6-9); fixo
   nunca, senão casaria com o celular de outra pessoa. */
export function brPhoneVariants(phoneNorm: string): [string, string] {
  const isBr = phoneNorm.startsWith('55')
  if (isBr && phoneNorm.length === 12 && /[6-9]/.test(phoneNorm[4])) {
    return [phoneNorm, `${phoneNorm.slice(0, 4)}9${phoneNorm.slice(4)}`]
  }
  if (isBr && phoneNorm.length === 13 && phoneNorm[4] === '9') {
    return [phoneNorm, `${phoneNorm.slice(0, 4)}${phoneNorm.slice(5)}`]
  }
  return [phoneNorm, phoneNorm]
}

export type MaxUser = { id: string; name: string; email: string; agency_name: string; role: string; active: boolean }

export async function findUserByPhone(phone: string): Promise<MaxUser | null> {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  const [asSent, alternate] = brPhoneVariants(digits)
  const { rows } = await sql`
    SELECT id, name, email, agency_name, role, active FROM tdg_users
    WHERE whatsapp = ${asSent} OR whatsapp = ${alternate}
    ORDER BY (whatsapp = ${asSent}) DESC LIMIT 1`
  return (rows[0] as MaxUser | undefined) ?? null
}
