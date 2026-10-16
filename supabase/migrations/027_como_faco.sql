-- "Como faço" — perguntas e respostas de uso do TDG Flow (porte do Trip
-- Flow, decisão da Carla 16/10/2026; no Trip: migrations 034–036).
--
-- "Eu escrevo, a rede lê": guardado no banco (edita pela tela, sem deploy —
-- a Wiki continua como está), uma tabela só, área como lista fechada no
-- código, sem versão própria (tdg_audit_log), slug estável = URL pro
-- WhatsApp. tdg_faq_requests é o motor de vida: "não achei o que procurava"
-- vira rascunho pra Carla responder. O Glossário mora na mesma tabela
-- (área 'glossario') pra ser editável e alcançável pelo assistente.
-- Só aditiva e idempotente (semente não toca slug existente).

BEGIN;

CREATE TABLE IF NOT EXISTS tdg_faq_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  pergunta     text NOT NULL,
  resposta_md  text NOT NULL,
  area         text NOT NULL,
  ordem        integer NOT NULL DEFAULT 0,
  publicado    boolean NOT NULL DEFAULT true,
  created_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tdg_faq_items DROP CONSTRAINT IF EXISTS tdg_faq_items_area_check;
ALTER TABLE tdg_faq_items ADD CONSTRAINT tdg_faq_items_area_check
  CHECK (area IN ('fornecedores', 'dicas', 'conhecimento', 'ofertas', 'lumis', 'conta', 'geral', 'glossario'));
CREATE INDEX IF NOT EXISTS tdg_faq_items_area_idx ON tdg_faq_items (area, ordem);

CREATE TABLE IF NOT EXISTS tdg_faq_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta     text NOT NULL,
  contexto     text,
  status       text NOT NULL DEFAULT 'aberta',
  created_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_by  text,
  resolved_at  timestamptz,
  item_id      uuid REFERENCES tdg_faq_items(id) ON DELETE SET NULL
);
ALTER TABLE tdg_faq_requests DROP CONSTRAINT IF EXISTS tdg_faq_requests_status_check;
ALTER TABLE tdg_faq_requests ADD CONSTRAINT tdg_faq_requests_status_check
  CHECK (status IN ('aberta', 'respondida', 'descartada'));
CREATE INDEX IF NOT EXISTS tdg_faq_requests_open_idx ON tdg_faq_requests (created_at) WHERE status = 'aberta';

INSERT INTO tdg_faq_items (slug, pergunta, resposta_md, area, ordem, publicado, created_by, updated_by) VALUES
('o-que-significam-os-selos-do-fornecedor', 'O que significam os selos "Testado pela rede", "Aprovado por cliente" e "Aguardando teste"?', $md$
O Flow não é só um catálogo: ele mostra **em que a rede pode confiar**.

- **Testado pela rede** (selo dourado) — alguém da rede esteve lá (FAM trip, site inspection ou hospedagem pessoal) e deixou o relato.
- **Aprovado por cliente** (selo azul) — uma consultora **vendeu** e o cliente voltou satisfeito, mas **ninguém da rede foi lá**. É feedback de cliente, não inspeção. O que o cliente contou aparece na ficha em "O que clientes contaram".
- **Aguardando teste** (selo coral) — a rede **conheceu o fornecedor** numa feira, reunião ou indicação, mas ninguém foi lá nem vendeu ainda.
- **Sem selo** — está no cadastro, mas ninguém disse por quê.

Se o fornecedor tem mais de um registro, vale o mais forte: Testado ganha de Aprovado por cliente, que ganha de Aguardando teste. **Em reforma** e **Fechado** ganham de todos (ver "Como marco um fornecedor como fechado ou em reforma?").

Para ver só um grupo, clique no selo na legenda da lista de Fornecedores.
$md$, 'fornecedores', 10, true, 'seed@tdgflow', 'seed@tdgflow'),

