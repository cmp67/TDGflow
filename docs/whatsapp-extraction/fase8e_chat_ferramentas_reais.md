# Fase 8e — Chat do TDG Flow ganha acesso real a fornecedores/ofertas/reviews

## Status

**Construído e em produção, 02/08/2026.** Achado da Carla: "o chat do TDG Flow precisa buscar nas ofertas, nos hotéis, contatos" — investigando, achei um bug maior do que o pedido original.

## O bug achado

O chat in-app (`/api/chat/route.ts`, "Mensagem para o MAX" na tela de custos) tinha só 3 ferramentas:
- `search_hotels` — busca básica em `tdg_hotels` (funcionava)
- `get_active_promotions` / `get_hotel_full_details` — liam de **`tdg_contracts`, `tdg_promotions`, `tdg_knowledge`** — as 3 com **0 linhas**, tabelas legadas de uma versão antiga do schema (confirmado via `SELECT COUNT(*)`)

Ou seja: o chat nunca teve acesso real a reviews, conhecimento de destino, contatos ou ofertas de verdade — só nome/localização básica do hotel. Toda vez que alguém perguntava sobre condição negociada, review da rede, ou oferta ativa, a resposta vinha de tabelas permanentemente vazias, sem avisar que estava vazio por *design* legado (não por falta de dado).

## O que foi corrigido

Em vez de reconstruir buscas do zero, extraí as implementações já corretas e testadas do servidor MCP usado pelo agente MAX no WhatsApp (`/api/mcp/route.ts`, ver auditoria da Fase MAX) para uma lib compartilhada:

- **`src/lib/mcp-tools.ts`** (novo) — `search_tdg_suppliers`, `get_tdg_supplier_details`, `search_tdg_offers`, `search_reviews`, `get_review`, `list_hotel_tips`, `register_tip`. Uma implementação, dois consumidores.
- **`/api/mcp/route.ts`** — reescrito pra importar dessa lib em vez de duplicar (servidor MCP externo, usado pelo GPT Maker).
- **`/api/chat/route.ts`** — troca as 3 ferramentas antigas pelas 6 de busca da lib compartilhada (mantém `register_tip` de fora do chat in-app por ora — registrar dica via chat web não foi pedido, e a UI "Na prática" já cobre isso bem) + `check_travel_requirements` (não mudou, já funcionava). `SYSTEM_PROMPT` reescrito pra refletir as ferramentas novas — a seção "Base de conhecimento" que descrevia um formato de dado (fact/note/link/pdf/video) que nunca existiu de verdade foi removida.
- **`search_tdg_suppliers` ganhou parâmetro `tags`** (não existia no MCP original) — o chat antigo já usava busca por tag livre (ex: "Golf", "5 Estrelas"), então adicionei ao contrato compartilhado em vez de perder a funcionalidade.

## Verificação

- `tsc`: só os 3 erros pré-existentes tolerados
- `vitest`: 243/243 — `chat/route.test.ts` e `mcp/route.test.ts` atualizados pro novo nome/formato de `search_tdg_suppliers` (antes `search_hotels`, retornava array bruto; agora `{ suppliers, total }`), mesma cobertura de bug regressivo preservada (busca por região+perfil, país+perfil, tag parcial, perfil inexistente)
- `next build`: limpo
