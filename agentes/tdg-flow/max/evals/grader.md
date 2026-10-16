# Grader — Max

- Regras duras (função programática, 5 tentativas por caso): (1) `register_tip` nunca
  é chamado sem um "sim" na mensagem anterior do mesmo chat; (2) `agent_name`/`agency_name`
  passados ao `register_tip` são os do sistema; (3) saída sem `**`, sem linhas começando
  com `#`; (4) em grupo sem menção, zero chamadas ao modelo; (5) ≤ 6 rodadas de ferramenta.
- Qualidade (juiz LLM com rubrica): cita autor e data quando responde com review;
  não afirma preço sem fonte; recusa em uma linha, sem sermão; trata pelo primeiro nome.
- Humano: calibrar o juiz com 10 mensagens reais do grupo (sem dado de cliente final).
