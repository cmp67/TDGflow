# Fase 4b — Inserção de Contatos Comerciais (WhatsApp → produção)

## Status

**Executado em produção, 02/08/2026.** Dois bugs reais achados na verificação visual pós-inserção, ambos corrigidos direto na base — sem necessidade de reverter e re-rodar tudo.

## O que foi inserido

- **590 linhas inseridas, 1 removida por duplicata exata (ver bug #2) → 589 finais** em `tdg_hotel_contacts`, a partir dos 578 registros consolidados de "Contatos comerciais" do WhatsApp (união de nome normalizado + e-mail/whatsapp — mesma metodologia da deduplicação original), expandidos em 1 linha por vínculo pessoa×hotel
- **114 vinculados a `hotel_id`** real (pessoa trabalha num hotel/fornecedor já no catálogo) → `category='hotel'`
- **475 sem `hotel_id`** (organização em texto livre, ex: "&Beyond", "Andaz Costa Rica") → `category='fornecedor'`
- `source_author`/`source_date` sempre preenchidos (mesma regra da Fase 4a)

## Bugs achados na verificação visual (não reportados pela Carla — achados no autoteste)

### 1. Todo contato aparecia com selo "MÉDICO"

**Causa:** o script de inserção nunca preencheu a coluna `category`. Em `ContatosLensView.tsx`, `getCat()` cai no último item do array `CATEGORIES` quando a categoria não bate com nenhuma conhecida — e por coincidência de ordem, o último item é `médico`. Não é um bug de dado errado, é ausência de dado caindo num fallback que por acaso parecia um dado errado.

**Correção:** categoria automática por vínculo, seguindo a intenção já documentada no próprio componente ("hotel/transfer/hospedagem/fornecedor só existem quando o contato vem vinculado a um fornecedor — categoria automática, nunca escolhida manualmente"):
- `hotel_id IS NOT NULL` → `category='hotel'`
- `hotel_id IS NULL` → `category='fornecedor'`

Aplicado via `UPDATE` direto nas 589 linhas já inseridas (589 atualizadas, 0 erro) e corrigido no script-fonte pra qualquer reinserção futura. Confirmado que bate com a regra nativa do app: `POST /api/hotel-contacts` já faz `finalCategory = category ?? 'hotel'` quando `hotelId` está presente (`route.ts:112`) — o import ficou consistente com o comportamento de um contato criado organicamente.

### 2. Contato "Lu" duplicado (2 cards idênticos)

**Causa:** na consolidação, a Lu tinha 2 grafias do mesmo hotel ("Uxua Casa Hotel" e "Uxua Casa Hotel & Spa") **dentro do mesmo registro mesclado** que resolvem pro mesmo `hotel_id` — o script gerava 1 linha por grafia bruta, não por hotel já resolvido, então duas linhas idênticas (mesmo nome, título, autor, data) foram inseridas a partir de um único registro.

**Verificação de escopo — 2 pares descartados como bug, com evidência da fonte:** rodei uma varredura de linha-inteira-idêntica (nome+sobrenome+hotel_id+título+organização+autor+data) em todos os 590 registros — só "Lu" bateu. Outros 2 pares que pareciam suspeitos à primeira vista (Gabriela Pereira e Gonzalo del Campo, cada um com 2 linhas no mesmo hotel) foram checados direto no `contacts_consolidated.json`: são **registros separados desde a consolidação original** (`group_size: 1` cada, nunca mesclados entre si), não um registro único com variantes de grafia como a Lu. Não têm e-mail/whatsapp em comum entre as duas menções — por isso o algoritmo de união (que só mescla por e-mail/whatsapp normalizado, nunca só por nome, pra não juntar pessoas diferentes por engano) corretamente não os uniu. Gabriela aparece como "Sales Account Manager" em 2021 e "Sales Manager" em 2023 no mesmo hotel (promoção real, mencionada em datas diferentes por autores diferentes/mesmo autor) — mantidos como 2 linhas, não é duplicata de dado, é histórico de 2 menções reais.

**Correção:** removida 1 das 2 linhas idênticas da Lu (590 inseridas → 589 finais). Comentário deixado no script-fonte explicando a regra pra reruns futuros: deduplicar pelo hotel_id **resolvido**, nunca pela string bruta, mas só dentro de um mesmo registro consolidado — nunca forçar merge entre registros que a consolidação original deixou separados.

## Verificação (dupla, antes de reportar)

- Contagem: 589 contatos totais, 114 Hotel + 475 Fornecedor — bate com a soma
- Zero "MÉDICO" na base (checado via SQL e visualmente na tela `/flow/rede?tab=contatos`)
- "Lu" aparece 1 vez só (checado visualmente)
- Suíte de testes do app: 243/243 passando

## O que NÃO foi tocado

Nenhuma mudança em código de app (`ContatosLensView.tsx`, API routes) — os dois bugs eram só de dado de importação, resolvidos com `UPDATE`/`DELETE` diretos na base. Nenhum redeploy necessário.
