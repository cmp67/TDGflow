# Fase 6 — Fila de Confirmação do Autor + Contatos Editáveis

## Status

**Executado em produção, 02/08/2026** (decisões #14-16 do plano). Inclui um item fora do escopo original da fase, pedido pela Carla no meio da execução: edição/exclusão de contatos.

## Achado antes de construir — mudou a prioridade

Antes de escrever código, rodei a checagem de quantos autores reais (`source_author`, texto livre da extração do WhatsApp) batem com contas reais no Flow (`tdg_users`): **228 autores distintos** têm item pendente, mas `tdg_users` só tem **5 contas** — nenhuma bate com nenhum dos 228. A "fila do autor" (autoconfirmação) renderizaria vazia pra todo mundo hoje. Decisão da Carla: construir os dois mesmo assim — a fila do admin funciona desde já (cobre 100% dos 1.638 itens pendentes), e a fila do autor fica pronta e "acende sozinha" conforme a rede for ganhando contas com nome batendo, sem precisar de nenhuma migração de dado depois.

## O que foi construído

### 1. Fila do admin (fallback, decisão #16)
- Painel em **Billing → Rede TDG**, abaixo de "Pedidos de ativação GUEST"
- Lista os itens `import_approval='pending'` cujo `source_author` não bate com NENHUM `tdg_users.name` (mesma condição usada nos dois lados — ver abaixo)
- Busca por título/autor, paginação de 20 em 20 (1.638 itens não cabem numa lista simples)
- 3 ações por item: aprovar (grava `approved_by_admin` + `import_approval_by`), editar campos inline, excluir de verdade

### 2. Fila do autor (self-service, decisões #14-15)
- 3ª seção condicional "Você disse isso — confirma?" em **Na prática** (reviews) e **TDG Knowledge Base** (conhecimento) — só aparece quando o usuário logado tem pendência própria (`source_author` contém o nome dele)
- Mesmas 3 ações da fila do admin, só que aprovar grava `approved_by_author`
- Badge de contagem na navegação (Na prática / TDG Knowledge Base), mesmo padrão já usado pra `pendingLeads`/`pendingGuestRequests`

### 3. Matching autor → usuário
- `source_author ILIKE '%' || nome_do_usuário || '%'` — mesmo padrão simples já usado no `register_tip` do MCP (não um mecanismo novo)
- Mesma condição usada nos dois sentidos: fila do admin exclui quem bate, fila do autor inclui quem bate — muda de fila sozinho quando a pessoa ganha conta, sem migração

### 4. Contatos — editar e excluir (pedido da Carla, fora do escopo original)
- `PATCH /api/hotel-contacts` novo (só tinha GET/POST/DELETE)
- Botões editar/excluir em cada card de `ContatosLensView.tsx`, abertos a **qualquer TD logado**, não só quem cadastrou — diferente da fila de autor (que é "confirme o que VOCÊ disse"), porque quem percebe que um contato ficou desatualizado geralmente não é quem trouxe a informação original

## Desvios do plano aprovado, revelados na execução (avisados, não escondidos)

- **"Editar" não reaproveita o formulário existente** — o plano previa abrir "o mesmo formulário de edição já existente, pré-preenchido". Não existe formulário de edição de review nenhum hoje (só um wizard multi-step de criação, `POST`-only). Construí um editor de campos simples (destaques/perfil/experiência/ressalvas para review; título/conteúdo/país/tags para conhecimento) em vez de adaptar o wizard pra modo edição — reconstruir o wizard pra isso seria desproporcional ao ganho.
- **"Reaproveita o mesmo HotelCard"** — não reaproveitado. `HotelCard` é específico de review (foto, visit_type, etc.) e a fila cobre 2 tipos de conteúdo (review + conhecimento, que não é review). Construí um card mais simples e genérico (`PendingConfirmationQueue.tsx`) que serve os dois.
- **Regra de "30 dias sem ação do autor"** (parte da decisão #16) não implementada como regra de tempo — hoje não existe NENHUM item que já esteja na fila de um autor real pra essa regra fazer sentido (todos os 1.638 caem direto no fallback do admin por falta de match, não por inatividade). Fica pra quando isso passar a acontecer de verdade.

## Verificação (dupla, antes de reportar)

- Contagem batendo: 1.638 pendentes no total (1.012 reviews + 626 conhecimento) = exatamente o que a Fase 4a + Fase 5 inseriram
- Query de match testada direto no banco antes do deploy (não só no código) — 0 pra Carla, 1.638 pro admin
- `tsc`: só os 2 erros pré-existentes tolerados
- `vitest`: 243/243
- `next build`: limpo
