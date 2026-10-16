import { sql } from '@vercel/postgres'

/* Admin global da Bemgsy/TDG (tdg_users.role = 'admin'). Checado sempre no
   servidor — a UI só esconde botão, nunca é a barreira. */
export async function isAdminEmail(email: string): Promise<boolean> {
  const { rows } = await sql`SELECT role FROM tdg_users WHERE email = ${email} LIMIT 1`
  return rows[0]?.role === 'admin'
}
