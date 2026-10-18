# Harness — Max

| Campo | Valor |
|---|---|
| modelo | `claude-sonnet-4-6` (mesmo do Modo Flow; decidir/raciocinar com ferramentas → faixa média-alta). Haiku falhou em 2025 no GPT Maker: ignorava a regra de chamar ferramenta antes de responder |
| politica_de_modelo | responder/registrar com ferramentas → Sonnet. Classificar "é registro ou pergunta?" fica dentro da mesma chamada (não vale uma chamada extra de Haiku) |
| thinking | desligado |
| max_tokens | 1024 (resposta de WhatsApp) |
| stop_sequences | nenhuma |
| structured_output | não; saída é texto puro pro WhatsApp. Ferramentas usam JSON schema |
| ferramentas | as 8 de `src/lib/mcp-tools.ts` + 3 de agenda (`src/lib/max/agenda-tools.ts`: list_events, register_event, rsvp_event) + 6 de leitura do Bemgsy Central via MCP (`src/lib/max/central-mcp.ts`, token em `BEMGSY_CENTRAL_MCP_TOKEN`; sem token, só o Flow) (search_tdg_suppliers, get_tdg_supplier_details, search_tdg_offers, search_reviews, get_review, list_hotel_tips, search_knowledge, register_tip). `register_tip` recebe agent_name/agency_name do sistema (identidade pelo telefone), nunca do modelo |
| limite_de_voltas | 6 rodadas de ferramenta por mensagem; acima, responde com o que tem |
| orcamento | 9 Lumis por mensagem (ação `chat`), debitados antes da chamada (falha fechado: sem Lumis, sem IA). Dia: pelo pool da agência |
| memoria | últimas 12 mensagens do mesmo chat (48 h), guardadas em `tdg_max_messages`; em grupo só o que foi dirigido ao Max e o que ele respondeu |
| telemetria | `logUsage({event_type:'max_whatsapp'})` com tokens; execução pro Ops entra na fase 2 do heartbeat |
| transporte | uazapi: webhook `POST /api/whatsapp/uazapi?s=<segredo>`, resposta via `POST /send/text` com token da instância |