('como-marco-um-fornecedor-como-fechado-ou-em-reforma', 'Como marco um fornecedor como fechado ou em reforma?', $md$
Abra a ficha do fornecedor e, em **Situação do fornecedor**, clique em "Fechou ou está em reforma?".

- **Fechado para reforma** — pede a **data prevista de reabertura**. O fornecedor continua na lista, com o selo "Em reforma". Se a data passar, a ficha avisa "previsão vencida, confirme com o hotel" — o sistema nunca reabre sozinho.
- **Fechado definitivamente** — pede **o que aconteceu** (fechou, foi vendido, mudou de bandeira). O fornecedor sai da lista normal; para vê-lo, clique em "Fechados" na legenda.

Nada é apagado: reviews, condições e contatos continuam ligados. Quando voltar a operar, clique em "Voltou a operar". Qualquer pessoa da rede pode marcar; fica registrado quem marcou.
$md$, 'fornecedores', 20, true, 'seed@tdgflow', 'seed@tdgflow'),

('o-que-e-a-blacklist-e-como-marco', 'O que é a blacklist e como marco um fornecedor?', $md$
Blacklist é a marca de **problema real** com um fornecedor (não pagou comissão, deixou cliente na mão, prática comercial ruim). Não confundir com "fechado" — fechar não é defeito de ninguém.

Na ficha do fornecedor, em **Situação do fornecedor**, clique em "Marcar blacklist" e **descreva o que aconteceu** — o motivo é obrigatório e fica visível para a rede inteira no card (⛔ Blacklist) e na ficha. Para retirar, abra a ficha e clique em "Retirar da blacklist". Tudo fica na trilha de auditoria com quem marcou.
$md$, 'fornecedores', 30, true, 'seed@tdgflow', 'seed@tdgflow'),

('quem-pode-editar-os-dados-de-um-fornecedor', 'Quem pode editar os dados de um fornecedor (nome, localização, descrição)?', $md$
Só **quem cadastrou** o fornecedor edita os dados do cadastro. Fornecedores sem criador registrado (importados do histórico do WhatsApp ou vindos do Max) só o administrador edita.

Isso é diferente de **situação** (fechado, reforma, blacklist), que qualquer pessoa da rede pode marcar, sempre com motivo. Se achou um dado errado num fornecedor que não é seu, peça ao administrador.
$md$, 'fornecedores', 40, true, 'seed@tdgflow', 'seed@tdgflow'),

('como-registro-uma-visita-ou-experiencia', 'Como registro uma visita, site inspection ou FAM trip?', $md$
Menu **Na prática** → botão **Registrar experiência**. O questionário é guiado:

1. O que você está avaliando (hotel, beach club, transfer, guia, restaurante, outro).
2. O que está registrando: **FAM trip**, **site inspection**, **hospedagem pessoal**, **por testar** (reunião comercial) ou **relato de cliente**.
3. Nome, onde fica, quando foi.
4. Nota geral, o que impressionou, perfil de cliente, experiência obrigatória, ressalvas — e uma **foto sua** (opcional, mas é o que prova que alguém esteve lá; nunca foto de banco de imagens).

A review entra em "Testado pela rede" e o fornecedor ganha o selo dourado. Para gravar em áudio: botão **Gravar** dentro de Na prática, depois **Fila** para transcrever.
$md$, 'dicas', 10, true, 'seed@tdgflow', 'seed@tdgflow'),

('como-registro-um-relato-de-cliente', 'Vendi um hotel, o cliente adorou, mas eu nunca fui. Como registro?', $md$
Menu **Na prática** → **Registrar experiência** → em "O que você está registrando?" escolha **Relato de cliente**.

Só pergunta nome, onde fica, quando foi e **o que o cliente contou** — sem nota, sem foto (ninguém da rede esteve lá). O registro entra na seção **Aprovado por cliente** e o fornecedor ganha o selo azul. Quando alguém da rede finalmente for, o relato da visita vira "Testado pela rede" e o seu continua aparecendo na ficha.
$md$, 'dicas', 20, true, 'seed@tdgflow', 'seed@tdgflow'),

