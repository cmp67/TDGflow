# Relatório — Extração do Histórico WhatsApp TDG (2020–2026)

**Projeto:** TDG Flow — Base de Inteligência de Negócio
**Data do relatório:** 23/07/2026
**Autor:** Sessão Claude Code (da997e6c)

---

## 1. O que foi feito

Processamos o histórico completo do grupo de WhatsApp **"TDG - Travel Designers Group"** — a rede das 19 agências credenciadas — cobrindo **18/08/2020 a 23/07/2026** (quase 6 anos), num total de aproximadamente **153 mil mensagens brutas**.

O objetivo era transformar conversa não estruturada em inteligência de negócio estruturada e reutilizável no TDG Flow: hotéis mencionados, contatos comerciais, reviews/opiniões de consultores, conhecimento prático de viagem e promoções/negociações.

### Pipeline aplicado

1. **Parsing** — extração regex do `.txt` exportado do WhatsApp (tratando caracteres invisíveis Unicode antes de timestamps), separado por ano.
2. **Filtragem de ruído** — remoção de mensagens sociais/sistêmicas (mídia omitida, entradas/saídas de grupo, etc.).
3. **Chunking cronológico** — divisão em **14 peças** de ~10 mil mensagens cada, para processamento paralelo.
4. **Extração via agente de IA** — 1 agente dedicado por peça, aplicando uma regra crítica repetida em todo prompt: **nunca inferir geografia, datas ou dados de contato além do que está literalmente escrito na mensagem**; usar `null` em caso de dúvida.
5. **Atribuição de origem** — todo item extraído carrega `source_author` (quem mandou a dica) e `source_date` (quando foi extraída/mencionada).
6. **Autorevisão + auditorias dedicadas** — cada peça passou por pelo menos uma rodada de autocrítica; peças com sinais de invenção geográfica (peça 02, peça 09 em especial) receberam um agente de auditoria dedicado para reconstruir os dados só com o que realmente estava no texto.

### Resultado agregado

| Categoria | Itens extraídos |
|---|---:|
| Hotéis (menções) | 1.448 |
| Hotéis (nomes únicos, dedup simples) | 1.288 |
| Contatos comerciais | 611 |
| Reviews/opiniões | 1.012 |
| Conhecimento de viagem | 627 |
| Promoções/negociações | 225 |
| **Total de itens** | **3.923** |

Documento completo com todos os itens: `docs/whatsapp-extraction/TDG_Flow_Extracao_WhatsApp_2020-2026.md` (repositório `tdg-flow`, commit `13b38b1`).

### Pendências conhecidas
- **Deduplicação fina de hotéis** — o número de 1.288 "únicos" é por correspondência exata de string normalizada; o mesmo hotel citado com grafias diferentes ao longo dos 6 anos ainda não foi consolidado.
- **Inserção no banco** — os dados estão extraídos e organizados, mas ainda não foram inseridos em `tdg_hotels`/`tdg_hotel_contacts`/etc.

---

## 2. Consumo de tokens e custo aproximado

Os números abaixo são **medidos diretamente dos logs reais da sessão** (não são estimativas) — soma de `input_tokens`, `output_tokens`, `cache_creation_input_tokens` e `cache_read_input_tokens` reportados pela API em cada chamada, para os 28 agentes que efetivamente processaram as 14 peças (extração inicial + retries + auditorias de correção geográfica). Modelo usado: **Claude Sonnet 5**.

Preço de referência usado (por milhão de tokens): entrada US$ 3,00 · saída US$ 15,00 · escrita em cache (5 min) US$ 3,75 · leitura de cache US$ 0,30.

### 2.1 Total da extração (28 agentes)

| Tipo de token | Quantidade | Custo (USD) |
|---|---:|---:|
| Entrada (input) | 95.174 | $0,29 |
| Saída (output) | 1.726.383 | $25,90 |
| Escrita em cache | 33.757.987 | $126,59 |
| Leitura de cache | 1.011.581.903 | $303,47 |
| **Total** | **1.047.161.447** | **$456,25** |

