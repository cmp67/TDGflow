/* Fuso único do Flow: São Paulo (Carla, 19/10/2026 — "nunca deixe isso
   mudar"). O servidor da Vercel roda em UTC e cada navegador no fuso de quem
   abre; toda data mostrada passa por aqui ou declara timeZone: BR_TZ. O teste
   tz-guard.test.ts falha se aparecer formatação de data sem fuso. */
export const BR_TZ = 'America/Sao_Paulo'

/* "2026-10-22" (só dia) vira meio-dia UTC — sem isso o JS lê meia-noite UTC,
   que em São Paulo ainda é o dia 21. */
export function toBrDate(v: string | number | Date): Date {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T12:00:00Z`)
  return v instanceof Date ? v : new Date(v)
}

/* Mês de um rótulo "AAAA-MM" sem cair no mês anterior. */
export function monthDate(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, 15, 12))
}