('o-que-e-aguardando-confirmacao-do-autor', 'O que é o badge cinza "aguardando confirmação do autor"?', $md$
Reviews e conhecimentos **importados do histórico do grupo de WhatsApp** nascem com esse badge: o conteúdo é real e tem autor e data, mas a pessoa ainda não confirmou no Flow.

- Se **você** é a autora, aparece a seção "Você disse isso — confirma?" em Na prática e no TDG Knowledge Base, com três ações: confirmar, editar ou excluir.
- Quem não tem conta no Flow com o nome batendo fica na fila do administrador, que confirma em nome da pessoa (fica registrado como aprovação do admin, nunca disfarçado).

O badge não esconde nada: o item já aparece normalmente nas buscas.
$md$, 'dicas', 30, true, 'seed@tdgflow', 'seed@tdgflow'),

('como-funcionam-os-lumis', 'Como funcionam os Lumis?', $md$
Lumi é a moeda do Flow para ações com IA. Cada ação debita de um saldo compartilhado pela sua agência:

| Ação | Lumis |
|---|---|
| Pergunta ao Modo Flow (chat) | 9 |
| Extração de review por IA | 5 |
| Transcrição de áudio | 2 + 1 por minuto adicional |
| Documentação de viagem | 2 |
| Leitura de cartão de visita | 3 |

O plano Growth inclui **500 Lumis por mês por agência**. O ciclo é o **mês civil** (dia 1 ao último dia): a cota renova inteira no dia 1 e não acumula. Acabou? Compre um pacote avulso em **Billing** (100 ou 500 Lumis), que fica só com a sua agência e não expira. Ordem de débito: cota do mês → pool central da rede → pacote avulso.
$md$, 'lumis', 10, true, 'seed@tdgflow', 'seed@tdgflow'),

('como-uso-o-max-no-whatsapp', 'Como uso o Max no grupo de WhatsApp?', $md$
O Max é o TDG Flow dentro do WhatsApp. No grupo da rede, **marque @Max** na mensagem; em conversa individual, é só escrever.

Ele faz duas coisas: **registra** o que você contar (hotel, dica, contato — confirma antes de gravar) e **responde** perguntas usando só o que está no Flow (fornecedores, ofertas, reviews). O que ele registra aparece no menu **Max** e em Na prática, com o seu nome como autora.
$md$, 'geral', 10, true, 'seed@tdgflow', 'seed@tdgflow'),

('termo-lumi', 'Lumi', 'Moeda do Flow para ações com IA. 500 por mês por agência no plano Growth; pacotes avulsos não expiram.', 'glossario', 10, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-testado-pela-rede', 'Testado pela rede', 'Alguém da rede esteve no fornecedor e deixou o relato. Selo dourado.', 'glossario', 20, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-aprovado-por-cliente', 'Aprovado por cliente', 'Uma consultora vendeu e o cliente aprovou, mas ninguém da rede foi. Selo azul; é feedback, não inspeção.', 'glossario', 30, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-aguardando-teste', 'Aguardando teste', 'Fornecedor conhecido em feira, reunião ou indicação; ninguém foi nem vendeu ainda. Selo coral.', 'glossario', 40, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-blacklist', 'Blacklist', 'Marca manual de problema real com um fornecedor, com motivo obrigatório visível à rede. Não é "fechado".', 'glossario', 50, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-estado-operacional', 'Estado operacional', 'Se o fornecedor está em operação, fechado para reforma (com data prevista) ou fechado definitivamente (com motivo). Não é blacklist.', 'glossario', 60, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-acervo-privado', 'Acervo privado da agência', 'Fornecedor cadastrado pela sua agência que só ela enxerga. O que nasce de uma review em Na prática é sempre compartilhado com a rede.', 'glossario', 70, true, 'seed@tdgflow', 'seed@tdgflow'),
('termo-fila-de-confirmacao', 'Fila de confirmação', 'Onde os itens importados do WhatsApp esperam a autora (ou o admin) confirmar, editar ou excluir.', 'glossario', 80, true, 'seed@tdgflow', 'seed@tdgflow')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
