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
4. Redeploy (qualquer deploy serve) para a função ler as variáveis.
5. Teste: mandar "Max, o que a rede sabe do Txai?" no 1:1 e no grupo (marcando o
   número do Max). Em grupo sem marcar, ele fica calado.

## Regras que a rota aplica (`src/app/api/whatsapp/uazapi/route.ts`)

- Segredo da URL + token da instância; payload nunca é logado.
- Ignora eco (`fromMe`), evento sem texto e mensagem duplicada (`message_id` único
  em `tdg_max_messages`).
- Grupo: só responde quando marcado (`@número`, `@max` ou "Max," no início).
- Identidade: telefone do remetente em `tdg_users.whatsapp` (com/sem o 9). Sem
  cadastro: orienta a pedir ao admin da agência, sem gastar IA.
- Lumis: 9 por mensagem (ação `chat`) debitados ANTES da IA; sem saldo, avisa.
- Memória: últimas 12 trocas do chat em 48 h; em grupo só as da mesma pessoa com o Max.
- `register_tip` sai sempre em nome de quem fala; o modelo não escolhe autor.
- Falha da IA → mensagem curta de desculpa; a rota nunca devolve 500.

## Desligar / reverter

Remover o webhook na instância (ou apagar `UAZAPI_INSTANCE_TOKEN`: a rota passa a
responder 503 e nada é processado). Religar o canal no GPT Maker se precisar.
