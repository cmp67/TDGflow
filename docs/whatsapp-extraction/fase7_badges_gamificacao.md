# Fase 7 — Badges de Expertise (Gamificação)

## Status

**Motor construído e em produção, 02/08/2026** (decisões #17-21). Dormente por enquanto — 0 badges atribuídos hoje, por dois motivos distintos e já esperados (explicados abaixo), não por bug.

## O que foi construído

- `tdg_badges` (já existia desde a migration 021, schema não mudou)
- `GET /api/cron/recompute-badges` — Vercel Cron novo, 1x/dia às 3h (primeiro cron do projeto, `vercel.json` não tinha nenhum antes), protegido por `CRON_SECRET`
  - **"Voz de [País]"** / **"Referência em [Categoria]"**: título atual, pode trocar de dono. Elegível só quem tem ≥3 hotéis distintos com review `published` e confirmada naquele país/categoria. Empate desempatado por `agent_id` menor (escolha simples e determinística — plano não especificava desempate)
  - **"Pioneira"**: fato permanente, primeira review `published`+confirmada de um hotel que já tem ≥3 reviews no total. Nunca perdido
- `GET /api/badges` — "Minhas conquistas" do usuário logado
- `MyBadges.tsx` — seção nova em Meu Perfil (`AgenciaView.tsx`), logo depois de "Alterar senha", com estado vazio explicativo
- Notificação no sino — `badge_earned`/`badge_changed`, tom nunca de perda ("a rede está crescendo", nunca "você perdeu")

## Correção feita antes de escrever a query (achado próprio, não do usuário)

O plano original não especificava se badge conta review `pending` (ainda não confirmada pelo autor/admin). Perguntei à Carla — confirmado: **só conta review já confirmada**. A forma ingênua de escrever isso (`import_approval IN ('approved_by_author','approved_by_admin')`) tem um bug real: review **orgânica** (feita direto no app, não importada) nunca teve `import_approval` nenhum — a coluna fica `NULL` pra sempre nela. Um `IN (...)` excluiria toda review orgânica da elegibilidade de badge, sem ninguém perceber (o bug só aparece quando a rede voltar a usar o app organicamente). Corrigido pra `import_approval IS DISTINCT FROM 'pending'` — inclui `NULL` (orgânica) e os dois `approved_*`, exclui só `pending`.

## Por que está dormente — dois motivos, não um só

Antes de escrever qualquer query, chequei os dados:

1. **Nenhuma review importada tem `agent_id`** (0 de 1.012) — o campo que liga a review a uma conta real (`tdg_users`) só é preenchido quando quem registra está logado no app. Reviews do WhatsApp têm `agent_name`/`source_author` (texto livre), não `agent_id`. Sem `agent_id`, nenhum badge pode ser atribuído — nem Pioneira, que não depende de país nem categoria, trava só nisso. Mesma parede da Fila de Confirmação (Fase 6): autor real ainda não tem conta.
2. **Além disso**, "Voz de [País]" trava também porque 1.012 das 1.013 reviews não têm país (`country IS NULL`) — só a Pioneira não depende disso. "Referência em [Categoria]" trava porque 100% dos 690 hotéis estão como `entity_type='hotel'` (zero diversidade).

**Os três se autocorrigem com o uso real do produto** — review nova pelo app já pede país e permite escolher categoria, e ganha `agent_id` automaticamente por estar logado. Não é preciso nenhum backfill pra o motor funcionar; só é preciso a rede voltar a usar.

## O que NÃO foi feito (avisado, não escondido)

- **Badge pill junto ao nome do autor** (decisão #19) — não implementado. Toca vários pontos em `DicasView.tsx` (hero, card, header do fornecedor) pra um efeito visual zero enquanto não existe nenhum badge atribuído. Fica pra quando o primeiro badge real existir.
- **Pioneira orientado a evento** — o plano original previa disparo no momento em que uma review vira `published` (múltiplos pontos de entrada no código: POST direto, aprovação da fila do autor, aprovação do admin). Implementado como parte do mesmo cron diário em vez de hook em cada ponto — mesmo resultado final (idempotente), só não instantâneo. Consistente com os outros dois badges já serem diários.

## Verificação

- `tsc`: só os 2 erros pré-existentes tolerados
- `vitest`: 243/243
- `next build`: limpo, `/api/badges` e `/api/cron/recompute-badges` confirmados no build
- `CRON_SECRET` gerado e configurado em produção (Vercel env)
