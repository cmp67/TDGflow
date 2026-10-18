# Max dentro do Flow — transporte uazapi

Desde v7.210 (16/10/2026) o Max roda dentro do TDG Flow: cérebro (Sonnet 4.6 com as
8 ferramentas do MCP), identidade pelo telefone, memória de conversa e débito de
Lumis, tudo aqui. Só o WhatsApp é terceiro: **uazapi** (servidor `bemgsy.uazapi.com`,
o mesmo da TA Travel). Molde do agente em `agentes/tdg-flow/max/`, instância em
`instancias/tdg/tdg-flow.max.yaml`.

## Como ligar (uma vez)

1. No painel da uazapi (`https://bemgsy.uazapi.com`, admintoken da Carla, nunca no
   repo): criar a instância `max-tdg` e conectar o número do Max pelo QR code.
   Se for o número que hoje está no GPT Maker, desconectar lá primeiro (canal
   `3F61D3C4…`), senão os dois brigam pela sessão.
2. Copiar o **token da instância** → Vercel env production `UAZAPI_INSTANCE_TOKEN`
   (e `.env.local`). `UAZAPI_BASE_URL` e `UAZAPI_WEBHOOK_SECRET` já estão lá.
3. Na instância, configurar o webhook para o evento `messages` apontando para
   `https://tdg-flow-carla-4643s-projects.vercel.app/api/whatsapp/uazapi?s=<UAZAPI_WEBHOOK_SECRET>`
   (o valor está em `.env.local`; é a única autenticação da URL, além do token da
   instância que a uazapi manda no corpo).
4. (Opcional, mas é o que o Max tinha no GPT Maker) Bemgsy Central: no Central, em
   Agentes MCP, copiar o *agent token* do agente do Max (tabela `mcp_agent_tokens`;
   o mesmo que o GPT Maker usava no OAuth) → Vercel env `BEMGSY_CENTRAL_MCP_TOKEN`.
   `BEMGSY_CENTRAL_MCP_URL` já está lá. Sem o token, o Max responde só com o Flow
   (sem materiais/FAQs/fichas dos hotéis representados).
5. Redeploy (qualquer deploy serve) para a função ler as variáveis.
6. Teste: mandar "Max, o que a rede sabe do Txai?" no 1:1 e no grupo (marcando o
   número do Max). Em grupo sem marcar, ele fica calado.

## Postagens automáticas no grupo (agenda)

- `NEXT_PUBLIC_AGENDA_ENABLED=1` (Vercel env + redeploy): liga o item Agenda no menu
  e a tela `/flow/agenda`. Até lá a rota mostra "em breve".
- `MAX_GROUP_JID` (Vercel env): JID do grupo da TDG (`...@g.us`), obtido com
  `POST /group/list` na instância. Sem ele, os crons respondem `sent: false` e não
  postam.
- `/api/cron/max-agenda-amanha` — todo dia 18h de Brasília: eventos de amanhã;
  dia sem evento = silêncio.
- `/api/cron/max-wrapup-semanal` — domingo 9h de Brasília: agenda de segunda a
  domingo + o que a rede registrou (mesmo conteúdo do digest semanal por e-mail).
- Eventos nascem na tela Agenda (`/flow/agenda`) ou pelo Max ("Max, treinamento X
  dia 28/10 às 15h").

## Regras que a rota aplica (`src/app/api/whatsapp/uazapi/route.ts`)

- Segredo da URL + token da instância; payload nunca é logado.
- Ignora eco (`fromMe`), evento sem texto e mensagem duplicada (`message_id` único
  em `tdg_max_messages`).
- Grupo: só responde quando marcado (`@número`, `@max` ou "Max," no início).
- Identidade: telefone do remetente em `tdg_users.whatsapp` (com/sem o 9). O
  WhatsApp pode mandar o remetente como LID (`<15 dígitos>@lid`, 18/10/2026): o
  parser prefere `sender_pn` (JID PN resolvido pela uazapi) e só aceita
  `@s.whatsapp.net` como telefone — dígitos de LID nunca viram telefone. Sem
  `sender_pn`, a pessoa é atendida como não identificada (sem registro em nome
  dela), e a rota loga só `{group, jidKind, hasSenderPn}`, nunca o número.
- Menção por toque com LID (v7.218): o texto bruto chega "@<lid> pergunta" e o
  `mentionedJid` traz "<lid>@lid" — o LID do Max, não o número. O `/instance/status`
  não expõe esse LID, então a rota o **aprende sozinha** das mensagens que o próprio
  Max envia (`fromMe` + `sender_lid`, guardado em `tdg_max_state`). Fallback manual:
  env `UAZAPI_INSTANCE_LID`. Na primeira vez, basta o Max ter respondido uma vez
  (ex.: no privado) para a menção por toque passar a funcionar no grupo.
- Sem cadastro: atende normalmente (decisão da Carla 11/09), sem Lumis, sem
  register_tip.
- Lumis: 9 por mensagem (ação `chat`) debitados ANTES da IA; sem saldo, avisa.
- Memória: últimas 12 trocas do chat em 48 h; em grupo só as da mesma pessoa com o Max.
- `register_tip` sai sempre em nome de quem fala; o modelo não escolhe autor.
- Falha da IA → mensagem curta de desculpa; a rota nunca devolve 500.

## Desligar / reverter

Remover o webhook na instância (ou apagar `UAZAPI_INSTANCE_TOKEN`: a rota passa a
responder 503 e nada é processado). Religar o canal no GPT Maker se precisar.
