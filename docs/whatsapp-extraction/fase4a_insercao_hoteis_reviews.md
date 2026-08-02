# Fase 4a — Inserção de Hotéis + Reviews (WhatsApp → produção)

## Status

**Executado em produção, 02/08/2026.** Primeira inserção real de dado do WhatsApp no banco — tudo com `import_approval='pending'`, aguardando aprovação do autor (Fase 6, ainda não construída).

## O que foi inserido

- **685 hotéis novos** em `tdg_hotels` (`origin='whatsapp_import'`, `is_partner=false`) — os hotéis com evidência real de review, canonicalizados na Fase 3 (`fase3_canonicalizacao_hoteis.md`)
- **1.012 reviews individuais** em `tdg_hotel_reviews`, sendo:
  - **984 ligadas a um `hotel_id` real** (975 nos hotéis novos + 9 nos 4 fornecedores já curados que a Fase 3 identificou — ex: "Martinhal Chiado" → `Martinhal Lisboa Chiado`)
  - **28 sem `hotel_id`** (`hotel_name` preservado como texto original) — os casos excluídos/compostos/não-hotel documentados na Fase 3, nada foi descartado

## Como cada review foi processada

- Texto original vira `raw_answers.impressions` (mesmo formato que o formulário do app produz)
- Passa pela mesma extração de IA que uma review nova do app passaria (`highlights`/`client_profile`/`must_experience`/`heads_up`) — usando um prompt adaptado (`buildImportExtractionPrompt`, não o `buildReviewExtractionPrompt` original, que exige `overall_rating` numérico que não existe nos dados do WhatsApp). Mesma garantia de não inverter sentimento, verificada manualmente numa review negativa real (preço "too much" virou ressalva real, não elogio)
- `agent_name` e `agency_name` recebem o autor real extraído (decisão #7 — nunca texto genérico)
- `source_author`/`source_date` sempre preenchidos (decisão #6)
- `status='published'` em todas — são relatos reais de quem esteve lá, não leads de reunião comercial
- `photo_url` sempre `NULL` — nunca foto de banco de imagens (regra já existente, `DicasView.tsx:1760`)
- `import_approval='pending'` em todas — badge cinza na UI até o autor confirmar (Fase 6)

## Execução técnica

- Script standalone (`node`, conexão direta via `POSTGRES_URL`) — não rodou como rota Next.js, recomendação do DBA pro volume (evita timeout de função serverless)
- Resolve-or-create de hotel (mesmo padrão do `api/reviews/route.ts` já em produção)
- Extração de IA em lotes de 8 concorrentes (Claude Haiku) — ~975 chamadas, sem custo real de Lumis (conta roda como admin Bemgsy, acesso ilimitado desde v7.85)
- **Resumível**: a primeira tentativa estourou timeout de 10min do terminal aos 312/1.012; o script foi ajustado pra pular reviews já inseridas (chave: autor+data+texto) e rodou o resto em background sem duplicar nada — verificado.

## Verificação (dupla, antes de reportar)

- Contagem final: 690 hotéis (685 novos + 5 curados), 1.013 reviews (1.012 novas + 1 orgânica pré-existente) — bate exato
- Hotel mesclado na Fase 3 ("1 Hotel South Beach") realmente ficou com as 3 reviews juntas
- Fornecedores curados receberam as reviews certas (Martinhal Lisboa Chiado: 3, Martinhal Sagres: 2, Velaa Private Island: 5)
- Zero review sem autor/data
- Zero `photo_url` preenchido
- Suíte de testes do app rodada de novo — achou 1 teste que dependia de "Martinhal Sagres" nunca ter review (mesma lição do achado de 01/08 com "La Sivoliere") — corrigido pra usar fixture própria, 243/243 passando

## ⚠️ Ponto em aberto pra decidir antes da Fase 6

O selo "Testado pela rede" (verde) em `tdg_hotels`/`tdg_hotel_contacts` é calculado hoje só por `status='published'` — **não olha `import_approval`**. Isso significa: os 685 hotéis novos já aparecem como "Testado" agora, mesmo com as reviews ainda em `pending` (aguardando o autor confirmar). Duas opções:

1. **Manter assim** — visível e "testado" desde já, o badge cinza de "aguardando confirmação" (Fase 6) é só um aviso adicional na review, não muda o status geral do hotel.
2. **Só contar como "Testado" depois de aprovado** — o selo do hotel ficaria correto/conservador, mas os 685 hotéis ficam "aguardando teste" (sem selo verde) até a fila de aprovação (Fase 6) rodar — o que pode levar tempo.

Não decidi isso sozinha — é uma escolha de produto sobre o que "Testado pela rede" deve significar antes da aprovação existir de verdade.
