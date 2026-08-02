# Fase 5 — Conhecimento de Destino (WhatsApp → produção)

## Status

**Executado em produção, 02/08/2026.** Achado um problema real de schema antes de inserir qualquer coisa — resolvido com a Carla antes de prosseguir (não contornado silenciosamente).

## O problema achado (bloqueava o insert)

`tdg_destination_knowledge` tinha `CHECK (country IS NOT NULL OR hotel_id IS NOT NULL)` — mas ao classificar os 626 registros de "Conhecimento de viagem" por país, **201 (32%) não têm país central**: são conhecimento geral do setor (alerta de golpe, regra fiscal/legal, prática de operadora, comportamento de companhia aérea sem destino específico), não conhecimento de destino. O próprio comentário da coluna (`nunca gateia o insert nisso`) contradizia o `CHECK` logo abaixo — indício de que a coluna "tag" prevista na decisão #1 original do painel Tesla ("país/tag") ficou de fora na hora de virar SQL.

**Resolvido com a Carla:** ao invés de forçar um país falso ou criar uma segunda tabela, ela pediu classificação por **tags temáticas** (pandemia, aéreo, golpe + o que mais aparecer no conteúdo real), pra sustentar busca por tema no buscador — não só por país.

## O que foi feito

1. **Migration 022** (`022_destination_knowledge_tags.sql`): removido o `CHECK` que travava o insert; nova coluna `tags text[] DEFAULT '{}'` + índice GIN.
2. **Classificação em 2 passes de IA** (Claude, sobre os 626 registros já deduplicados em `conhecimento_deduplicado.md`):
   - País (quando existe um destino central claro) — 425 de 626 (68%) ganharam país.
   - Tags: vocabulário fixo de 22 tags proposto por IA a partir dos temas reais do corpus (não freeform — importante pra busca funcionar de verdade), incluindo as 3 pedidas explicitamente pela Carla (pandemia, aéreo, golpe). 599 de 626 (96%) ganharam pelo menos 1 tag.
   - **Só 17 de 626 (2,7%) ficaram sem país e sem tag** — checados individualmente, são casos genuinamente sem tema/destino central (ex: "Blackbook (recurso de vendas)", "Transferência de milhas/pontos"). Não é falha de classificação, ficam pesquisáveis só por título/conteúdo mesmo.
3. **Inserção**: 626 registros em `tdg_destination_knowledge` (315 fact + 289 note + 22 link), todos `import_approval='pending'`, `source_author`/`source_date` sempre preenchidos.
4. **Correção de API**: `GET /api/knowledge-tips` lia de `tdg_knowledge` (tabela antiga, vazia, ligada a hotel_id — não tem nada a ver com o import) — trocado pra ler `tdg_destination_knowledge`. Busca agora cobre título + conteúdo + país + tags, accent/case-insensitive (Super Busca, mesmo padrão de `OfertasList.tsx`) — digitar "golpe" no TDG Knowledge Base traz os 10 registros com essa tag, mesmo que a palavra "golpe" não apareça literalmente em todos.

## Verificação (dupla, antes de reportar)

- Contagem: 315 fact + 289 note + 22 link = 626 — bate com a deduplicação
- Distribuição de tags checada uma a uma (22 tags, de 9 a 141 registros cada) — nenhuma tag vazia/não usada, nenhuma concentração suspeita
- `tsc`: só os 2 erros pré-existentes tolerados (`reviews/route.test.ts`, `signup/route.test.ts`)
- `vitest`: 243/243
- `next build`: limpo

## O que NÃO foi feito (fora de escopo desta fase)

- Badge cinza "aguardando confirmação do autor" + fila de aprovação — decisões #14-16, Fase 6, ainda não construída. Os 626 registros aparecem normalmente na busca já (correto, por design), só sem o badge visual de pendência ainda.
- Exibição visual das tags como chips na tela — não pedido; o que foi pedido (buscar por tag) já funciona.
