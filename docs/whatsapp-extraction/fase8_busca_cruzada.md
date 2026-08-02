# Fase 8 — Busca cruzada real no TDG Knowledge Base

## Status

**Construído e em produção, 02/08/2026** (decisão #9 do plano).

## O que foi construído

- `GET /api/search` (novo) — quando há termo de busca, cruza em paralelo `tdg_destination_knowledge`, `tdg_hotels`, `tdg_hotel_reviews` (`status='published'`) e `tdg_hotel_contacts`. Resultados voltam agrupados por tipo (Conhecimento / Hotéis / Reviews / Contatos), nunca misturados numa lista só — cada grupo capado em 50 itens, com o total real pra UI mostrar "+N mais" se precisar (nenhum grupo bateu o cap ainda no volume atual).
- `GET /api/knowledge-tips` volta a ser só a listagem padrão (sem busca) — é o que `DestinosView` mostra com o campo de busca vazio. Busca saiu de lá.
- `src/lib/normalize.ts` (novo) — accent/case-insensitive + busca parcial extraído pra um lugar só; antes vivia duplicado dentro de `knowledge-tips/route.ts`.
- `src/hooks/useDebounce.ts` (novo) — não existia nenhum hook de debounce no repo. 300ms, com `AbortController` no fetch pra evitar resposta fora de ordem quando a pessoa digita rápido.
- `DestinosView.tsx` — quando a busca está ativa, mostra as 4 seções agrupadas (reaproveitando `TipCard` pra Conhecimento; 3 componentes de linha compacta novos — `HotelResultRow`, `ReviewResultRow`, `ContactResultRow` — pros outros 3, sem reaproveitar `HotelCard`/`ContactCard` completos, que são pesados demais pra uma linha de resultado de busca). Clique leva pra ficha certa: hotel → `/flow/rede?tab=fornecedores&hotelId=X`, review → `/flow/dicas?reviewId=X`, contato → ficha do hotel se vinculado, senão `/flow/rede?tab=contatos&contactId=X`.

## Decisões da revisão do arquiteto, aplicadas

- **Endpoint dedicado, não extensão de `knowledge-tips`** — esse nome ficaria enganoso devolvendo hotéis/reviews/contatos.
- **Fetch-all + filtro em JS mantido**, não migrado pra `ILIKE` SQL — accent-folding é requisito documentado da Super Busca e não há extensão `unaccent` instalada; nos volumes atuais (~2.900 linhas somadas nas 4 tabelas) isso não é gargalo.
- **Contatos retornam só `name/surname/organization/category/hotel_id/hotel_name`** — nunca email/whatsapp/notes num endpoint de busca geral, defesa em profundidade (ainda mais relevante com o tier de degustação/prospect no radar).
- **`import_approval` propagado** nos grupos Conhecimento e Reviews — selo cinza "Aguardando confirmação" nos itens ainda não confirmados pelo autor/admin, pra busca não virar a única tela do app onde pendente parece confirmado. Hotéis/contatos não têm essa coluna, não se aplica.
- **Reviews: campos de busca ampliados** — `hotel_name`, `country`, `client_profile`, `must_experience`, `heads_up`, `highlights[]` (não só highlights, senão perde recall nos temas tipo "golpe"/"aéreo"). Dedupe por `hotel_id` mantendo a mais recente, mesmo padrão de `DISTINCT ON` já usado em `/api/reviews`.
- **Query de hotéis enxuta**, não reaproveita a query pesada de `/api/hotels` (que tem JOIN + GROUP BY + `json_agg` de benefícios).

## Nota de tenancy (arquiteto, não bloqueia hoje)

As 4 tabelas são globais no branch atual (single-tenant). Se o Private Flow (`feat/private-tenant`) ganhar discriminador de tenant em banco compartilhado, o endpoint de busca precisa herdar esse escopo. A query já está numa camada só (`/api/search/route.ts`), então não é preciso caçar em 4 lugares depois — é um ponto de atenção pra quando essa decisão fechar, não uma pendência de agora.

## Achado no meio do caminho (não fazia parte do escopo original)

Durante a implementação, a Carla reportou visualmente mais 3 casos de hotéis duplicados (AmaWaterways, Casa Lucia, Rocco Forte Verdura) que a varredura por `website_url` da sessão anterior não pegou — porque nenhum dos 3 tinha `website_url` cadastrado. Rodei uma segunda varredura, por similaridade de nome, nos 147 hotéis sem site: achou 3 candidatos, 2 de alta confiança (padrão claro "X" + "X (cidade/região)") já mesclados, 1 ("El Palace Madrid (Marriott)" vs "The Palace Madrid") deixado em aberto pra confirmação da Carla por não ter o mesmo padrão de prefixo nem site pra validar.

## O que NÃO foi feito (achado, não escondido)

Durante essa investigação apareceu um problema maior e separado: os pills de filtro do catálogo de fornecedores (`region` — Algarve/Lisboa/Maldivas — e `profiles` — Família/Casais/Praia/Boutique/etc.) só funcionam pros 5 hotéis curados originais. `profiles` está vazio em 100% dos 652 hotéis importados (nenhum pipeline automático produz esse tipo de julgamento editorial); a lista de `region` é hardcoded em 3 valores fixos, ignorando dado real que já existe em 500 dos 652 hotéis vindo do enriquecimento Google. Reportado à parte pra decisão da Carla — não é da Fase 8, é um problema de UX/dado do catálogo de fornecedores.

## Verificação

- `tsc`: só os 3 erros pré-existentes tolerados
- `vitest`: 243/243
- `next build`: limpo, `/api/search` confirmado no build
