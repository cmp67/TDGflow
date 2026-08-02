# Fase 8b — Correções pontuais achadas durante a Fase 8

Não fazia parte do plano original — surgiu de achados ao vivo da Carla enquanto a Fase 8 (busca cruzada) estava em construção. Registrado à parte pra não misturar com o relatório da Fase 8.

## 1. Mais 3 hotéis duplicados

Além dos 29 duplicados achados por colisão de `website_url` (sessão anterior), a Carla reportou visualmente mais 1 (AmaWaterways) e eu rodei uma segunda varredura por similaridade de nome nos 147 hotéis sem `website_url`, achando mais 2 de alta confiança:

- AmaWaterways / AmaWaterways (rio Danúbio) → mesclado
- Casa Lucia / Casa Lúcia (Buenos Aires) → mesclado
- Rocco Forte Verdura / Rocco Forte Verdura Resort (Sicília) → mesclado
- El Palace Madrid (Marriott) / The Palace Madrid → confirmado pela Carla como o mesmo hotel, mesclado (canônico: "The Palace Madrid", 3 reviews vs 1)

Total: 33 hotéis duplicados mesclados nesta sessão (29 + 4). Base de fornecedores: 693 → 652.

## 2. 91 registros de conhecimento + 4 campos de review em inglês

Achado pela Carla via screenshot ("Restaurants in Paraty, RJ"). Investigado: a extração por IA da Fase 5 não normalizou o idioma pra PT-BR quando a mensagem original do WhatsApp misturava inglês (termos do setor, políticas internacionais). 91 de 626 registros de `tdg_destination_knowledge` (14,5%) e 4 campos de `tdg_hotel_reviews` afetados.

Corrigido via tradução por IA (Sonnet, mesmo padrão de lote da Fase 5), preservando fatos/datas/números de lei/valores monetários exatamente. Verificado: 0 casos reais restantes (o que meu filtro ainda aponta depois são falsos positivos — nomes próprios legítimos em inglês, tipo "The Mall" o outlet ou "Turks and Caicos" o lugar).

## 3. Filtro de perfil/região do catálogo — reconstruído

Achado pela Carla via screenshot: os pills de filtro ("Família", "Casais"... e "Algarve"/"Lisboa"/"Maldivas") só funcionavam pros 5 hotéis curados originais.

- **`profiles`** (perfil/vibe): 100% vazio nos 652 hotéis importados — nenhum pipeline anterior produzia esse julgamento editorial. Corrigido com IA digerindo o conteúdo real da base (pedido explícito da Carla: "deixe a IA digerir tudo e sugerir as tags mais de acordo com o conteúdo da base"):
  1. Sonnet leu nome + país + sinais agregados de review (`client_profile`/`must_experience`/`heads_up`) dos 651 fornecedores importados e propôs um vocabulário revisado de 19 tags — não é só o vocabulário antigo com mais itens, é uma revisão fundamentada nos dados reais (achou Safári, Ski & Montanha, Cultural & Histórico, Gastronomia, Wellness & Spa, All-Inclusive, Cruzeiro, Enoturismo/Vinícola — nenhuma inventada, todas correspondem a conteúdo real visto nas reviews).
  2. Haiku classificou os 651 fornecedores nesse vocabulário (1-4 tags cada, batelado 20/lote, concorrência 6) — 631/651 (97%) ganharam pelo menos 1 tag.
  3. Os 5 hotéis curados originais foram remapeados manualmente pro vocabulário novo (ex.: "Urban"→"Urbano/Cidade", "Casais"→"Casais & Lua de Mel", "Resort" removido — não tinha substituto direto no vocabulário novo, coberto por Praia/Villas/Natureza conforme o caso), pra não sobrar dois vocabulários paralelos.
  4. Ícones próprios (SVG stroke-only, regra do design system) adicionados pras 8 tags novas sem ícone; tags renomeadas reaproveitam o path art existente.

- **`region`** (pills de país): lista hardcoded (`['Todos', 'Algarve', 'Lisboa', 'Maldivas']`) trocada por `deriveTopCountries()` — calcula os países mais frequentes do catálogo carregado (client-side, `useMemo`), sempre `'Todos'` primeiro. Filtro trocou de comparar `hotel.region` (granularidade de cidade/estado, inconsistente) pra `hotel.country` (mais confiável — 508 dos 652 importados têm valor real vindo do enriquecimento Google).

## Verificação

- `tsc`: só os 3 erros pré-existentes tolerados
- `vitest`: 243/243
- `next build`: limpo
- Amostra de classificação de profiles conferida manualmente antes de aplicar (10 hotéis aleatórios, todos com classificação plausível — ex.: Club Med Les Arcs → Ski & Montanha + All-Inclusive)
