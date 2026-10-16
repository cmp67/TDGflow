# Squad `tdg-flow`

Agentes do TDG Flow que vivem dentro do próprio produto (Next.js na Vercel), não em
plataforma externa. Dono: Carla (Bemgsy).

| Agente | Papel | Canal |
|---|---|---|
| `max` | O TDG Flow no WhatsApp: registra o que a rede conta e responde só com o que está no Flow | uazapi (instância própria), grupo da TDG quando marcado + conversas 1:1 |

Histórico: até 16/10/2026 o Max rodava no GPT Maker (agente `3F1A294F…`, canal
`3F61D3C4…`), com intenções HTTP pro `/api/agent/verify-user` e MCP `/api/mcp`.
Decisão da Carla (16/10): tirar do GPT Maker e construir aqui — cérebro, memória e
ferramentas no Flow; só o transporte (WhatsApp) é terceiro (uazapi).
