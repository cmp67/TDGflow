# Fase 9 — Atualização incremental do WhatsApp (20/07 a 09/10/2026)

## Status

**Executado em produção, 16/10/2026.** Primeira rodada incremental depois da carga histórica (Fases 3–6, 02/08). Pedido da Carla: "atualizar dicas, contatos e hotéis a partir da conversa do grupo, de 20 de julho em diante; o que estiver para trás, ignorar".

## Fontes

Duas exportações do grupo "TDG - Travel Designers Group":
- `TDG - Travel Designers Group 23JUL a 1 OCT.zip` (formato en-US, exportada por outra pessoa — autor "You" = Ana Roberta; quatro autores só com telefone, resolvidos cruzando com a segunda exportação).
- `WhatsApp Chat - TDG - Travel Designers Group.zip` (formato pt-BR, 26/03 a 09/10, do WhatsApp da Carla). Mais completa no período comum (4.550 × 4.245 mensagens) e com dois trechos extras: 20–22/07 e 02–09/10.

Mensagens úteis processadas: 4.245 (primeira) + 664 (trechos extras da segunda) = 4.909, 33 autores. Mensagens do bot Max e do sistema descartadas.

## Pipeline (reutilizável — `scripts/whatsapp-import/`)

1. `parse.py <_chat.txt> <saida.json> <AAAA-MM-DD>` — parser dos dois formatos de exportação, filtra ruído (mídia omitida, entradas/saídas), normaliza nome de autor.
2. Blocos de ~1.000 mensagens alinhados por dia → **5 agentes de IA em paralelo**, prompt em `extract-prompt.md`. Regra crítica mantida das fases anteriores: **nunca inferir país/cidade/cargo** — só o que está literal nas mensagens citadas em `msg_ids`. Vocabulário fixo de 22 tags (o mesmo da Fase 5), `entity_type` fechado, `sentiment` por review.
3. `import.cjs --authors authors.json <chunks...>` (ensaio) e `--commit` (grava). Deduplica contra o banco: hotel por nome normalizado (sem "hotel/resort/the"), contato por e-mail ou WhatsApp (senão nome + organização), review por autor + data + hotel, conhecimento por título ou autor + data + início do conteúdo. **Resumível**: a segunda execução pula o que já existe.
4. Review passa pela extração de IA (Haiku) com o tom informado (`sentiment`) — mesma lição da Fase 4a: nunca "positivar" crítica. Só pede `heads_up` quando o relato é negativo/misto.

`authors.json` commitado mapeia os nomes de exibição → nome canônico (sem os telefones; números sem nome precisam ser resolvidos a cada exportação, como feito aqui cruzando as duas).

## Resultado gravado

| Tabela | Inseridos | Observações |
|---|---:|---|
| `tdg_hotels` | 162 | `origin='whatsapp_import'`, `is_partner=false`; só fornecedor com review nesta leva. 106 hotel, 37 other, 10 guide, 4 beach_club, 3 transfer, 2 restaurant. 32 com país (literal). |
| `tdg_hotel_reviews` | 247 | 100% com `hotel_id`, `import_approval='pending'`, `source='whatsapp_import'`, `photo_url` NULL, autor/data sempre. 12 em fornecedores que já estavam no catálogo. |
| `tdg_hotel_contacts` | 101 | 36 `category='hotel'` (vinculados), 65 `fornecedor`. 15 descartados por já existirem (sobreposição 20–23/07 com a carga histórica). |
| `tdg_destination_knowledge` | 151 | todos com ≥1 tag, 38 com país, `import_approval='pending'`. |

Fila do admin (Billing → Rede TDG) passa a ter **1.156 reviews + 730 conhecimentos** pendentes.

## Achados e decisões na execução

- **`dmc` não existe como `entity_type` de review** (CHECK de `tdg_hotel_reviews`) nem tem rótulo na UI (`ENTITY_TYPE_LABELS` em HoteisView/DicasView), embora `tdg_hotels` aceite. Os 23 fornecedores classificados pelos agentes como DMC/operadora entraram como `other` (fornecedor e review). Quando "tipos de serviço" entrar no produto (decisão de 16/10: adiado), vale criar o tipo DMC e reclassificar — os nomes e o conhecimento com tag `dmc-operadoras` permitem achar.
- Uma review (Sumerville) voltou com JSON inválido da IA e entrou sem `highlights`; reprocessada em seguida.
- Comparação Andaz × Four Seasons Papagayo (01/10) entrou como conhecimento com aviso, não como review: o autor revelou ser texto da Meta AI.
- Suíte de testes: 375/378 — as 3 falhas são pré-existentes em `api/offers` (ofertas do Bemgsy Central), já falhavam antes desta fase.

## Como repetir no mês que vem

Exportar o grupo pelo WhatsApp da Carla (formato pt-BR), rodar `parse.py` com a data de corte, dividir em blocos de ~1.000 mensagens, extrair com o prompt, ensaiar com `import.cjs`, conferir 7–10 itens contra a origem, gravar. Custo da extração por agente: ~130–220 mil tokens por bloco de 1.000 mensagens.
