# Fase 8d — Super Busca global + inteligência de recomendação

## Status

**Construído e em produção, 02/08/2026.** Pedido explícito da Carla: a busca cruzada da Fase 8 existia só dentro da tela de Destinos — "precisa existir no TDG Flow" inteiro.

## O que foi construído

- `GlobalSearch.tsx` (novo) — overlay acessível de qualquer tela via botão de busca no header (desktop, ao lado do sino; mobile, no cabeçalho). Fecha com Escape, clique fora, ou ao navegar pra um resultado.
- `SearchResultRows.tsx` (novo) — `TipCard`, `HotelResultRow`, `ReviewResultRow`, `ContactResultRow`, `ResultGroup`, `PendingBadge` extraídos de `DestinosView.tsx` (estavam duplicados só lá) pra serem reaproveitados pela busca global sem duplicar. `DestinosView.tsx` agora importa daqui em vez de definir localmente.
- **Grupo Ofertas, novo** — `/api/search` ganhou uma 5ª fonte (`getOffers()`, mesma função já usada por `/api/offers` e pelo MCP), ordenada por quem expira primeiro. Ofertas já vencidas nunca aparecem (recomendar oferta expirada não ajuda ninguém).
- **"Inteligência" no grupo Hotéis** — pedido explícito da Carla: *"um dos principais objetivos do TDG Flow é dar orientação sobre o que recomendar levando em conta ofertas vigentes que vão expirar em breve + experiências testadas"* / *"ele precisa ter acesso a tudo e ter essa inteligência"*. Cada hotel nos resultados de busca já vem com: quantas reviews confirmadas tem (selo dourado "Testado", mesmo ícone/cor de `HoteisView.tsx`) e se tem oferta ativa (contagem + selo de urgência "Expira em Nd", cor accent-warm). Calculado em JS a partir dos mesmos dados já buscados (reviews + ofertas), sem query extra.
- As buscas locais de cada tela (Ofertas, Hotéis, Dicas, Contatos) continuam existindo como estavam — a busca global é um atalho de acesso, não substitui os filtros próprios de cada tela (região/perfil em Hotéis, por exemplo, não fazem sentido numa busca genérica).

## Achado no meio do caminho — bug real, não relacionado ao escopo

Rodando a suite de testes antes do deploy, 3 testes de `POST /api/reviews` começaram a falhar com erro de banco: `there is no unique or exclusion constraint matching the ON CONFLICT specification`. Investigado: os índices reais de `tdg_hotels` viraram **parciais** em algum momento (`idx_tdg_hotels_name_type_unique_rede ... WHERE agency_id IS NULL`, provavelmente do trabalho de multi-tenant/Private Flow), mas o `ON CONFLICT (lower(trim(name)), entity_type)` em `/api/reviews/route.ts` e `/api/setup/route.ts` nunca foi atualizado pra incluir a cláusula `WHERE agency_id IS NULL` que o Postgres exige pra casar com um índice parcial. Bug latente — só dispara quando duas requisições colidem criando o mesmo fornecedor novo ao mesmo tempo (a "corrida" que o próprio comentário no código já previa). Corrigido nos dois arquivos, verificado com os 8 testes de `reviews/route.test.ts` voltando a passar.

## Verificação

- `tsc`: só os 3 erros pré-existentes tolerados
- `vitest`: 243/243 (incluindo a correção do bug do `ON CONFLICT`)
- `next build`: limpo
