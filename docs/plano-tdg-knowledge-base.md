# Plano Consolidado — TDG Knowledge Base

**Data:** 01/08/2026
**Status:** plano pra revisão — nada foi implementado ainda. Nenhum dado do WhatsApp foi inserido no banco.

Este documento junta todas as decisões tomadas na conversa de 31/07–01/08/2026 (painel Tesla + Carla) sobre como estruturar e incorporar os dados deduplicados da extração do WhatsApp (hotéis, contatos, reviews, conhecimento de viagem) no TDG Flow, mais duas frentes novas que nasceram da mesma conversa: busca cruzada no TDG Knowledge Base e um Wiki de ajuda do produto.

---

## 1. Decisões já fechadas

| # | Decisão | Origem |
|---|---|---|
| 1 | Nova tabela `tdg_destination_knowledge`, com país/tag, pra conhecimento de destino que não é ligado a um hotel específico | Painel Tesla + Carla |
| 2 | "Destinos" renomeado pra **TDG Knowledge Base** (nav + página) — já em produção (v7.88) | Carla |
| 3 | Texto de review sempre tratado como review de verdade — mesmo mecanismo/pipeline de quando um agente registra pelo app hoje, nunca uma estrutura de "dado importado" à parte | Carla |
| 4 | Reviews e contatos interligados via `hotel_id` — review real publicada num hotel faz o(s) contato(s) daquele hotel aparecerem como "testado" também | Carla |
| 5 | Contato mencionado sem nenhuma review confirmada no hotel dele = "a testar" (mesma régua do hotel) | Carla |
| 6 | Autor + data são **obrigatórios** em toda review/nota/fato — nunca fica null | Carla |
| 7 | Quando não dá pra saber a agência de quem disse algo no WhatsApp, `agency_name` recebe o mesmo nome do autor/contato — nunca texto genérico tipo "Importado", nunca tenta adivinhar | Carla |
| 8 | "Reunião Comercial" nunca conta como "testado" (selo verde) — vira lead `a_testar` | Painel Tesla (arquiteto) + Carla — **já é o comportamento real do código hoje**, ver seção 3 |
| 9 | TDG Knowledge Base ganha busca cruzada: uma palavra-chave traz tudo relacionado (conhecimento de destino + hotéis + reviews + contatos), não só o que está na tabela de conhecimento | Carla |
| 10 | Novo Wiki TDG Flow — ajuda curta e simples sobre como o produto funciona | Carla |
| 11 | `tdg_hotels` ganha `countries text[]` **novo**, mantendo `country` como está — aditivo, não quebra nada que já lê `country` | Carla |
| 12 | Pergunta de reunião comercial **fica como está** (1 pergunta só, não separa em 2) | Carla |
| 13 | Extração de IA roda em **todas** as reviews importadas, sem filtrar por tamanho/substância — mesmo review curto ("bom hotel, recomendo") entra, porque o peso da informação depende de quem disse, não do tamanho do texto | Carla |
| 14 | **Gate de aprovação do autor** — só review e conhecimento (dado atribuído a uma opinião/fala de alguém) esperam confirmação antes de virar visível; hotel e contato (dado neutro) continuam entrando direto, sem gate (decisão #4 não muda) | Carla, 01/08 |
| 15 | Autor tem 3 ações sobre o próprio item importado: **aprovar como está**, **editar antes de aprovar**, ou **pedir exclusão** — nunca só sim/não | Carla, 01/08 |
| 16 | Fallback: sem match de `tdg_users` real, ou sem resposta do autor em 30 dias, **admin Bemgsy aprova em nome dele** — fica registrado como "aprovado pelo admin" (nunca disfarçado de aprovação do autor), e esse mecanismo é explicado no Wiki (transparência, decisão #10) | Carla, 01/08 |
| 17 | **Badges de expertise real** (inspirado no Strava, mas sem copiar "mais volume vence") — 3 tipos: "Voz de [País]", "Referência em [Categoria]", "Pioneira". Nunca por contagem bruta de reviews — contradiria a decisão #13 | Carla, 01/08 |
| 18 | "Voz de..."/"Referência em..." são **títulos atuais** (podem trocar de dono se alguém superar); "Pioneira" é **fato histórico permanente** (primeira review real de um hotel, nunca perdido) | Carla, 01/08 |
| 19 | Badge aparece **junto ao nome do autor, onde a review já é lida** (mesmo padrão do benchmark Fora Travel, Seção 11 do design system) — nunca um placar/ranking público separado | Carla, 01/08 |
| 20 | Notificação de badge ganho ou perdido pelo sino — tom **nunca de perda/fracasso**, sempre convite ("ainda é referência", nunca "você perdeu") | Carla, 01/08 |
| 21 | Perfil (`AgenciaView.tsx`, "Meu Perfil") ganha seção **"Minhas conquistas"** — lista os badges atuais do usuário logado, com estado vazio explicativo pra quem ainda não tem nenhum. Não é a mesma coisa que "Minha atividade" (Analytics, métrica/número) — é identidade/reconhecimento nomeado, mais parecido com o selo "Membro Fundador" que já mora no rodapé | Carla, 01/08 |

---

## 2. O que já existe hoje (confirmado no código, 01/08/2026)

Boa notícia: várias dessas decisões **já são o comportamento real do app** — não é preciso inventar nada, só reaproveitar pro dado histórico do WhatsApp.

- **`api/reviews/route.ts`**: toda review nova já resolve ou cria o hotel automaticamente no catálogo (`tdg_hotels`) — "o catálogo cresce organicamente a partir de reviews reais, nunca fica review órfã". Isso é literalmente a decisão #4, já pronta.
- **`status` de review nunca vem do cliente** — é sempre derivado de `visit_type` no servidor (`isLead ? 'a_testar' : 'published'`). Decisão #8 já é assim hoje — reunião comercial vira lead automaticamente, sem exceção.
- **`review-questions.ts`**: reunião comercial já é um fluxo à parte (`isLeadSubmission()`), com 1 pergunta própria ("Por que essa reunião chamou sua atenção? O que vale a pena testar?") em vez das perguntas de estadia.
- **O texto livre de uma review tem lugar**: fica em `raw_answers` (jsonb, resposta bruta do formulário). Pra reviews de estadia normal, esse texto passa por uma extração de IA (`buildReviewExtractionPrompt`) que preenche `highlights`/`client_profile`/`must_experience`/`heads_up` de forma estruturada. **Pro dado histórico, dá pra rodar o mesmo pipeline** — e como conta admin Bemgsy agora tem acesso ilimitado (v7.85), rodar a extração nas 1.012 reviews reais (sob 722 hotéis únicos) não custa nada real de Lumis.
- **Selo "Testado"/"Aguardando teste"** (`api/hotels/route.ts`): já é 100% calculado via `COUNT(*) FILTER (WHERE status='published')` / `FILTER (WHERE status='a_testar')` num JOIN com `tdg_hotel_reviews` — nunca pela linha do hotel existir sozinha. Confirma o achado do painel Tesla: hotel sem review não tem selo nenhum, não é "aguardando teste" por padrão.

---

## 3. Mudanças de schema necessárias

### 3.1 `tdg_hotels`
```sql
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual'
  CHECK (origin IN ('manual','whatsapp_import'));
ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS mention_count int;
UPDATE tdg_hotels SET is_partner = true;  -- marca os 5 curados de hoje ANTES de importar

ALTER TABLE tdg_hotels DROP CONSTRAINT tdg_hotels_entity_type_check;
ALTER TABLE tdg_hotels ADD CONSTRAINT tdg_hotels_entity_type_check
  CHECK (entity_type IN ('hotel','beach_club','transfer','guide','restaurant','dmc','other'));

ALTER TABLE tdg_hotels ADD COLUMN IF NOT EXISTS countries text[] NOT NULL DEFAULT '{}';
-- aditivo — `country` (singular) continua existindo e funcionando como está;
-- `countries` é só pra quem atende mais de um país (ex: DMC). Nada que já lê
-- `country` quebra.
```
- `is_partner` separa pra sempre os fornecedores com contrato real dos ~700+ só mencionados pela rede — sem isso a distinção se perde (achado do painel Tesla, porta de mão única, precisa rodar **antes** do import).
- `'dmc'` novo em `entity_type`, pra registro de reunião comercial (seção 5).
- `countries text[]` novo, aditivo — decisão #11.

### 3.2 `tdg_hotel_reviews`
Nenhuma coluna nova — já tem tudo (`hotel_name`, `hotel_id`, `source_author`/`source_date`, `raw_answers`). Só decisões de mapeamento:
- `agency_name` (NOT NULL) e `agent_name` (NOT NULL): para dado do WhatsApp, ambos recebem o nome do autor real extraído (decisão #7) — nunca texto genérico.
- Texto da review vai em `raw_answers` (mesma forma que o formulário produz), e passa pela mesma extração de IA que uma review nova passaria, gerando `highlights`/`client_profile`/`must_experience`/`heads_up` — pra ficar indistinguível de uma review orgânica na tela.
- "Reunião Comercial" da extração → `visit_type='commercial_meeting'`, `status='a_testar'` automaticamente (mesma regra do servidor hoje).
- **`photo_url` fica `NULL` em toda review importada — nunca preencher com foto de banco/imprensa.** A UI já tem regra própria pra isso ("Foto de quem esteve lá — nunca banco de imagens", `DicasView.tsx:1760`): sem foto real, o card já renderiza um ícone-linha por `entity_type` (`ENTITY_SCENE_ID`, `DicasView.tsx:450`), nunca imagem. Nada a construir aqui — só não violar a regra achando que "enriquece" o import (quase aconteceu em 01/08, corrigido antes de virar código).

### 3.3 `tdg_hotel_contacts`
Nenhuma coluna nova — já tem `source_author`/`source_date`/`category`/`context_trigger`/`organization` (as "colunas órfãs"). Mudança é de API: `GET /api/hotel-contacts` precisa devolver um `hotel_tested boolean` computado (mesmo padrão de `tested_count` em `/api/hotels`), pra `ContatosLensView` mostrar o selo de "testado" herdado do hotel.

### 3.4 `tdg_destination_knowledge` (tabela nova)
```sql
CREATE TABLE tdg_destination_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'fact' CHECK (type IN ('fact','note','link')),
  title text NOT NULL,
  content text,
  url text,
  country text,               -- texto livre, nullable (nunca gateia o insert nisso)
  region text,                -- cidade/região opcional (ex: "Veneza")
  hotel_id uuid REFERENCES tdg_hotels(id) ON DELETE SET NULL,  -- pros poucos itens hotel-específicos
  source_author text NOT NULL,   -- obrigatório (decisão #6)
  source_date date NOT NULL,     -- obrigatório (decisão #6)
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (country IS NOT NULL OR hotel_id IS NOT NULL)
);
CREATE INDEX idx_tdg_destination_knowledge_country ON tdg_destination_knowledge (lower(trim(country)));
CREATE INDEX idx_tdg_destination_knowledge_hotel_id ON tdg_destination_knowledge (hotel_id) WHERE hotel_id IS NOT NULL;
```
(`source_author`/`source_date` NOT NULL aqui — diferente do rascunho original do painel Tesla, ajustado pra decisão #6.)

### 3.5 Aprovação do autor (novo — decisões #14-16)
Colunas iguais em `tdg_hotel_reviews` e `tdg_destination_knowledge` (só se aplicam a linhas com `origin`/fonte `whatsapp_import` — review/conhecimento orgânico não passa por isso, fica sempre `NULL`):
```sql
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS import_approval text
  CHECK (import_approval IN ('pending','approved_by_author','approved_by_admin'));
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS import_approval_at timestamptz;
ALTER TABLE tdg_hotel_reviews ADD COLUMN IF NOT EXISTS import_approval_by uuid REFERENCES tdg_users(id);
-- mesmas 3 colunas em tdg_destination_knowledge, criadas já na CREATE TABLE (seção 3.4)
```
- `pending` → badge cinza discreto "Aguardando confirmação do autor". Item já aparece normalmente em busca/listagem (não fica escondido), só o badge sinaliza o estado — igual ao padrão já usado pra sugestão de IA (Seção 4 do design system: "aguardando revisão" até confirmação humana).
- `approved_by_author` ou `approved_by_admin` → badge some, item vira visualmente indistinguível de conteúdo orgânico. `import_approval_by` sempre aponta pra um `tdg_users.id` real (o autor, ou o admin que aprovou em nome dele) — nunca null quando o status não é `pending`.
- **Fila do autor — corrigido 01/08: NÃO é tela nova.** Fica dentro da própria tela onde a pessoa já revisa reviews (`DicasView.tsx` — "Na prática") e do TDG Knowledge Base, como uma 3ª seção condicional ("Aguardando sua confirmação", só visível quando existe pendência do próprio usuário), ao lado das já existentes "Recém-descoberto"/"Aprovado pela rede" (`DicasView.tsx:1717-1777`). Reaproveita o mesmo `HotelCard`, só troca o badge dourado "Confirmado" por um cinza "Você disse isso — confirma?". 3 ações por item: aprovar, editar (abre o mesmo formulário de edição já existente, pré-preenchido), pedir exclusão (remoção real da linha, não "arquivado"). Descoberta reforçada por um novo tipo no sino de notificações (mesmo padrão de `pending_guest_requests` já usado pro admin) — nunca depender só da pessoa lembrar de entrar na tela sozinha.
- **Fila do admin (fallback, decisão #16)**: mesmo padrão da fila "Pedidos de ativação GUEST" em Billing → Rede TDG — lista itens `pending` cujo `source_author` não bateu com nenhum `tdg_users`, ou que passaram 30 dias sem ação do autor real. Admin aprova em nome da pessoa → grava `approved_by_admin` + `import_approval_by = <id do admin>`.
- **Matching autor → usuário**: mesmo padrão fuzzy já usado no MCP `register_tip` (`name ILIKE` contra `tdg_users`, escopado à agência quando conhecida) — não um mecanismo novo.

### 3.6 `tdg_badges` (tabela nova — decisões #17-20)
```sql
CREATE TABLE tdg_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES tdg_users(id) ON DELETE CASCADE,
  badge_type text NOT NULL CHECK (badge_type IN ('voz_do_destino','referencia_categoria','pioneira')),
  context text NOT NULL,                    -- país (ex: "Grécia"), categoria (ex: "beach_club"), ou hotel_id::text pra pioneira
  hotel_id uuid REFERENCES tdg_hotels(id),   -- só preenchido em 'pioneira'
  is_current boolean NOT NULL DEFAULT true,  -- 'pioneira' nunca vira false; os outros dois podem trocar de dono
  earned_at timestamptz NOT NULL DEFAULT now(),
  lost_at timestamptz
);
CREATE UNIQUE INDEX idx_tdg_badges_current_holder
  ON tdg_badges (badge_type, context) WHERE is_current = true;
-- garante só 1 titular atual por (tipo, contexto) por vez — histórico fica registrado, só is_current muda
```

**Cálculo — "Voz de [País]" / "Referência em [Categoria]":**
- Job periódico **novo** (Vercel Cron, 1x/dia) — decisão confirmada em 01/08. Não existe cron nenhum hoje no projeto (checado em `vercel.json`, não achei nenhum job de billing pra copiar como referência); este é o primeiro. Precisa: entrada `crons` em `vercel.json` apontando pra uma rota nova (ex: `/api/cron/recompute-badges`), rodando 1x por dia — recompute leve o suficiente pra não precisar de frequência maior, e um título/selo não exige ser instantâneo como uma notificação de ação.
- Elegível só quem tem **mínimo 3 reviews `published`** (não `a_testar`) naquele país/categoria — evita "especialista" com 1 review só.
- Ranqueia por contagem de reviews `published` únicas (1 por hotel, não conta reviews repetidas do mesmo hotel) dentro do contexto; quem tem mais é o titular atual.
- Se o titular mudar: linha antiga vira `is_current=false, lost_at=now()`; linha nova entra `is_current=true`.

**Cálculo — "Pioneira":**
- Orientado a evento, não a cron: dispara quando uma review vira `published` (orgânica ou aprovada do import) e aquele hotel cruza o limiar de "citado de verdade" (proposta: **3ª review `published` do hotel** — ajustável).
- Busca a review `published` mais antiga daquele hotel por `source_date`, credita `pioneira` ao autor dela — só uma vez por hotel (idempotente, checar se já existe antes de criar).
- Nunca perdido depois — é fato histórico, não título disputado.

**Onde aparece (decisão #19):** badge pill discreto junto ao nome do autor, nos mesmos lugares onde `agent_name`/`source_author` já é mostrado hoje (ex: hero de "Na prática", "por {agent_name}") — cor na mesma família do selo "Confirmado" (dourado), nunca um placar/ranking à parte.

**Notificação (decisão #20):** novo tipo no sino, `badge_earned` (ganhou) e `badge_changed` (perdeu pra outra pessoa) — copy nunca no tom de perda/fracasso. Ex: "Ana virou a nova Voz da Grécia — a sua ainda conta muito por lá", nunca "Você perdeu o badge".

**"Minhas conquistas" no perfil (decisão #21):**
- **Onde:** `AgenciaView.tsx` (rota `/flow/agencia`, "Meu Perfil"), nova seção depois de "Nome de exibição"/"Alterar senha" e antes do `GuestActivationCard` — mesmo container/card style já usado nas seções acima da tela (não inventar componente novo).
- **API:** `GET /api/badges` (novo) — retorna badges do usuário logado: `SELECT badge_type, context, hotel_id, earned_at FROM tdg_badges WHERE user_id = <id da sessão> AND (is_current = true OR badge_type = 'pioneira') ORDER BY earned_at DESC`. `pioneira` sempre aparece (é permanente); `voz_do_destino`/`referencia_categoria` só aparecem enquanto `is_current = true` — se a pessoa perdeu o título, o badge some daqui (mas o histórico continua na tabela, só não é mostrado).
- **Card do badge:** pill dourado idêntico ao do mockup (`background: var(--tdgflow-gold-subtle)`, `color: var(--tdgflow-gold-dim)`, ícone de badge), um por linha, com o rótulo completo ("Voz da Grécia", "Pioneira · Uxua Casa Hotel & Spa") e a data em que foi conquistado (`earned_at`), formato "conquistado em 12/03/2026".
- **Estado vazio** (segue a regra já obrigatória do design system — "[Entidade] ainda não cadastrada. [CTA]"): "Nenhum selo conquistado ainda. Suas próximas dicas confirmadas pela rede podem virar um." — nunca uma seção sumida/oculta quando vazia, sempre visível com a explicação.
- **Depende de:** `tdg_badges` já populada (passo 7 da ordem de execução) — esta seção do perfil entra junto desse mesmo passo, não antes.

---

## 4. Busca cruzada no TDG Knowledge Base (decisão #9)

Hoje `DestinosView.tsx` busca só em `/api/knowledge-tips`, que só olha `tdg_destination_knowledge`. Pra virar Super Busca de verdade:

- Nova versão de `/api/knowledge-tips` (ou endpoint próprio) consulta em paralelo: `tdg_destination_knowledge` (título/conteúdo/país), `tdg_hotels` (nome/país/tags), `tdg_hotel_reviews` (hotel_name/país/conteúdo), `tdg_hotel_contacts` (organização/hotel).
- Case-insensitive, sem acento (`unaccent` do Postgres), busca parcial — mesmo padrão de Super Busca já obrigatório na casa.
- Resultados voltam agrupados por tipo de entidade na tela (Conhecimento / Hotéis / Reviews / Contatos), não misturados numa lista só.

---

## 5. Fluxo de registro de Reunião Comercial — mudanças

- [x] Pergunta única de hoje ("Por que chamou atenção? O que vale testar?") **fica como está** — decisão #12
- [x] Adicionar captura do contato da pessoa (nome, cargo, whatsapp/email) — grava em `tdg_hotel_contacts` vinculado ao `hotel_id` da reunião
- [x] `entity_type` ganha `'dmc'`
- [x] País vira múltiplo quando fizer sentido (DMC atende vários países) — `countries text[]`, decisão #11

---

## 6. Wiki TDG Flow (novo)

**Onde colocar:** novo item de nav **"Ajuda"** no grupo Referência (junto de Documentação / TDG Knowledge Base / Inbox), ícone de interrogação, traço-só. Não reaproveitar "Documentação" (esse nome já é usado pra vistos/documentos de viagem — misturar confundiria) nem "TDG Knowledge Base" (esse é sobre conhecimento de destino/rede, não sobre como usar o produto).

**Conteúdo inicial sugerido** (curto, linguagem simples, sem jargão técnico):
- O que é a Super Busca e como usar (uma palavra traz tudo relacionado)
- O que significam os selos "Testado pela rede" / "Aguardando teste"
- Como funciona o registro de um contato comercial / reunião comercial
- Diferença entre "Na prática" (reviews), "Rede" (catálogo) e "TDG Knowledge Base" (conhecimento de destino)
- Como funciona o sistema de Lumis (créditos)
- **Como tratamos o histórico do grupo de WhatsApp da rede (pedido da Carla, 01/08)** — nota curta e transparente explicando que parte do conteúdo (dicas, conhecimento de destino) veio do histórico do grupo "TDG - Travel Designers Group" (2020-2026), sempre com autor e data originais preservados (nunca anônimo, nunca atribuído a "importação"). Objetivo: nenhum integrante é pego de surpresa vendo uma frase própria "virar dado" no sistema sem entender de onde veio.
  - **Explicar também o fluxo de aprovação** (decisões #14-16): toda dica/conhecimento importado nasce com um selo cinza "Aguardando confirmação do autor" até a pessoa aprovar, editar ou pedir exclusão do próprio texto — só então ganha a cor normal e passa a valer como conteúdo confirmado.
  - **Explicar o fallback de admin, sem esconder** (decisão #16): se o autor original não está mais na rede, ou não responde em 30 dias, um admin Bemgsy aprova em nome dele — sempre marcado como "aprovado pelo admin", nunca fingindo ser aprovação do autor. Dizer isso às claras no Wiki é a diferença entre "processo transparente" e "sumiço silencioso de responsabilidade".
- **O que são os badges de expertise, e onde ver os seus** (decisões #17-20 e #21) — "Voz de [País]", "Referência em [Categoria]" e "Pioneira", o que cada um significa, que os dois primeiros são títulos que podem trocar de dono (nunca apresentado como "perda", só como a rede crescendo), e que a seção "Minhas conquistas" em Meu Perfil mostra os selos atuais da própria pessoa.
- **Legenda visual das cores** (pedido da Carla, 01/08, ver mockup) — explicar que dourado = confirmado pela rede / título de expertise atual; coral = recém-descoberto (lead, ninguém testou ainda); cinza = aguardando confirmação do autor (só aparece em conteúdo vindo do import do WhatsApp). São 3 cores com 3 significados diferentes na mesma tela — vale a pena deixar isso explícito em vez de a pessoa ter que adivinhar.

**Estrutura técnica sugerida:** tabela simples `tdg_wiki_articles` (id, slug, title, content, category, sort_order) — mesmo padrão leve de `tdg_partnership_content`, sem reaproveitar essa tabela (propósito diferente: uma é comunicação Bemgsy↔rede, a outra é ajuda do produto).

---

## 7. Ordem de execução recomendada

1. ~~**Limpeza pré-import** (produção): apagar os 3 hotéis fake de teste manual (Je ne c quoi, La Sivoliere, Saint Tropez Nikki) + as sobras de teste automatizado (`__TDD Hotel AgencyId ...`), mantendo só Martinhal (×4) e Velaa.~~ **✅ Já feito** — confirmado no banco em 01/08: restam só os 5 curados (`Martinhal Sagres`/`Lisboa Chiado`/`Lisboa Oriente`/`Quinta do Lago`, `Velaa Private Island`), zero sobra de teste (`__TDD%`), zero FK órfã.
2. ~~Schema: `is_partner`/`origin`/`mention_count`/`countries` em `tdg_hotels`, `entity_type` +`dmc`, `tdg_destination_knowledge` nova, colunas de aprovação (`import_approval`/`_at`/`_by`) em `tdg_hotel_reviews` e `tdg_destination_knowledge`~~ **✅ Já feito** — migration `021_knowledge_base_schema.sql`, aplicada em produção, commit `98ef2fa`.
3. ~~Canonicalizar hotéis (união das 3 categorias + match contra os 5 curados restantes) → inserir só os que têm evidência real (review) como leads~~ **✅ Já feito** — `docs/whatsapp-extraction/fase3_canonicalizacao_hoteis.md`: 685 hotéis únicos resolvidos (975 de 1.012 reviews cobertas, 96%), 4 resolvidos pra fornecedor já curado, 27 excluídos com motivo documentado (ambíguo/composto/não-hotel). Ainda nenhum INSERT rodou — é só o artefato de canonicalização que a Fase 4 vai consumir.
4. Inserir reviews (extração de IA em **todas**, sem filtrar por tamanho — decisão #13) e contatos, resolvendo `hotel_id` — reviews nascem `import_approval='pending'`
5. Inserir conhecimento de destino em `tdg_destination_knowledge` — mesmo `pending` inicial
6. Fila de aprovação do autor + fila de fallback do admin (decisões #14-16)
7. Badges de expertise (`tdg_badges`, cron de recomputo + evento de "pioneira" — decisões #17-20) + seção "Minhas conquistas" no perfil (`AgenciaView.tsx`, `GET /api/badges` — decisão #21). Depende dos passos 3-6 já terem gerado reviews `published` reais, incluindo aprovadas do import.
8. Busca cruzada no TDG Knowledge Base
9. Fluxo de registro de Reunião Comercial expandido (contato + DMC + país múltiplo)
10. Wiki TDG Flow (inclui a explicação do processo de importação, do fallback de admin, dos badges, e onde ver "Minhas conquistas")

---

## 8. Status

Todas as decisões estão fechadas (21 no total, seção 1). Nenhum código foi escrito, nenhum dado foi inserido — este documento é o plano completo aguardando sinal verde da Carla pra começar a implementação. Limpeza de dados de teste em produção (passo 1) já mapeada e aguardando confirmação final antes de executar (ver conversa 01/08).
