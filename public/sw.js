// Service worker mínimo — só existe pra habilitar a instalação do PWA
// (Chrome exige um SW com listener de fetch pra considerar o site
// instalável). Deliberadamente SEM cache de app shell/assets: o TDG Flow
// deploya várias vezes por dia (ver histórico de versões, v7.1xx só nesta
// semana) — cachear agressivamente criaria tela branca ou versão velha
// pra quem acabou de instalar. Único extra: uma mensagem simples quando a
// rede cai no meio de uma navegação, em vez do erro cru do navegador.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(
        '<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#0D1826;color:#EAF1F5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;"><div><p style="font-size:18px;margin-bottom:8px;">Sem conexão</p><p style="opacity:0.7;font-size:14px;">Volte a ficar online pra continuar no TDG Flow.</p></div></body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    )
  )
})
