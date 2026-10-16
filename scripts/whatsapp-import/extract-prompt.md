Você vai extrair inteligência de negócio de um trecho do grupo de WhatsApp "TDG - Travel Designers Group" (rede de agências de viagem de luxo brasileiras). Leia o arquivo de entrada INTEIRO (use Read com offset/limit em partes se precisar; ele tem ~1.000 mensagens) e escreva UM arquivo JSON válido no caminho de saída indicado. Não escreva mais nada além desse arquivo.

Formato de cada linha de entrada: `[id] AAAA-MM-DD hora | autor: texto` (mensagens de várias linhas continuam sem prefixo).

## Regra crítica (vale para tudo)
Extraia SOMENTE o que está literalmente escrito. NUNCA infira país, cidade, região, cargo, e-mail, data ou qualquer dado por conhecimento geral. Se o país/cidade não aparece no texto da conversa (na mensagem ou em mensagens vizinhas do mesmo assunto), use null. É melhor um campo null do que um chute. `author` é exatamente o autor da mensagem no arquivo; `date` é a data da mensagem (AAAA-MM-DD). Todo item carrega `msg_ids` (lista dos ids das mensagens de onde saiu).

## O que extrair (4 listas)

1. **reviews** — opinião/experiência em primeira mão (ou feedback de cliente relatado) sobre UM fornecedor específico: hotel, resort, villa, restaurante, beach club, DMC/operadora receptiva, guia, transfer, barco/cruzeiro, lounge, serviço de aeroporto. Inclui "fui e adorei", "cliente reclamou de X", "não recomendo", "quartos pequenos", "serviço impecável", comparações entre dois hotéis (uma review por hotel). NÃO inclui: pergunta sem resposta, menção sem opinião, promoção/tarifa, pedido de contato.
   Campos: `hotel_name` (nome como escrito, sem corrigir), `entity_type` (um de: hotel, beach_club, transfer, guide, restaurant, dmc, other), `text` (a opinião, em português, fiel ao original; pode juntar 2-3 mensagens seguidas do mesmo autor sobre o mesmo lugar), `sentiment` (positive | negative | mixed | neutral), `city_literal`, `country_literal` (só se escrito), `author`, `date`, `msg_ids`.

2. **contacts** — pessoa ou canal comercial com pelo menos um dado de contato (e-mail, WhatsApp/telefone) OU nome + cargo + organização claramente escritos. Campos: `name`, `surname` (null se não houver), `title` (cargo literal), `organization` (hotel/empresa literal), `email`, `whatsapp`, `hotel_name` (igual a organization quando é um hotel/fornecedor; null se for pessoa de agência da própria rede — nesse caso NÃO extraia, membros do grupo não são contatos comerciais), `context` (1 frase: por que foi compartilhado), `author`, `date`, `msg_ids`.

3. **knowledge** — fato, dica ou link reutilizável que NÃO é opinião sobre um fornecedor: regras de visto/documentação, impostos e taxas turísticas, regras de companhias aéreas, como reservar X, prática de operadora/DMC, regra de comissão (ex: "Clara Resorts negocia 12% pro TDG"), golpe/alerta, época boa/ruim pra ir, listas de restaurantes ou passeios recomendados numa cidade (isso vira UM item de conhecimento, não várias reviews), questões fiscais/legais, saúde, seguro, câmbio, aluguel de carro, cruzeiro, esqui, menor desacompanhado, plataformas de reserva, pandemia. Campos: `type` (fact | note | link — link quando a URL é o conteúdo principal), `title` (curto, em português, específico: "Taxa turística de Veneza 2026", não "Dica"), `content` (2-5 frases, fiel ao original, em português), `url` (se houver), `country` (só se escrito), `region` (cidade/região, só se escrita), `tags` (1 a 3, SOMENTE deste vocabulário fixo: hospedagem, vistos-documentacao, passeios-atracoes, restaurantes, comissao, dmc-operadoras, aereo, transfer-transporte, familia-criancas, epoca-viagem, saude, menor-desacompanhado, plataforma-reserva, cruzeiro, seguranca, legislacao-fiscal, esqui, seguro-viagem, cambio-dinheiro, aluguel-carro, golpe, pandemia), `author`, `date`, `msg_ids`.

4. **hotels** — todo fornecedor que apareceu em alguma review ou contato acima (um por nome, como escrito): `name`, `entity_type`, `city_literal`, `country_literal`, `mention_msg_ids`.

## Não extrair
Conversa social, piadas, combinados de reunião do grupo, votações internas, promoções/tarifas de fornecedor (exceto quando viram regra de comissão → knowledge com tag comissao), perguntas sem resposta útil, mensagens só com "obrigada"/"kkk". Membros do grupo (as consultoras/agências) não são contatos.

## Qualidade
Depois de escrever, releia o seu JSON contra o texto de origem em pelo menos 10 itens aleatórios: para cada um confirme que país/cidade só está preenchido se aparece literalmente nas mensagens citadas em msg_ids. Corrija o que não passar. Sem textos genéricos: cada review e cada knowledge precisa ser útil a outra consultora que nunca leu a conversa.

Saída: `{"hotels":[...],"reviews":[...],"contacts":[...],"knowledge":[...]}` — JSON válido, UTF-8, sem comentários, sem markdown em volta.
