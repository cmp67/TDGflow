## 2026-10-18 — v3.2 — Sonnet 4.6
Caso: a rede não quer escuta ativa (Carla, 18/10). O Max só fala quando chamado:
@Max por toque (incluindo LID da instância), "Max," no início, ou reply a uma mensagem
dele (novo: Carol reclamou que reply não funcionava). Wrap-up passa a domingo 21h.

## 2026-10-18 — v3.1 — Sonnet 4.6
Caso: crítica da rede ("a IA melhora/edita o que a gente disse"). register_tip ganha
original_text obrigatório (palavras da pessoa, gravadas sem edição em raw_answers);
highlights viram opcionais e só trechos copiados. O card do Flow mostra as palavras
primeiro e rotula o resumo da IA. Reverter: tornar original_text opcional.

## 2026-10-18 — v3 — Sonnet 4.6
Caso: agenda compartilhada da rede (decisão da Carla 18/10). Terceira função:
registrar evento quando marcado (register_event, com confirmação), listar o que vem
(list_events) e marcar presença (rsvp_event). Lembretes automáticos no grupo (agenda
de amanhã 18h; wrap-up domingo 21h) ficam nos crons, fora do modelo.
Reverter: tirar a função 3 do prompt e AGENDA_TOOLS do agent.ts.

## 2026-10-16 — v2 — Sonnet 4.6
Caso: leitura do behavior real do GPT Maker (agente 3F1A294F…) antes de desligar.
Mudança: entram as "regras de ouro" que estavam lá e faltavam no v1 — ferramentas
do Bemgsy Central (materiais, hotéis representados, ofertas) quando o token existe;
consultar reviews/dicas antes de dizer que um hotel não existe; sem resultado, dizer o
que foi buscado; tarifário não existe (nunca estimar, nunca negar o hotel por falta de
preço); links só das ferramentas; inglês se falarem em inglês; pessoa não identificada
é atendida sem recusa (decisão da Carla 11/09). Harness: register_tip some da lista
quando não há identidade.
Reverter: voltar ao v1 (git) — perde o Central e as regras de preço/busca.

## 2026-10-16 — v1 — Sonnet 4.6
Caso: decisão da Carla de tirar o Max do GPT Maker (armadilhas registradas em 11/09:
intenção que não dispara, PUT que apaga segredo, histórico de grupo contaminando,
modelo que não enxerga o telefone). Molde escrito do zero nas seções fixas, a partir
do behavior que rodava lá: duas funções (registrar com confirmação, responder só com
ferramentas), identidade pelo telefone no sistema, grupo só quando marcado.
Reverter: religar o canal no GPT Maker (canal `3F61D3C4…`) e desligar o webhook da uazapi.
