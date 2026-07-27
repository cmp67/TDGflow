'use client'

// Ícones próprios — traço só, sem emoji/biblioteca genérica (regra de
// personalidade do design system Bemgsy). Compartilhado entre telas — cada
// uma monta <TdgIconSprite /> uma vez; ids de <symbol> são globais ao
// documento, então basta uma instância por página renderizada de fato.
export const ENTITY_SCENE_ID: Record<string, string> = {
  hotel: 'scene-hotel',
  beach_club: 'scene-beach',
  transfer: 'scene-transfer',
  guide: 'scene-guide',
  restaurant: 'scene-restaurant',
  other: 'scene-hotel',
}

export default function TdgIconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2l-1.6 4.8-4.8 1.6 1.6-4.8z" /></symbol>
        <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" /></symbol>
        <symbol id="i-verified" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M8.3 12.3l2.4 2.4 4.6-5.2" /></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21.5s7-6.4 7-12A7 7 0 0 0 5 9.5c0 5.6 7 12 7 12z" /><circle cx="12" cy="9.5" r="2.4" /></symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="15" rx="1.6" /><path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" /></symbol>
        <symbol id="i-percent" viewBox="0 0 24 24"><circle cx="7" cy="7.5" r="2.3" /><circle cx="17" cy="16.5" r="2.3" /><path d="M18 6L6 18" /></symbol>
        <symbol id="scene-hotel" viewBox="0 0 96 96"><path d="M20 78V38a28 28 0 0 1 56 0v40" /><path d="M20 78h56" /><path d="M40 78V54a8 8 0 0 1 16 0v24" /><path d="M30 46h6M30 58h6M60 46h6M60 58h6" /></symbol>
        <symbol id="scene-beach" viewBox="0 0 96 96"><path d="M14 66h68" /><path d="M48 66V32" /><path d="M48 32c-14 0-22 10-22 18h44c0-8-8-18-22-18z" /><path d="M48 66v14M40 80h16" /></symbol>
        <symbol id="scene-transfer" viewBox="0 0 96 96"><path d="M16 80C30 40 40 20 48 20s18 20 32 60" /><path d="M48 20V12" strokeDasharray="3 5" /><circle cx="48" cy="70" r="3" fill="currentColor" stroke="none" /></symbol>
        <symbol id="scene-guide" viewBox="0 0 96 96"><path d="M12 72c10-24 16-40 32-40s20 16 30 8" /><path d="M12 60c10-20 16-32 32-32s20 13 30 7" /><path d="M12 48c10-16 16-24 32-24s20 10 30 6" /></symbol>
        <symbol id="scene-restaurant" viewBox="0 0 96 96"><ellipse cx="48" cy="52" rx="30" ry="10" /><path d="M30 52v-24M30 22v10M34 22v10M30 32c0 3 4 3 4 0" /><path d="M64 22c-4 0-6 4-6 10s2 9 6 10V80" /></symbol>
      </defs>
    </svg>
  )
}