O volume dominante é leitura de cache: cada agente mantinha as ~10 mil mensagens da sua peça (e o histórico já extraído) no contexto durante múltiplas rodadas de autorevisão — cada rodada relê esse contexto já cacheado, daí o volume alto mas a um custo por token 10x menor que entrada nova.

### 2.2 Custo por peça (ordenado, incluindo retries)

| Peça/Agente | Tokens | Custo (USD) |
|---|---:|---:|
| Peça 01 | 58.830.027 | $26,69 |
| Peça 02 | 39.835.486 | $17,67 |
| Peça 02 (retry) | 100.258.464 | $36,86 |
| Peça 02 (retry 2) | 28.926.680 | $13,93 |
| Auditoria geográfica peça 02 | 25.967.221 | $11,38 |
| Peça 03 | 26.293.980 | $13,05 |
| Peça 04 | 564.670 | $0,71 |
| Peça 04 (retry) | 45.110.101 | $20,27 |
| Peça 04 (retry 2) | 34.027.853 | $19,55 |
| Peça 05 | 21.662.313 | $11,54 |
| Peça 05 (retry) | 9.367.050 | $5,66 |
| Peça 06 | 35.370.075 | $15,79 |
| Peça 06 (retry) | 117.477.564 | $42,51 |
| Peça 06 (retry 2) | 24.427.331 | $10,46 |
| Peça 07 | 100.567.677 | $36,60 |
| Peça 07 (retry) | 9.664.464 | $4,27 |
| Peça 08 | 42.386.240 | $20,73 |
| Peça 09 | 37.962.521 | $16,79 |
| Peça 09 (retry) | 3.750.762 | $3,02 |
| Peça 09 (retry final) | 82.453.216 | $34,64 |
| Peça 10 | 5.254.818 | $3,95 |
| Peça 10 (retry) | 70.962.960 | $34,07 |
| Peça 11 | 4.875.720 | $3,22 |
| Peça 11 (retry) | 11.519.819 | $5,80 |
| Peça 12 | 1.724.022 | $1,87 |
| Peça 12 (retry) | 84.624.305 | $32,47 |
| Peça 13 | 11.214.936 | $5,76 |
| Peça 14 | 12.081.172 | $6,99 |
| **Total** | **1.047.161.447** | **$456,25** |

As peças 02, 06, 07, 09, 10 e 12 tiveram retries por colisão de dispatch paralelo ou por invenção geográfica detectada na autorevisão — cada retry teve custo pleno porque reprocessou a peça inteira do zero.

### 2.3 Custo total da sessão (contexto — inclui trabalho não relacionado à extração)

Esta mesma sessão também fechou a auditoria de segurança do GUEST e o redesenho de billing/onboarding do TDG Flow. Para transparência total:

| Bloco de trabalho | Tokens | Custo (USD) |
|---|---:|---:|
| Extração WhatsApp (28 agentes) | 1.047.161.447 | $456,25 |
| Segurança GUEST + billing Flow (14 agentes) | 173.746.541 | $71,71 |
| Orquestração da sessão inteira (thread principal) | 427.645.061 | $182,74 |
| **Total da sessão** | **1.648.553.049** | **$710,70** |

> A orquestração (thread principal) não é separável por tarefa porque conduziu ambas as frentes de trabalho ao mesmo tempo — o valor de $182,74 cobre toda a sessão, não só a extração.

---

## 3. Leitura prática

- **Custo real da extração isolada: ~US$ 456**, para transformar 153 mil mensagens de 6 anos de grupo em 3.923 itens estruturados e verificáveis (com autoria e data), prontos para virar base de conhecimento do TDG Flow.
- O maior driver de custo não foi o volume de dados em si, mas os **6 retries completos** (peças 02, 04, 06, 07, 09, 10, 12) — motivados por colisão de dispatch paralelo ou por correção de invenção geográfica. Sem eles, o custo teria ficado bem mais próximo de ~US$ 250–280.
- Nenhum dado foi inventado para caber no orçamento — onde a regra "nunca inferir" exigiu descartar e reprocessar, o reprocessamento foi feito, mesmo custando mais.
