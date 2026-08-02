# Deduplicação de Reviews/Opiniões — Extração WhatsApp TDG (2020-2026)
**Data:** 30/07/2026 · **Origem:** `TDG_Flow_Extracao_WhatsApp_2020-2026.md` (seção Reviews e opiniões)
As reviews vêm organizadas por hotel ("### Nome do Hotel (N reviews)"), então o mesmo problema de grafia duplicada dos hotéis se repete aqui — hotéis com nomes diferentes na verdade são o mesmo lugar, e as reviews ficavam espalhadas em seções separadas.

**Status:** documentação/análise apenas — nenhum dado deste arquivo foi inserido no banco ou publicado no TDG Flow.
## Método
1. **Reaproveitei o mapeamento canônico já validado na Fase 1** (deduplicação de hotéis) — aplicado direto aos 760 cabeçalhos desta seção. Resolveu 22 grupos de cara, sem trabalho novo.
2. Dos 760 nomes, **677 não bateram com a lista de hotéis da Fase 1** — são vistas diferentes do mesmo corpus, não 100% sobrepostas (a extração de "hotéis mencionados" e a de "reviews" vieram de passadas diferentes). Rodei o mesmo processo de normalização + fuzzy matching de novo, só nesses.
3. Achado no processo: minha lista de stopwords original ("villa", "palace") estava removendo palavras que às vezes diferenciam hotéis de verdade — ajustei antes de aplicar aqui, e voltei a checar a Fase 1 não foi afetada (nenhum dos merges de lá usava essas duas palavras como diferenciador).
4. Nenhuma review foi perdida — reviews de seções mescladas continuam todas visíveis, só agrupadas sob o nome canônico.

## Resultado
- **Antes:** 760 seções de hotel (1.012 reviews)
- **Depois:** 722 hotéis únicos reais (1.012 reviews, nenhuma perdida)
- **38 seções consolidadas** (22 via mapa da Fase 1 + 16 novas: 10 normalização exata + 6 julgamento manual)
- **2 casos flagados, não mesclados** — ver abaixo

## ⚠️ Casos flagados — não mesclados
- **Barracuda Hotel / Barracuda Villas** — podem ser o mesmo resort (hotel principal vs. villas), ou produtos diferentes — não mesclei
- **Hotel Zagaia Bonito / Pousada Boyrá vs Pousada Boyra (Bonito)** — o nome original já veio como composto ("Hotel Zagaia Bonito / Pousada Boyrá") — provável mistura de 2 propriedades na extração original, não mesclei pra não misturar reviews de hotéis diferentes

## Reviews consolidadas por hotel (ordem alfabética)

### (hotel não identificado) (1 review)
- ⚠️ Alerta geral sobre início de temporada em Mykonos: beach clubs e restaurantes que no ano anterior já estavam abertos em maio, em 2025 postergaram a abertura por causa do clima mais frio (cerca de 16°C vs. média histórica de 24°C na semana), gerando cancelamentos em cima da hora e clientes insatisfeitos. Agente sugere que o mesmo alerta vale para Saint Tropez se o clima não esquentar. _(por Fernanda Balestra, 2025-07-14)_

### 1 Hotel Central Park (1 review)
- ⚠️ pricier option — trendy, very beautiful _(por Fernanda Helou, 2021-05-21)_

### 1 Hotel South Beach (2 reviews)
- ⚠️ Possui quarto com 2 dormitórios, mas preço de R$75 mil para 4 noites foi considerado muito alto ('too much'). _(por Vivi Yuri Agencia, 2022-06-24)_
- Quartos enormes, Perto do W e do SLS, Clima jovem e descolado sem ser pesado _(por Elaine Scanavacca Agencia, 2023-02-08)_

### 1 Hotel South Beach (Miami) (1 review)
- Adora o hotel _(por Elaine Scanavacca Agencia, 2022-01-26)_

### AC Hotel Fort Lauderdale (1 review)
- ⚠️ prometeram quartos conectantes por semanas e só 1 dia antes do check-in informaram que a categoria não tinha; preço igual ao W Fort Lauderdale _(por Humberto Murakami, 2023-07-19)_

### Acqualina Resort (1 review)
- Ótimo para família, sempre fica lá com as kids, Tem kids club _(por Tati Assad, 2023-01-21)_

### Adriana Hvar (1 review)
- ⚠️ Não é super luxo; a ilha não tem opção de super luxo — Considera o melhor hotel de Hvar, Simpático e bem localizado _(por Ana Maria Junqueira, 2022-04-29)_

### AKA Brickell (2 reviews)
- ⚠️ Chuveiro baixo (ruim para pessoas altas); quartos com cozinha são os mais antigos do prédio. — vista bonita a partir do 19º andar, opção budget _(por Fernanda Helou, 2024-02-29)_
- ⚠️ Bem budget segundo colega, para conhecimento geral. _(por Beto Nascimento Flaptur, 2024-02-29)_

### AKA Central Park (3 reviews)
- stayed twice, loved both times _(por Elaine Scanavacca Agencia, 2021-05-21)_
- Ok, mas mais simples que o AKA Times Square _(por Elaine Scanavacca Agencia, 2022-04-21)_
- Adorou a estadia (antes da pandemia) _(por Elaine Scanavacca Agencia, 2022-11-08)_

### AKA Times Square (1 review)
- Super lindo, contemporâneo e chic, Apartamento de 2 quartos, banheiro imenso todo de mármore grafite, 2 andares, janelas anti-ruído, Não sentiu o preconceito que tinha sobre ficar na Times Square _(por Elaine Scanavacca Agencia, 2022-04-21)_

### Alila Napa Valley / Bardessono / The Westin Verasa Napa / Carneros Resort (1 review)
- Alila e Bardessono: ótimos feedbacks, Westin Verasa: suíte 2 quartos atendeu muito bem família, ótimo custo-benefício, Carneros e Auberge: 'foi ótimo' _(por Beto Nascimento / Fernanda Helou / Flaptur, 2023-11-21)_

### Alila Uluwatu (1 review)
- Sempre bons feedbacks nas vendas _(por Fernanda Helou, 2022-09-29)_

### Alila Ventana Big Sur (1 review)
- ⚠️ Fica em frente ao Post Ranch, mas sem vista mar. — Já se hospedou e teve clientes lá recentemente _(por Mafe Caramella, 2023-06-02)_

### Almanac (1 review)
- ⚠️ Reservar com a contato 'Dominique' traz benefícios adicionais, segundo a agente. — Super recomendado pela agente, Considerado lindo e chique por outra agente, mesmo não sendo 'o mais top' de Viena _(por Vivi Yuri Agencia, 2025-07-26)_

### Alpe d'Huez (Club Med) (1 review)
- ✅ Vender Quarto Deluxe para garantir ficar na parte reformada. — ⚠️ Apenas parte do hotel foi reformada. — pistas fáceis chegam no hotel _(por Carol Cordeiro Agencia, 2024-02-26)_

### Alvear Palace Hotel (5 reviews) _(mescladas de: Alvear Palace)_
- ✅ Reservar o andar lounge para cliente exigente — ⚠️ Estilo clássico com carpete nos quartos padrão não agrada a todos os perfis — café da manhã legal, restaurante bom, rooftop e piscina coberta do lounge bacanas _(por Luis Sassi Flaptur / Flaptur, 2024-09-17)_
- ⚠️ zero parceiro de agência; demora muito para liberar comissão; hotel ofereceu condição melhor direto ao cliente prejudicando a comissão da agência (grupo de 14 pax); outro agente relata caso similar com desconto para pagamento direto/cash. Atualização nov/2023: mesmo sendo nominalmente Leading Hotels, não paga comissão e oferece desconto direto ao cliente; administração passou para os filhos dos donos, que 'não entendem zero de hotelaria, só lucro'. _(por Luis Sassi / Mafe Caramella / Flaptur, 2023-11-15)_
- ⚠️ Só os andares 10 e 11 estão reformados; o resto do hotel está péssimo e antigo, gera dor de cabeça. _(por Luis Sassi Flaptur, 2024-07-26)_
- ⚠️ Algumas categorias de quarto/andares estão renovadas, outras não - garantir categoria renovada na reserva — Feedback de cerca de um ano atrás: clientes gostaram bem _(por Beto Nascimento Flaptur, 2026-06-09)_
- ⚠️ Cliente reclamando sem parar, dizendo que o hotel está péssimo (reserva feita por conta própria do cliente, fora da cotação da agência) _(por Fernanda Helou, 2026-06-09)_

### Aman New York (4 reviews)
- Cliente disse ser o melhor hotel em que já ficou na vida, Melhor spa, Não dá vontade de sair do hotel, Localização próxima ao MOMA _(por Mafe Caramella, 2022-11-16)_
- ⚠️ USD 2.300/noite por Jr Suite vista parque, cliente achou que não valeu; hotel ótimo mas 'de cidade', não muito diferente de um Peninsula considerando o preço _(por Elaine Scanavacca, 2023-11-18)_
- ⚠️ Cliente achou que não valia USD 3.000 a diária para Jr Suite ou Suite com vista boa. _(por Elaine Scanavacca (relato de cliente) / Elaine Scanavacca Agencia, 2026-03-05)_
- Tudo incluso dentro do quarto, inclusive álcool, Serviço super discreto mas impecável _(por Patricia Lumy, 2026-03-05)_

### Aman Resorts (Bali) (1 review)
- ⚠️ Achou as propriedades Aman em Bali 'meio antigas' após visitar todas _(por Luis Sassi Flaptur, 2026-06-22)_

### Aman Tokyo (1 review)
- cliente muito exigente disse ser o melhor hotel que já esteve, serviço, acomodação, restaurante e cortesia fantásticos _(por Humberto Murakami, 2024-07-10)_

### Aman Venice (1 review)
- Considerado o mais bonito, por estar instalado em um palácio antigo, George Clooney se casou lá _(por Elaine Scanavacca Agencia, 2022-03-02)_

### Amandari Resort (1 review)
- tudo de bom _(por Elaine Scanavacca Agencia / ES Viagens, 2024-09-02)_

### Amangiri (1 review)
- Cliente que passou o Réveillon lá adorou _(por Luis Sassi Flaptur, 2023-05-02)_

### Amanyara (1 review)
- Agente descreve como 'realmente o paraíso na terra' após FAM Tour exclusivo do TDG, Relato de outro agente sobre a contato local (Mili) que providenciou fotos e cartas surpresa no quarto de hóspedes a pedido da agência, gesto muito elogiado _(por Fernanda Helou, 2025-05-27)_

### AmaWaterways (3 reviews)
- cliente de ~75 anos já fez 3 vezes e amou _(por Fernanda Helou, 2025-10-03)_
- ⚠️ se bem "brifado" pelo agente, pode ser uma viagem muito bacana — gostou, faria de novo _(por Vivi Yuri Agencia, 2025-10-03)_
- ⚠️ relato de duas conhecidas (agentes de outras agências) que fizeram no ano anterior e acharam roteiro ruim e comida horrível _(por Elaine Scanavacca Agencia, 2025-10-03)_

### AmaWaterways (rio Danúbio) (1 review)
- ⚠️ preço por pessoa na cabine mais barata cotado em USD 4.539 (não é tão barato quanto se comenta) — itinerário ótimo, clientes amaram, enviando os próprios pais (72 e 75 anos) _(por Beto Nascimento Flaptur, 2025-10-03)_

### Anantara Maia Seychelles Villas (antigo Maia) (1 review)
- Maravilhoso _(por Humberto Murakami, 2022-12-20)_

### Anantara New York Palace Budapest (2 reviews)
- ⚠️ Já ouviu dizer que os quartos estão precisando de atualização _(por Vivi Yuri Agencia, 2026-06-10)_
- Segundo reunião com o hotel, está reformado, Tem um dos bares mais famosos da cidade _(por Marcia Polacow Agencia, 2026-06-10)_

### Anantara Vilamoura (2 reviews)
- ⚠️ found it a big, cold hotel; only worthwhile for the golf _(por Marcus Carneiro, 2021-05-06)_
- ⚠️ Cliente achou longe e o quarto "parecia um convento"; nao gostou. _(por Elaine Scanavacca Agencia, 2025-03-17)_

### andBeyond Ngala Safari Lodge (1 review)
- amo o Ngala, qualidade excelente de safári, abundância de animais _(por Fernanda Balestra, 2023-11-23)_

### Andronis Arcadia (1 review)
- Clientes amaram o serviço, Super elogiaram _(por Patricia Lumy, 2022-05-03)_

### Antunina (3 reviews) _(mescladas de: Anttunina)_
- clientes amaram _(por Vivi Yuri Agencia, 2024-05-14)_
- amigos foram e amaram _(por Tati Assad, 2024-05-14)_
- ⚠️ Segundo Maria Amelia Agencia, a propriedade não comissiona agências — Tive clientes lá e amaram _(por Virginia Peluffo Menton, 2022-01-10)_

### Arakur Ushuaia Resort & Spa (4 reviews) _(mescladas de: Arakur Ushuaia)_
- Cerro Castor (estação de esqui) fica a cerca de 30 minutos do hotel _(por Ana Maria Junqueira, 2023-03-03)_
- ⚠️ Fica 30-40 min de carro da estação de esqui; não há hotel perto da estação. — eh o melhor da região, vista deslumbrante, restaurante maravilhoso _(por Fernanda Balestra, 2024-05-13)_
- clientes gostam, boas outras atividades além do esqui, ainda mais com criança _(por Tuca Socia Fernanda Helou, 2024-05-13)_
- ⚠️ está isolado — crianças gostam das piscinas externas, vista linda _(por Dani Filippozzi, 2025-10-02)_

### Araras Eco Lodge (1 review)
- ✅ Full-day excursion (about 2h each way) needed to see jaguars. — Sold it, clients loved it _(por Ana Maria Junqueira, 2021-08-12)_

### Arev St Tropez (1 review)
- adorou o hotel, o serviço e o quarto _(por Elaine Scanavacca Agencia, 2025-09-28)_

### Argos in Cappadocia (1 review)
- tenho vendido com sucesso, considerado mais novo que o Museum _(por Vivi Yuri Agencia, 2024-08-06)_

### Armani Hotel Dubai (2 reviews)
- ⚠️ Too dark, lacking personality compared to One&Only. _(por Fernanda Helou, 2021-06-24)_
- ✅ Good if the client wants a very walkable location. — ⚠️ Also disliked the aesthetic. _(por Maria Amelia Agencia, 2021-06-24)_

### Arpoador Hotel (1 review)
- ⚠️ Não reservar a 1ª categoria de quarto - é muito pequena e com teto baixo. _(por Luis Sassi Flaptur, 2023-04-10)_

### Arusha Coffee Lodge (2 reviews)
- ✅ Tour pelos cafezais com visita à produção de colares de miçangas das comunidades locais — Tour pelos cafezais, Visita a comunidades locais fazendo colares de miçangas no próprio hotel, Almoço gostoso _(por Elaine Scanavacca Agencia, 2022-05-21)_
- Cliente gostou da estadia _(por Humberto Murakami, 2022-05-21)_

### Athenaeum Hotel & Residences (2 reviews)
- Bom preço para Londres _(por Tati Assad, 2023-03-07)_
- Localização muito boa _(por Fernanda Helou, 2023-03-07)_

### Atlante Plaza (1 review)
- ⚠️ colchão de algumas unidades é muito mole, causou torcicolo em 2 estadias diferentes — cama boa _(por Humberto Murakami, 2023-12-06)_

### Atlantis Bay (1 review)
- Vendido como categoria 4 estrelas, clientes gostaram _(por Fernanda Credidio Agencia, 2023-01-26)_

### Auberge du Jeu de Paume Chantilly (1 review)
- pax estão amando _(por Elaine Scanavacca Agencia, 2024-07-15)_

### Aurora Anguilla (1 review)
- cliente adorou _(por Patricia Lumy, 2025-10-02)_

### Awasi Atacama / Llao Llao Bariloche (1 review)
- ⚠️ aparentemente nenhum representante cobre esses hotéis atualmente no Brasil; Llao Llao é descrito como 'super chato' para lidar diretamente _(por Fernanda Balestra / Patricia Lumy, 2023-10-30)_

### B2 Hotel (2 reviews)
- ⚠️ Localização não é muito central, precisa pegar o tram — Super gostoso, Super vale o custo-benefício _(por Beto Nascimento Flaptur, 2026-07-07)_
- Clientes hospedados estão curtindo _(por Vivi Yuri Agencia, 2026-07-07)_

### Bab Al Shams Desert Resort (1 review)
- ⚠️ deserto de pedra, não de areia (diferente do Anantara) — passou por reforma recente, está novo, super kids friendly, tem quartos conectados, excelente custo-benefício e pertinho de Dubai _(por Vivi Yuri Agencia, 2025-09-04)_

### Baboon 181 (Babuíno 181) (1 review)
- ⚠️ Serviço meia-boca/básico apesar da boa localização e quarto bom. — localização, quarto bom _(por Fernanda Helou, 2024-02-08)_

### Badrutt's Palace St Moritz (1 review)
- ⚠️ Não é kids-friendly; dress code para jantar pode incomodar até adultos. — luxo, serviço de mordomo _(por Vivi Yuri Agencia, 2024-03-28)_

### Baglioni Hotel Luna (2 reviews)
- ⚠️ Mais caro que Aman e St Regis para o mesmo periodo. — Incrivel, bom custo-beneficio, Atende bem, bem localizado _(por Guilherme Polacow Team Travel, 2025-02-04)_
- Clientes, foi ótimo _(por Juliana Haus 22, 2026-05-14)_

### Baglioni Maldives (1 review)
- estilo clássico italiano, chique, novo, não datado _(por Luis Sassi / Flaptur, 2023-07-17)_

### Bagua Bangalôs (1 review)
- ⚠️ não trabalha com agências, não paga comissão nem para grupos — um dos melhores hotéis da região _(por Fernanda Helou / Fernanda Balestra, 2023-08-30)_

### Baha Mar (1 review)
- ⚠️ Família não conseguiu reservar jantar ao chegar no Réveillon; resolvido via operadora, mas com bastante estresse. Recomenda pré-reservar restaurantes com antecedência. _(por Fernanda Balestra, 2023-04-26)_

### Bahia Vik (2 reviews)
- ⚠️ Incêndio próximo em fev/2023 (relacionado a um local citado como 'La Susana'); hóspedes evacuados/realocados; hotel se comunicou proativamente por escrito em inglês, tranquilizando sobre segurança da equipe. _(por Tuca Socia Fernanda Helou, 2023-02-19)_
- ⚠️ Fica a 5 min de carro do centro, menos central que Playa Vik, mas o agente prefere. — Quartos ótimos _(por Beto Nascimento / Flaptur, 2026-04-20)_

### Bairro Alto Hotel (Lisboa) (3 reviews)
- Ótima localização para quem gosta de agito e andar a pé, próximo ao Chiado _(por Giovana Polotto Agencia, 2022-02-21)_
- Muito bom _(por Claudia Bernardo Six Viagens, 2022-02-22)_
- Ficou lindo depois da reforma _(por Maria Amelia Agencia, 2022-02-22)_

### Banyan Tree Mayakoba (1 review)
- Beach club and overall integration with the beach considered much nicer than Rosewood, cheaper than Rosewood for comparable stay _(por None, 2021-06-23)_

### Baraza Resort & Spa (1 review)
- Client family loved it, personal stay: incredible service, more rustic style _(por Tati Assad, 2021-06-05)_

### Barracuda Hotel (3 reviews)
- ⚠️ Não tem praia de verdade, só uma prainha sem serviço. — Muito vendido, hóspedes acham lindo _(por Humberto Murakami, 2023-01-25)_
- ⚠️ Falta de praia própria é uma pena. — Quarto excelente, Comida boa, Serviço bom, Piscina maravilhosa _(por Fernanda Helou, 2023-01-25)_
- ✅ dia de praia no Beach Club Itacarezinho — ⚠️ não tem praia própria — piscina uma delícia _(por Humberto Murakami, 2023-07-10)_

### Barracuda Villas (1 review)
- ⚠️ não é hotel de praia propriamente - precisa pegar transporte até o beach club — sensacional para casal, vista da praia _(por Danielle Coltro, 2025-09-13)_

### Bastide de Moustiers (restaurante Alain Ducasse) (1 review)
- ⚠️ único item da lista que o pax detestou: comida ruim e restaurante cheio de moscas _(por Elaine Scanavacca, 2023-07-05)_

### Baumanière (2 reviews)
- Charmoso, clientes amaram _(por Humberto Murakami, 2022-04-26)_
- Gostam muito, restaurantes fantásticos _(por Fernanda Credidio Agencia, 2022-04-26)_

### Be Tulum (2 reviews)
- visitou e curtiu, todos os pax que já ficaram lá gostam _(por Fernanda Helou, 2025-10-08)_
- Feedback antigo bom, não recente _(por Fernanda Helou, 2026-05-28)_

### Bel Ami Hotel (3 reviews) _(mescladas de: Bel Ami, Hôtel Bel Ami)_
- ⚠️ Nao vale o preco cobrado; quartos pequenos mesmo em categorias mais altas (2 pax com malas mal cabiam). _(por Beto Nascimento Flaptur / Flaptur, 2025-03-11)_
- excelente, localizacao excelente em Saint-Germain _(por Marcia Polacow / Team Travel, 2021-11-27)_
- Já vendido, bom feedback _(por Fernanda Helou, 2023-02-14)_

### Bela Vista Hotel & Spa (1 review)
- ⚠️ fica em Portimão, que não é a cidade mais bonita do Algarve - alinhar expectativa sobre o entorno — pax amaram, super charmoso _(por Danielle Coltro / Guilherme Polacow / Team Travel, 2023-08-04)_

### Bellevue (1 review)
- Clientes gostaram muito _(por Fernanda Credidio Agencia, 2022-05-16)_

### Belmond Hotel Cipriani (Veneza) (1 review)
- ⚠️ Preciso gostar do estilo mais 'carregado' dos hotéis de Veneza — O mais romântico entre as opções de Veneza, segundo o agente _(por Humberto Murakami, 2022-03-02)_

### Belmond Hotel das Cataratas (4 reviews)
- honored rebooked honeymoon rate with only 10% uplift _(por Elaine Scanavacca Agencia, 2021-03-17)_
- ⚠️ Vale pagar a diferença pelo quarto com vista para as cataratas só se o cliente quiser muito a vista; o tamanho é de um deluxe comum — Ficou em uma Jr Suite, muito espaçosa, com vista para jardins, Não sentiu falta da vista para as cataratas _(por Fernanda Credidio Agencia, 2022-01-17)_
- ✅ Conseguir um quarto onde se escuta o som das cataratas já faz muita diferença, mesmo sem vista direta — Quarto sem vista das cataratas mas com o som, achou maravilhoso e preferiu ao quarto com vista, Recomenda a Junior Pool Suite, que tem plunge pool _(por Ana Roberta Haus 22, 2022-01-17)_
- cliente recente amou, apartamentos renovados _(por Ana Roberta Haus 22 / Haus 22, 2024-08-16)_

### Belmond Maroma (1 review)
- ⚠️ guest got tired of repeating food after 1 week _(por Elaine Scanavacca Agencia, 2021-05-18)_

### Belmond Villa Sant'Andrea / Belmond Grand Hotel Timeo (1 review)
- ⚠️ Timeo considerado velho, precisando de reforma; melhor recomendar o FS Taormina — Sant'Andrea: pax amaram _(por Fernanda Helou / Tati Assad, 2023-07-14)_

### Bless Hotel Madrid (2 reviews) _(mescladas de: Bless Madrid)_
- adoro vender, todo mundo é bem atendido _(por Vivi Yuri Agencia, 2024-07-08)_
- Hotel lindo, valor melhor que outros 5 estrelas do bairro de Salamanca _(por Giovana Polotto Agencia, 2026-05-11)_

### Bless Ibiza (1 review)
- Colocou clientes lá recentemente, sem ressalvas _(por Giovana Polotto Agencia, 2026-05-11)_

### Borgo Bianco Resort and Spa (2 reviews) _(mescladas de: Borgo Bianco)_
- ⚠️ Café da manhã sem finesse (ovo mexido frio, bacon gorduroso); localização isolada, 10 min de Polignano; sem acesso a praia, só vista. — Preço barato, Staff super gentil, Quarto enorme, Piscina linda com vista para o mar _(por Elaine Scanavacca Agencia, 2023-04-25)_
- ⚠️ Café da manhã simples (presunto/queijo cortados grosso, pães meio murchos). Estradinha de terra até chegar, sem nada ao redor, de noite meio estranho/isolado. Nas fotos parece colado à praia, mas não é. Custo-benefício ok, mas sem glamour. — Staff muito gentil, Amenities e cartinha de boas-vindas sem pedir _(por Elaine Scanavacca / Elaine Scanavacca Agencia, 2026-04-15)_

### Borgo Egnazia (2 reviews)
- Super bem localizado, Programação incrível para crianças (7 meses a 17 anos) _(por Elaine Scanavacca Agencia, 2023-04-25)_
- ⚠️ Pagou caro para se hospedar pessoalmente e depois teve dificuldade de revender: a tarifa NET via programa Vita da Leading ficou igual à tarifa do Booking.com, inviabilizando a competitividade da agência. _(por Elaine Scanavacca Agencia, 2023-04-29)_

### Boschendal (1 review)
- adorou, ficou em casa de 4 quartos, fez piquenique no local, pagou early check-in e o café da manhã foi servido na varanda _(por Elaine Scanavacca Agencia, 2025-10-06)_

### Botanique (1 review)
- ⚠️ Achou a comida inferior à do Ronco do Bugio _(por Tuca Socia Fernanda Helou, 2022-04-29)_

### Botswana (Wilderness lodges, janeiro) (1 review)
- ⚠️ Cliente viu apenas 1 leão em 6 dias de safári em 3 lodges diferentes em janeiro; enviou carta formal de reclamação; janeiro não é boa época para game viewing _(por Fernanda Balestra / FB Travel, 2024-10-23)_

### Brisas do Espelho (1 review)
- Beautiful property _(por Danielle Coltro, 2021-08-25)_

### Brown's Central (1 review)
- ⚠️ Boa opção para cliente que não quer investir muito e não é muito exigente. — Boutique charmoso, Bem localizado, Quartos pequenos mas bem decorados _(por Giovana Polotto Agencia, 2023-03-20)_

### Brown's Hotel (2 reviews)
- Pax amaram _(por Fernanda Helou, 2023-02-15)_
- ⚠️ Decoração 'pesada', tem gente que não gosta. _(por Tuca Socia Fernanda Helou, 2023-02-15)_

### Brown's Hotel (Londres) (2 reviews)
- Hotel charmoso, com um bar maravilhoso (na época em que se hospedou, há um tempo) _(por Danielle Coltro, 2022-01-24)_
- ⚠️ Cliente relatou hotel muito caído/desatualizado atualmente; suíte com apenas um banheiro e decoração datada; diferente de quando o agente se hospedou antes, quando tinha charme _(por Luis Sassi Flaptur, 2022-01-24)_

### Bulgari Hotel London (1 review)
- ⚠️ Avaliação por fotos (não estadia própria, a pedido de um cliente): quartos e banheiro meio 'feinhos'/datados. _(por Luis Sassi Flaptur, 2023-02-15)_

### Bulgari Resort (1 review)
- Chegada descrita como maravilhosa, Vista de tirar o fôlego _(por Elaine Scanavacca Agencia, 2022-09-29)_

### Bulgari Resort Bali (2 reviews)
- ⚠️ Acesso à praia por escadaria extensa _(por Elaine Scanavacca Agencia / ES Viagens, 2024-09-02)_
- O melhor da região, mas fica no penhasco, Tem teleférico para a praia _(por Renata Levorin Agencia, 2026-06-22)_

### Byblos St Tropez (1 review)
- Adorou a experiência _(por Humberto Murakami, 2023-05-29)_

### Ca di Dio (3 reviews)
- ⚠️ Pax ficou 3 noites e amou. — Design assinado por Patricia Urquiola, Moderno e com preço competitivo, Reservado via consolidadora 'Selections', mais barato que no Booking.com _(por Elaine Scanavacca Agencia, 2023-01-24)_
- ⚠️ Fica a 10 min a pe da Piazza San Marco (nao esta na piazza). — Ambiente fresh/novo/iluminado, Instalado numa antiga igreja _(por Fernanda Balestra, 2025-02-04)_
- Sempre bons feedbacks _(por Juliana Haus 22, 2026-05-14)_

### Cabanas Chapeu de Palha (1 review)
- ⚠️ Does not commission agencies; requires a client fee. — Surreal view, charming rustic cabins, good restaurants nearby _(por Fernanda Helou, 2021-05-23)_

### Cadillac Hotel & Beach Club Miami Beach (1 review)
- pé na areia, piscina boa, quartos reformados e enormes, bom para família _(por Fernanda Credidio Agencia, 2024-07-12)_

### Caesar Augustus Hotel (1 review)
- ⚠️ considerado mais 'classudo' (formal/chique) que outras opções de Capri — cliente gostou _(por Tuca / Fernanda Helou, 2024-01-08)_

### Campo Bahia Hotel Villas Spa (1 review)
- ✅ reservar a casa toda para famílias grandes — ⚠️ vilarejo minúsculo (fica preso ao hotel); serviço de praia um pouco lento na última visita; sem super kids club nem programação infantil fora de feriados — praia maravilhosa (Santo André), foi 3 vezes e ama, comida do restaurante é bem boa _(por Fernanda Balestra, 2023-11-28)_

### Campo Baía (1 review)
- ⚠️ Não tem muita distração tipo kids club, os pais têm que curtir os filhos — Pax gostou bem mais do que da opção anterior (praia cheia) _(por Elaine Scanavacca Agencia, 2022-04-25)_

### Can Cera Hotel (1 review)
- ⚠️ Sem acesso de carro no centro histórico de Palma; clientes reclamaram apesar do aviso prévio — Hotel lindo _(por Fernanda Balestra, 2026-06-21)_

### Canaves Oia (1 review)
- A que mais remete à cara clássica de Santorini, Quartos e piscinas debruçados no penhasco _(por Guilherme Polacow Team Travel, 2023-05-30)_

### Canto do Irere (1 review)
- Clients loved it _(por Ana Terra, 2021-05-23)_

### Cap Estel (1 review)
- Vendido com sucesso (via representante Passion) _(por Marcia Polacow Agencia, 2026-06-25)_

### Cap Juluca, A Belmond Hotel / Four Seasons Resort Anguilla (1 review)
- ⚠️ FS é mais para quem quer 'ver e ser visto' — Belmond é 'surreal'/'um escândalo' de bom, FS já vendido para família que amou _(por Tati Assad / Fernanda Credidio / Humberto Murakami, 2023-11-01)_

### Capella Singapore (1 review)
- ⚠️ Localização em Sentosa é ruim, fica longe para passear em Singapura. _(por Elaine Scanavacca Agencia, 2024-04-08)_

### Caresse Hotel Luxury Collection Bodrum (1 review)
- muito bom pelo custo (custo-benefício) _(por Beto Nascimento Flaptur, 2025-10-04)_

### Carmel Charme Resort (1 review)
- Preço bom, conseguiu negociar um pouco _(por Humberto Murakami, 2026-07-21)_

### Carmel Cumbuco (1 review)
- mais econômico da rede Carmel, estilo família _(por Dani Filippozzi, 2025-10-20)_

### Carmel Cumbuco / Carmel Charme (1 review)
- ⚠️ praia com bastante pedra e concha, levar sapatinho de água — Cumbuco: bem bacana para família, Charme: mais sofisticado _(por Luis Sassi / Bia Parra / Flaptur, 2024-01-07)_

### Carmel Taiba (1 review)
- Bom feedback recente _(por Fernanda Helou, 2026-06-22)_

### Carmel Taíba / Kenoa Resort (1 review)
- ⚠️ Taíba: praia de pedras, sem areia, foco no hotel; Kenoa: praia de areia mas mar agitado, estrutura do hotel pequena, mais indicado para casal que vai curtir o quarto _(por Tuca / Beto Nascimento / Tati Assad / Humberto Murakami / Fernanda Helou / Flaptur, 2023-12-11)_

### Casa Alma (Garopaba) (1 review)
- Casa/pousada bem legal e bem linda, Café servido cheio de produtos locais e produzidos por eles, muito gostoso, Diária média de R$ 1.350, Bem exclusivo _(por Giovana Polotto Agencia, 2022-03-03)_

### Casa Barra Brava (1 review)
- Pousada bem charmosa (hospedagem de anos atrás) _(por Giovana Polotto Agencia, 2022-01-18)_

### Casa Brasileira (1 review)
- vendeu um casal recentemente _(por Danielle Coltro, 2025-09-13)_

### Casa de Santo Antônio (1 review)
- ⚠️ não é mega luxo; não fica de frente para a praia — gostei muito, super charmoso _(por Bia Parra, 2023-12-18)_

### Casa Di Sirena (2 reviews) _(mescladas de: Casa di Sirena)_
- family with children liked it a lot, 2-bedroom suite worked well _(por Fernanda Credidio Agencia, 2021-02-23)_
- ⚠️ Serviço ainda a melhorar — gentil mas fraco. 'Gostei com ressalvas.' — estrutura linda _(por Elaine Scanavacca / ES Turismo, 2021-11-30)_

### Casa di Sirena (Ilhabela) (1 review)
- Bem legal pelo valor (bom custo-benefício) _(por Maria Amelia Agencia, 2022-02-08)_

### Casa do Benchimol (1 review)
- 'Super achado' para feriados, Já foi e super recomenda _(por Luis Sassi Flaptur, 2026-06-16)_

### Casa dos Arandis (1 review)
- ✅ walking the beach — ⚠️ no pool on site — loved it, beach-focused _(por Elaine Scanavacca Agencia, 2021-02-23)_

### Casa Grande Hotel (Guarujá) (2 reviews)
- Estava muito bom (antes da pandemia), Comida ok: buffet no almoço e à la carte no jantar _(por Elaine Scanavacca Agencia, 2022-03-14)_
- ⚠️ Parou de vender o hotel porque eles oferecem valor menor direto ao cliente; em um caso ofereceram 35% de desconto diretamente ao cliente e recusaram honrar o mesmo valor via agência, dizendo que via agência o preço seria cheio _(por Humberto Murakami, 2022-03-14)_

### Casa Grande Hotel Resort & Spa (2 reviews) _(mescladas de: Casa Grande)_
- Simples, muito gostoso e super bem localizado, Apartamento de 3 quartos com cozinha completa _(por Beto Nascimento / Flaptur, 2026-02-12)_
- ⚠️ offered client 45% below site price directly with zero agent commission, despite prior standing commission arrangement via Preferred Hotels _(por Humberto Murakami, 2021-02-03)_

### Casa Lucia (1 review)
- ⚠️ Sofreu incêndio em julho/2024 com 14 feridos; serviço muito ruim, café da manhã fraco, concierge fraco, equipamentos quebrados incluindo telefone, recepção confusa, cliente se sentiu roubada por golpe de táxi pedido via concierge — quarto era bom _(por Maria Amelia Agencia / H3R Viagens, 2024-09-19)_

### Casa Lúcia (Buenos Aires) (3 reviews)
- ⚠️ Feedback de cliente: quartos sem charme, entrada bonita mas quarto comparado a um 'flat de Londrina'. _(por Luis Sassi Flaptur, 2024-05-07)_
- ✅ Pedir ajuda do concierge para reservas de restaurante difíceis. — ⚠️ Alinhar bem expectativa sobre o quarto (é um boutique). — localização na rua mais bonita de Buenos Aires, concierge excelente, clientes exigentes amaram _(por Fernanda Balestra, 2024-05-07)_
- ⚠️ Feedback muito negativo: serviço muito ruim, café da manhã fraco, concierge pouco útil ('eu sei mais que ele'), quartos com equipamentos quebrados. _(por Maria Amelia Agencia, 2024-07-26)_

### Casa Maitei (Trancoso) (1 review)
- ⚠️ Não é econômico — Pé na areia _(por Humberto Murakami, 2022-01-14)_

### Casa Malca (9 reviews) _(mescladas de: Casa Maca)_
- Restaurante muito bom _(por Fernanda Credidio Agencia, 2026-07-03)_
- ⚠️ Rooms have mold/humidity issues, poor ventilation, unusual and slightly scary decor (including hanging vintage wedding dresses), cats roaming the property; only for a very specific, well-briefed client profile. — Great food across all restaurants, fun/unique art-driven common areas _(por Fernanda Helou, 2021-07-01)_
- ⚠️ Guest asked to leave immediately due to a heavily moldy room and decor that frightened her children. _(por Luis Sassi Flaptur, 2021-07-22)_
- ⚠️ Guest asked to leave mid-quarantine stay over a moldy, TV-less room; operator recovered a partial refund and rebooked her elsewhere. _(por Elaine Scanavacca Agencia, 2021-07-22)_
- ⚠️ hotel caído, quartos esquisitos com cheiro de mofo (visita em 2020); feedbacks mistos de clientes, público mais jovem tende a gostar mais — restaurantes são bons _(por Fernanda Helou, 2025-10-08)_
- ⚠️ achou o hotel "bem maluco", não gostou (visitou durante a pandemia) _(por Ucha Verissimo Agencia, 2025-10-08)_
- ⚠️ fica mais longe da "muvuca" (agito) — estilo diferente, com cortinas de veludo, ótima localização na praia _(por Dani Filippozzi, 2025-10-08)_
- ⚠️ decoração não agrada a todos - gosto é gosto — já tiveram um cliente que amou _(por Tuca Socia Fernanda Helou, 2025-10-08)_
- ⚠️ Ficou hospedada e não gostou. _(por Fernanda Helou, 2026-02-19)_

### Casa Sur Palermo (1 review)
- ⚠️ não é boutique/romântico apesar do nome sugerir isso; tem prédios no entorno — confortável, piscina muito boa, parecida com a do Copacabana Palace _(por Pedro Alvarenga / Irmao Scanavacca, 2023-12-05)_

### Casa Turquesa (1 review)
- ⚠️ a experiência dependia de uma funcionária específica (Tete) que talvez não trabalhe mais lá — pequena e charmosa (petit), café da manhã com muito capricho _(por Dani Filippozzi, 2025-11-30)_

### Casana (2 reviews)
- Muito maravilhoso, super exclusivo, Atendimento mega personalizado _(por Juliana Haus 22, 2022-04-13)_
- Clientes exigentes amaram _(por Ana Maria Junqueira, 2022-04-13)_

### Casasur Bellini Hotel (2 reviews)
- ⚠️ não é hotel de luxo, mas confortável; alinhar expectativa com o passageiro — moderno, grande, piscina no meio do prédio, localização perto do zoológico _(por Pedro Alvarenga Irmao Scanavacca, 2025-12-12)_
- quarto espaçoso e confortável, bom café da manhã, piscina boa, bom custo-benefício _(por Vivi Yuri Agencia, 2025-12-12)_

### Castello del Nero (Toscana) (1 review)
- 3º lugar entre 3 hotéis visitados na Toscana, segundo a agente _(por Elaine Scanavacca Agencia, 2022-03-03)_

### Castello di Casole (Toscana) (1 review)
- 2º lugar entre 3 hotéis visitados na Toscana, segundo a agente _(por Elaine Scanavacca Agencia, 2022-03-03)_

### Castello di Reschio (3 reviews)
- clientes super exigentes amaram muito, lugar surpreendente _(por Fernanda Helou, 2024-04-05)_
- ⚠️ na chegada ainda não tinha como avaliar o serviço — um dos hotéis de campo mais lindos que já visitou _(por Ucha Verissimo Agencia, 2025-10-08)_
- o hotel mais maravilhoso que já foi _(por Fernanda Helou, 2025-10-08)_

### Castiglion del Bosco (Toscana) (1 review)
- Favorito pessoal, 1º lugar entre 3 hotéis visitados na Toscana _(por Elaine Scanavacca Agencia, 2022-03-03)_

### Cavallino Bianco / Biancaneve (1 review)
- ⚠️ Nao trabalha com agencia nem operadora, comissiona so 5% direto. — Familias que iam ao Club Med migraram para ca e adoraram _(por Maria Amelia Agencia, 2025-03-06)_

### Chable Maroma (2 reviews) _(mescladas de: Chablé Maroma)_
- ⚠️ Nothing for kids. — Great for couples wanting to relax, not a party crowd, good food, marvelous spa _(por Ucha Verissimo Agencia, 2021-05-25)_
- ⚠️ beach has seaweed (cleared daily); nothing for kids; only 2 restaurants + 1 bar — great accommodation, amazing spa, very good service _(por Ucha Verissimo Agencia, 2021-05-18)_

### Chable Yucatan (4 reviews) _(mescladas de: Chablé Yucatán)_
- Marvelous, loved it, plans to return _(por Ucha Verissimo Agencia, 2021-05-25)_
- ⚠️ Sargassum smell was still strong on the beach. — Very good hotel, modern and relaxed _(por Fernanda Helou, 2021-06-20)_
- ✅ Spa with a view of the property's own cenote (guests cannot enter the cenote itself). — ⚠️ Very wild setting, occasional wildlife (frogs) in rooms. — Unlike anything seen before, real fireflies on the lawn, huge villas with private pools, outstanding staff (Osmar), excellent fresh gastronomy _(por Fernanda Helou, 2021-07-01)_
- ⚠️ Há sapos na propriedade/quartos; a gerência já teve que retirar sapos de dentro do quarto durante a madrugada. _(por Fernanda Helou, 2022-10-04)_

### Charme (1 review)
- Praia boa, Clientes adoraram _(por Humberto Murakami, 2023-03-20)_

### Chateau de la Gaude (Aix-en-Provence) (1 review)
- Relativamente perto de Montpellier/Barcelona, Pax adoraram _(por Marcia Polacow Agencia, 2022-01-14)_

### Chetzeron (1 review)
- ⚠️ Dúvida se é seguro ir de noite a um restaurante e voltar; só oferecido se o cliente pedir por já ter visto em fotos. — Vista linda, no meio da montanha _(por Elaine Scanavacca Agencia, 2022-07-07)_

### Cheval Blanc (Maldivas) (1 review)
- Considera, sem dúvida, o melhor hotel de Maldivas _(por Ucha Verissimo Agencia, 2023-05-13)_

### Cheval Blanc Randheli (2 reviews)
- ⚠️ not confirming reservations at the time — regarded as top for kids _(por Ucha Verissimo Agencia, 2021-03-23)_
- ⚠️ Estilo mais formal (mordomo fala francês). _(por Tati Assad, 2024-04-26)_

### Cheval Blanc St-Barth Isle de France (1 review)
- ⚠️ Não recomendado para crianças pequenas: desnível na areia entre o hotel e o mar, risco de queda ao carregar a criança. _(por Humberto Murakami, 2022-09-26)_

### Château d'Artigny & Spa (1 review)
- ⚠️ Evento realizado em 2010. Quartos com estilo antigo — Buy-out de 90 pessoas por 3 dias, grupo amou _(por Elaine Scanavacca Agencia, 2022-03-24)_

### Château de Fonscolombe (1 review)
- Lindo _(por Laryssa Siqueira Trivia, 2023-04-25)_

### Château de la Chèvre d'Or (1 review)
- jardins espetaculares, considerado museu ao ar livre _(por Luis Sassi / Flaptur, 2023-07-03)_

### Château Frontenac (1 review)
- Clientes recentes, estadia tranquila, tudo ok _(por Giovana Polotto Agencia, 2022-05-17)_

### Club Med (Suíça, St. Moritz) (1 review)
- ⚠️ Agente não recomenda; considera a unidade antiga/desatualizada. _(por Humberto Murakami, 2025-08-05)_

### Club Med Alpe d'Huez (1 review)
- ⚠️ Visitou em janeiro de 2022. — Para crianças não tem erro, a criançada amou _(por Fernanda Balestra, 2022-03-17)_

### Club Med Grand Massif (1 review)
- ⚠️ poucas pistas de ski; fica perto de Genebra, sempre lotado com fila grande nos lifts; construído em desnível - quartos mais afastados exigem pegar vários elevadores, reclamação recorrente — hotel novo _(por Luis Sassi / Carol Cordeiro / Flaptur, 2023-07-17)_

### Club Med La Plagne 2100 (2 reviews)
- ⚠️ Não tem piscina; não tem monitoramento/baby club para menores de 2 anos — Área esquiável Paradiski excelente _(por Maria Amelia Agencia, 2022-03-17)_
- Área esquiável Paradiski excelente, Estrutura montada para crianças do lado de fora, parecia legal, Village foi totalmente reformado _(por Marcia Polacow Agencia, 2022-03-17)_

### Club Med Lake Paradise (1 review)
- ⚠️ family reported it dirty, worn-out, broken floor; had to change rooms at 6pm _(por Elaine Scanavacca Agencia, 2021-01-20)_

### Club Med Les Arcs (2 reviews)
- ⚠️ quoted price rose from R$39,000 to R$47,000 overnight due to unstable pre-pricing system _(por Elaine Scanavacca Agencia, 2021-03-25)_
- ⚠️ Surto de virose (norovírus) há cerca de 3 semanas sem conseguirem estancar; quase todo o grupo de 29 pessoas teve vômito ou diarreia; jacuzzi/piscina externa quebrada há um mês sem reparo; serviço considerado péssimo. _(por Luis Sassi Flaptur, 2023-01-24)_

### Club Med Les Arcs Panorama (1 review)
- Cliente gostou muito, Tudo novinho, Pistas consideradas melhores que as de La Plagne por quem já esquia bem _(por Bia Parra, 2022-03-17)_

### Club Med Peisey Vallandry (2 reviews)
- ⚠️ Não tem spa nem piscina; é um dos villages mais antigos; voltado para quem realmente gosta de esquiar — Fica na área de Ski Paradise, maior área esquiável da Europa, Clientes do mês anterior amaram, curtiram várias pistas _(por Fernanda Credidio Agencia, 2022-03-17)_
- Quem gosta de esquiar bem ama, por ser mais tradicional, 'de madeirinha', sem cara de resortão _(por Maria Amelia Agencia, 2022-03-17)_

### Club Med Pragelato Sestriere (1 review)
- ⚠️ Feedback de cliente ('Petry'): achou sofrido, bem cansado, comida média. _(por Fernanda Credidio Agencia, 2023-03-15)_

### Club Med Seychelles (1 review)
- ✅ Passeios de barco (extra), centro de mergulho. — muito legal, 2 praias, villas com piscina privativa, tartarugas gigantes residentes _(por Beto Nascimento Flaptur, 2024-05-03)_

### Club Med Trancoso (1 review)
- ⚠️ Cliente reclamou de quarto com cheiro de mofo, muita gente e muita fila _(por Danielle Coltro, 2022-01-14)_

### Club Med Val d'Isère (1 review)
- ⚠️ Antes da temporada 2023 a oferta de monitoramento para crianças era limitada; mudou nessa temporada (agora atende menores de 12 anos). — Casal com filho de 11 anos gostou muito, Conseguiu aula particular de ski para o filho _(por Elaine Scanavacca Agencia, 2023-03-15)_

### Club Med Valmorel (2 reviews)
- ⚠️ Resort não é dos mais novos (estrutura mais antiga); comida é mediana — Excelente para todas as idades, Instrutores ótimos, crianças amando, Vila bonitinha, piscina enorme, programação de entretenimento vasta, Vale muito para uma primeira experiência de Club Med _(por Fernanda Credidio Agencia, 2022-03-17)_
- ⚠️ Sem touca de banho, só shampoo 2 em 1, precisou insistir para conseguir água no quarto, buffet varia de médio a bom, funcionários pareciam cansados, restaurante à la carte sem falantes de inglês, mesma música tocando o dia todo no bar. _(por Juliana Haus 22, 2023-01-24)_

### Comandatuba (2 reviews)
- ⚠️ Lost a ~R$60k sale after the operator gave the client an 8% direct discount, undercutting the agency price. _(por Luis Sassi Flaptur, 2021-08-24)_
- ⚠️ Cliente relatou que o hotel está velho e precisando urgente de reforma; vão reformar a piscina em abril e precisa reformar os quartos — Melhor em comida e frequência (comparado ao Salinas, segundo outro relato) _(por Humberto Murakami, 2022-01-14)_

### COMO Castello del Nero (1 review)
- ⚠️ Não gostou do hotel; considera a localização (muito perto de Florença) não ideal para a experiência de Toscana. _(por Elaine Scanavacca Agencia, 2024-04-05)_

### COMO Castello del Nero / Castel Monastero (1 review)
- ⚠️ Castello del Nero: pax gostaram mas acharam quartos muito simples; agente pessoalmente não gostou muito — Castel Monastero: pax adorou _(por Fernanda Helou / Elaine Scanavacca, 2023-10-20)_

### Condes de Barcelona (1 review)
- ✅ Vender a categoria presidencial. — ⚠️ Feedback dos clientes foi apenas médio. — hotel lindo _(por Fernanda Helou, 2024-07-08)_

### Conrad New York Midtown (2 reviews)
- Pax (3 amigas) pediu e adorou a suíte _(por Elaine Scanavacca Agencia, 2022-01-21)_
- Pax gostou, Reconhecido pela Condé Nast como um dos melhores de Nova York _(por Elaine Scanavacca Agencia, 2023-03-06)_

### Conrad Osaka (1 review)
- ⚠️ Hotel velho, serviço deixa a desejar, limpeza fraca; café da manhã com cheiro de refeitório, a família parou de tomar café da manhã lá. _(por Humberto Murakami, 2024-07-10)_

### Conrad Tulum Riviera Maya (1 review)
- praia incrível, hiper tranquila e super gostosa, tem kids club e teens club com atividades diárias _(por Humberto Murakami, 2023-10-30)_

### Conservatorium Amsterdam (1 review)
- ⚠️ não é escolha para clientes de hotel clássico; alguns quartos são duplex (2 andares) — amei ficar lá, recebe famílias mesmo sem ser o perfil _(por Vivi Yuri, 2023-07-19)_

### Conservatorium Hotel (2 reviews)
- melhor check-in da minha vida, perto de museus e lojas de luxo _(por Marcus Carneiro, 2021-10-13)_
- ⚠️ Serviço é ruim; sempre recebeu reclamação de clientes. — hotel demais _(por Mafe Caramella / High End Travels, 2021-10-13)_

### Constance Lemuria (2 reviews)
- Clientes em lua de mel adoraram, Ótima recepção, Tarifa com meia pensão vale muito a pena _(por Fernanda Credidio Agencia, 2022-12-20)_
- Ótimo custo-benefício, Ilha (Praslin) considerada mais bonita que Mahé, Boa base para passeios a outras ilhas _(por Fernanda Credidio Agencia, 2022-12-20)_

### Convento do Espinheiro (1 review)
- ⚠️ Acha um pouco velho/desatualizado — É bom _(por Giovana Polotto Agencia, 2022-04-25)_

### Copacabana Palace (1 review)
- ⚠️ Piscina fica fechada de junho a setembro. _(por Elaine Scanavacca Agencia, 2025-03-13)_

### Corpo Santo (Lisboa) (1 review)
- Clientes adoraram; boa localização, próximo ao Bairro Alto/Chiado _(por Carol Cordeiro Agencia, 2022-02-21)_

### Corpo Santo Hotel (1 review)
- Cliente amou, Funciona bem para família de 2 adultos e 2 crianças _(por Humberto Murakami, 2022-04-11)_

### Correntoso Lake & River Hotel (1 review)
- ⚠️ Não serve bem para esquiar em Bariloche (fica longe); serve para esquiar em Villa La Angostura — Ótimo _(por Humberto Murakami, 2022-05-09)_

### Correntoso Lake & River Hotel (Villa La Angostura) (1 review)
- ⚠️ É um 4 estrelas com nível de serviço de 3 estrelas; já está bem antigo — Maravilhoso, todo cliente adora, Bom para famílias _(por Humberto Murakami, 2022-03-10)_

### Cosme Hotel (1 review)
- Fica na frente da praia _(por Humberto Murakami, 2023-04-21)_

### Country Club Lima Hotel (1 review)
- clientes 'top' amaram (2 agências confirmam) _(por Marcia Polacow / Ana Roberta / Haus 22, 2023-08-16)_

### Cour de Loges (1 review)
- ⚠️ Hotel super estranho: banheiro em cubo de vidro no meio do quarto sem blindagem (problemático com filho); melhor quarto do hotel tinha cama redonda e muito veludo bordô, 'parecia um bordel'. Optou por outro hotel para o cliente. — localizacao otima _(por Elaine Scanavacca / ES Turismo, 2021-09-28)_

### Crans Ambassador (1 review)
- ⚠️ Fica em Montana, um pouco longe do centrinho de Crans. — Gostou ao vender _(por Elaine Scanavacca Agencia, 2022-07-07)_

### Crowne Plaza HY36 Midtown (1 review)
- ⚠️ Não recomendado para triplo/quádruplo (fica apertado). — Excelente para 2 pessoas, Banheiro/chuveiro excelentes, Café da manhã muito bom (pago à parte), Staff atencioso, Conseguiu early check-in e late check-out, Ótimo custo-benefício _(por Vivi Yuri Agencia, 2023-02-27)_

### Crystal Cruises (1 review)
- serviço excelente, adorou a viagem e o roteiro _(por Elaine Scanavacca Agencia, 2025-10-03)_

### Curaçao Marriott Beach Resort (2 reviews)
- Hotel grande ('maiorzão'); clientes que se hospedaram gostaram _(por Fernanda Credidio Agencia, 2022-09-02)_
- ⚠️ Amigos do setor (JC Travel) se hospedaram e disseram que é bem fraco _(por Humberto Murakami, 2026-07-16)_

### Delano South Beach (1 review)
- Liked the stay, excellent rate at the time _(por Humberto Murakami / 2019, 2021-06-08)_

### Desert Luxury Camp (1 review)
- Está demais, amou _(por Danielle Coltro, 2022-05-11)_

### Disney's Grand Floridian Resort & Spa (2 reviews) _(mescladas de: Disney's Grand Floridian Resort)_
- ⚠️ Zero servico personalizado, lobby caotico, dificil reservar restaurantes; sem nada a ver com a experiencia do Four Seasons Orlando. _(por Tati Assad, 2025-03-17)_
- ⚠️ está em reforma, com barulho de obra em todo o hotel, inclusive no lobby, mas continua funcionando _(por Laryssa Siqueira / Trivia, 2023-09-11)_

### Disney's Yacht Club Resort (1 review)
- Lobby menos caotico que o Grand Floridian _(por Tati Assad, 2025-03-17)_

### Domaine de Manville (1 review)
- Um charme, ótimo para famílias _(por Fernanda Credidio Agencia, 2022-04-26)_

### Domaine des Hauts de Loire (2 reviews)
- ⚠️ Era um Relais & Châteaux; agente não sabe como está atualmente (visitou há bastante tempo) — Muito bacana, boutique charmoso _(por Marcia Polacow Agencia, 2022-03-24)_
- ⚠️ Visita da sobrinha em setembro de 2021. — Sobrinha da agente adorou, Restaurante gastronômico muito bom, É Relais & Châteaux _(por Elaine Scanavacca Agencia, 2022-03-24)_

### Don Pedro Laguna (1 review)
- ⚠️ Agent asked the group whether anyone had sold it or had feedback; question went unanswered in the thread. _(por Juliana Haus 22, 2021-06-09)_

### Douro41 (1 review)
- ✅ room with a balcony in summer — beautiful hotel, good budget alternative to Six Senses Douro _(por Guilherme Polacow Team Travel, 2021-05-21)_

### Dpny (1 review)
- ⚠️ Dono fala mal de agências para os hóspedes; boicotado pelo grupo há anos; não paga comissão _(por Guilherme Polacow Team Travel / Team Travel, 2024-11-18)_

### DPNY Beach Hotel (1 review)
- ⚠️ Does not pay commission; the owner is described as erratic. _(por Patricia Mil Homens Agencia, 2021-08-02)_

### Dreamcastle Hotel (2 reviews)
- ⚠️ Ficou hospedada e não gostou _(por Ana Roberta Haus 22, 2026-06-16)_
- ⚠️ Não recomenda _(por Laryssa Siqueira Trivia, 2026-06-16)_

### Dusit Thani (1 review)
- ⚠️ Não é top — Clientes adoram, ótimo custo-benefício _(por Fernanda Credidio Agencia, 2026-06-15)_

### Earth Lodge (Sabi Sabi) (1 review)
- O mais indicado para lua de mel, com certeza _(por Humberto Murakami, 2023-06-10)_

### Edition Barcelona (1 review)
- Visitou com Marcus Carneiro e adoraram _(por Fernanda Balestra, 2022-01-06)_

### Edition Madrid (1 review)
- cliente hospedado atualmente está adorando _(por Marcia Polacow, 2023-09-05)_

### El Fenn (1 review)
- charme _(por Vivi Yuri Agencia, 2024-02-07)_

### El Fuerte (Preferred Hotels) (1 review)
- ⚠️ Quarto grande e correto, mas sem charme (tipo Comandatuba). Não sabe se é 4 ou 5 estrelas. — Áreas comuns muito boas _(por Elaine Scanavacca / Elaine Scanavacca Agencia, 2026-03-30)_

### El Mangroove Costa Rica (1 review)
- ⚠️ Beach is unremarkable, but there is no great Pacific-side beach in that part of Costa Rica. — Liked it, comfortable rooms, good food _(por Humberto Murakami, 2021-07-07)_

### El Palace Barcelona (1 review)
- Fica perto do Mandarin, Super bom _(por Mafe Caramella, 2022-01-06)_

### El Palace Barcelona (Leading Hotels) (1 review)
- maravilhoso, contato comercial excelente _(por Fernanda Balestra, 2024-05-29)_

### El Palace Madrid (Marriott) (1 review)
- adorou, café da manhã maravilhoso _(por Dani Filippozzi, 2025-10-13)_

### Emiliano (1 review)
- ⚠️ Não parece ter piscina; sala do spa pequena (Luis Sassi Flaptur). — Spa tem dois ofurôs _(por Ana Roberta Haus 22, 2023-03-30)_

### Entre Cielos (1 review)
- ⚠️ Hotel deu desconto direto ao cliente que ligou por conta própria; agência recebeu 'mil reclamações' e decidiu não vender mais. _(por Fernanda Helou, 2024-02-16)_

### Ercilla Hotel (1 review)
- ⚠️ Não recomenda _(por Vivi Yuri Agencia, 2026-07-15)_

### Essenza Jericoacoara (1 review)
- ⚠️ viral post of guests visible having sex in the rooftop pools; poor service _(por Humberto Murakami, 2021-05-17)_

### Estrela (Trancoso) (1 review)
- mãe e filha gostaram no Reveillon _(por Elaine Scanavacca Agencia, 2025-08-19)_

### Estrela D'Agua (2 reviews)
- ⚠️ was served a salad with a worm and overcharged for it _(por Fernanda Helou, 2021-04-29)_
- ⚠️ needs renovation — still the best beachfront option in Trancoso _(por Giovana Polotto, 2021-05-06)_

### Et de Palmes (1 review)
- Funciona super bem _(por Fernanda Credidio Agencia, 2026-07-20)_

### Etnia (1 review)
- loved it, very good, close to the Quadrado _(por Giovana Polotto, 2021-05-06)_

### Evora Farm House (3 reviews)
- Hotel lindo, Restaurante delicioso, Áreas sociais e restaurante ótimos, Pareceu bem kids friendly, a 20 min de Évora _(por Fernanda Balestra, 2022-04-25)_
- Adorou o hotel _(por Guilherme Polacow Team Travel, 2022-04-25)_
- Teve uma família lá na semana anterior e eles gostaram _(por Ana Roberta Haus 22, 2022-04-25)_

### Explora (não especificado) (1 review)
- ⚠️ comida descrita como 'bandejão'; guia considerado desagradável, 2 casais reclamaram e trocaram de guia _(por Elaine Scanavacca, 2023-07-24)_

### Explora Atacama (3 reviews)
- ⚠️ Ficou 4 noites e achou pouco para aproveitar o hotel; recomenda 5-6 noites. _(por Humberto Murakami, 2023-04-19)_
- ⚠️ No dia de chegada e no de saída não dá para fazer muita coisa - mais dias ajudam a aclimatar. — Amou a experiência _(por Maria Amelia Agencia, 2023-04-20)_
- ⚠️ portas do banheiro eram ripas vazadas (privacidade zero); quarto pequeno; entrada pela estrebaria; pátio grande e árido, sem espaço de convívio _(por Elaine Scanavacca Agencia, 2025-11-05)_

### Explora Patagonia (1 review)
- ⚠️ Durante fam tour simultâneo no hotel, malas dos clientes reais ficaram em segundo plano e eles perderam um passeio da manhã; reclamaram do restaurante, da comida e do barulho de agentes de viagem em fam tour. _(por Luis Sassi Flaptur, 2023-05-16)_

### explora Torres del Paine (1 review)
- ⚠️ hotel precisando muito de renovação (banheira com cortina em 2015); estilo mais roots, exige gostar do inóspito; spa exige subir/descer ~70 degraus; não tem bike, só caminhada e cavalo — explorações fantásticas _(por Fernanda Credidio, 2023-07-24)_

### explora Valle Sagrado (1 review)
- ✅ passeio de bike — hotel mais novo, comida boa, quartos gostosos, tem bike e ótimas caminhadas, spa novo a poucos passos da sede _(por Fernanda Credidio, 2023-07-24)_

### Faena Miami Beach (2 reviews)
- ⚠️ Agente não gostou de ficar, mas tem clientes que adoram - decoração muito específica pode não agradar a todos. — quartos muito confortáveis _(por Elaine Scanavacca Agencia, 2024-01-31)_
- pax recente adorou _(por Fernanda Helou, 2025-12-08)_

### Fairmont Copacabana Rio de Janeiro (1 review)
- Honored the client's own online booking rate and added a free breakfast benefit to show the value of booking via the agency _(por Tati Assad, 2021-08-12)_

### Fairmont Mayakoba (4 reviews)
- ⚠️ under extensive renovation through Feb 2022 — good wholesaler pricing _(por Elaine Scanavacca Agencia, 2021-05-12)_
- ⚠️ Felt geared toward American guests and tip-driven; ground-floor rooms had humidity issues. — Nice canal-side property, beach volleyball, excellent Signature Casita Room _(por Humberto Murakami, 2021-05-25)_
- ⚠️ Major ongoing construction with beach access closed, plus sewage smell from pipework in addition to sargassum. _(por Marcia Polacow Agencia, 2021-06-21)_
- ⚠️ Estava em reforma; confirmar se a piscina grande já reabriu — Melhor pegar as casitas _(por Tati Assad, 2022-02-16)_

### Fairmont Nile City Cairo (1 review)
- ✅ Quarto deluxe com vista para o Nilo; café da manhã excelente. — restaurantes variados, bem cuidado, boa localização _(por Beto Nascimento Flaptur, 2024-02-10)_

### Fairmont Rio de Janeiro Copacabana (3 reviews)
- Half the price of Fasano/Emiliano for comparable stay, positive feedback on gym and pool _(por Elaine Scanavacca Agencia, 2021-05-28)_
- Good value, very good food, nice sea-view suites, nightly live jazz bar, good spa _(por Fernanda Credidio Agencia, 2021-05-28)_
- Very agency-friendly; added personalized amenities in the client's room under the agency's name _(por Humberto Murakami, 2021-05-28)_

### Fasano (2 reviews)
- Boa comida italiana, Piscina suspensa usada após o spa _(por Humberto Murakami, 2023-02-28)_
- ⚠️ Spa considerado pequeno e sem graça (Luis Sassi Flaptur). — Piscina com vista muito boa _(por Ana Roberta Haus 22, 2023-03-30)_

### Fasano Angra (1 review)
- ✅ Esquema de meia pensão, spa e kids club. — ⚠️ Praia em frente ao hotel é ruim, com óleo de barcos; hotel precisando de reforma segundo outro agente. — comida muito boa, spa fantástico, kids club bom, bar bom, feirinha de fim de semana _(por Fernanda Credidio Agencia, 2024-02-18)_

### Fasano Rio de Janeiro (1 review)
- ⚠️ Multiple client complaints about declining atmosphere ('frequencia ruim'), full of one-night influencers taking photos. _(por Humberto Murakami, 2021-05-28)_

### Fasano Trancoso (2 reviews)
- ⚠️ hotel muito caído, precisando reforma urgente, azulejo quebrado na piscina (piscina teria sido reformada no ano anterior) _(por Luis Sassi (repassando feedback) / Flaptur, 2023-07-10)_
- ⚠️ Cliente reclamou de mulheres se insinuando para o marido dela no entorno do hotel _(por Vivi Yuri Agencia, 2026-05-04)_

### Fazenda Capoava (2 reviews)
- ⚠️ existem chalés antigos - prefira os novos — chalés novos são bem melhores e mais próximos da área comum do hotel _(por Fernanda Helou, 2025-09-15)_
- ⚠️ clientes reclamaram de quarto sujo (mandaram vídeo) e ambiente meio desatualizado ("outdated") _(por Dani Filippozzi, 2025-09-15)_

### Fazenda Corumbau (1 review)
- Sensacional, Praia considerada a mais bonita da Bahia por Fernanda Helou _(por Fernanda Helou, 2022-04-13)_

### Fazenda São Francisco (Corumbau) (3 reviews)
- Clientes amaram pós pandemia _(por Ana Maria Junqueira, 2022-01-04)_
- Sempre ótimos feedbacks, serviço muito bom _(por Juliana Haus 22, 2022-01-04)_
- ✅ Considerar transfer de helicóptero, pois a viagem de carro até lá é muito longa — Aceita hóspedes bebês (baby), Recomendado para famílias que levam a própria babá, por ter bom serviço _(por Humberto Murakami, 2022-01-27)_

### Fendi Private Suites (2 reviews)
- Cliente adorando a estadia, Early check-in e upgrade _(por Luis Sassi Flaptur, 2026-06-07)_
- ⚠️ Café da manhã fraco ('micho') — Quartos enormes _(por Renata Levorin Agencia, 2026-06-12)_

### Finolhu Maldives (1 review)
- villa 'bolha' muito procurada para lua de mel, pax gostou muito _(por Elaine Scanavacca, 2023-07-17)_

### Flemings (1 review)
- Ótimos feedbacks sempre _(por Fernanda Helou, 2026-07-16)_

### Fontainebleau Miami Beach (1 review)
- ⚠️ família reclamou de tudo do início ao fim no reveillon; movimento intenso na piscina, resortão com muita farra; quartos das torres novas são básicos — clientes menos exigentes que vão todo ano dizem gostar, quartos das torres novas em ordem _(por Guilherme Polacow / Vivi Yuri / Fernanda Helou / Ucha Verissimo / Team Travel, 2023-10-26)_

### Four Seasons Anguilla (1 review)
- Clientes amaram _(por Fernanda Credidio Agencia, 2022-02-01)_

### Four Seasons Astir Palace (Athens) (2 reviews)
- Pax adoraram _(por Elaine Scanavacca Agencia, 2026-07-22)_
- ✅ Prédio mais próximo da praia e da taverna — Serviço de piscina impecável, Comida ótima _(por Laryssa Siqueira Trivia, 2026-07-22)_

### Four Seasons Bora Bora (1 review)
- Reforma finalizada por volta de 2020 _(por Vivi Yuri Agencia, 2023-02-08)_

### Four Seasons Cairo (FS Nile - com vista para o Nilo) (1 review)
- Localização e restaurantes elogiados, Restaurante chinês famoso dentro do hotel, Vista para o Nilo maravilhosa _(por Fernanda Balestra, 2022-11-04)_

### Four Seasons Hotel at The Surf Club (1 review)
- Kids club muito bom _(por Humberto Murakami, 2023-01-21)_

### Four Seasons Hotel Firenze (1 review)
- ⚠️ feedback recente de hotel 'caído', precisando reforma; fotos mostraram suíte com carpete desgastado, papel de parede rasgado e cortinas encardidas _(por Elaine Scanavacca / Luis Sassi / Flaptur, 2023-07-26)_

### Four Seasons Hotel Singapore (1 review)
- apartamentos totalmente renovados no final de 2018, lindo e bem localizado _(por Tuca / Fernanda Helou, 2023-06-30)_

### Four Seasons Landaa Giraavaru (1 review)
- excellent for children, great kids club _(por Fernanda Credidio Agencia, 2021-03-23)_

### Four Seasons Las Vegas / Wynn Las Vegas / Bellagio Las Vegas (1 review)
- FS: elegante, sem cassino, Wynn: shows e restaurantes excelentes, quartos bons, spa ótimo, vista da Sphere, Bellagio: quartos recém-renovados _(por Beto Nascimento / Vivi Yuri / Flaptur, 2023-12-07)_

### Four Seasons Los Angeles (1 review)
- ⚠️ Pax reportou que o hotel está bem velho, com mofo, suíte bem derrubada _(por Luis Sassi Flaptur, 2022-01-13)_

### Four Seasons Madrid (1 review)
- ⚠️ Entrada de carros complicada em dias de greve — Treinamento recente muito elogiado, Localização muito boa _(por Dani Filippozzi, 2026-07-02)_

### Four Seasons Marrakech (2 reviews)
- ⚠️ não gosta dos quartos de entrada (categoria básica) — suítes excelentes, com piscina privativa, suítes custam menos que os quartos intermediários do La Mamounia (ex.: cerca de USD 1.500) _(por Humberto Murakami, 2025-11-15)_
- clientes voltaram recentemente, tudo certo _(por Claudia Bernardo Six Viagens, 2025-11-15)_

### Four Seasons New York (1 review)
- ✅ Central Park view for clients unfamiliar with NYC, near 5th Avenue — loved the location, rooms, and restaurant _(por Humberto Murakami, 2020-11-17)_

### Four Seasons Resort Chiang Mai (1 review)
- Pax foram em março/2023 e adoraram _(por Fernanda Helou, 2023-05-15)_

### Four Seasons Resort Orlando at Walt Disney World (1 review)
- ⚠️ obras adjacentes com ruído diurno de seg-sex a partir de 01/08/2023 por cerca de 1 ano, afetando categorias Golden Oak e Four Seasons (compensação em resort credit disponível) _(por Luis Sassi / Flaptur, 2023-10-26)_

### Four Seasons Resort Seychelles at Desroches Island (1 review)
- Praia ótima _(por Fernanda Helou, 2022-12-20)_

### Four Seasons Safari Lodge Serengeti (1 review)
- ✅ Game drives feitos pelo próprio hotel, não por DMC externo, para manter padrão do serviço. — ⚠️ Alguns operadores tentam terceirizar o safári para DMC, o que pode reduzir a qualidade do serviço. _(por Ucha Verissimo Agencia, 2024-02-08)_

### Four Seasons Seoul (1 review)
- café da manhã impressionante e extenso, serviço de arrumação impecável, quarto pronto em 10 minutos todos os dias, staff atencioso, lembravam preferências da filha (ex.: chocolate quente) _(por Dani Filippozzi, 2025-11-03)_

### Frasiers The Claridge (2 reviews)
- Apto 'Prestige' moderno, Opção de apartamento com 2 quartos _(por Elaine Scanavacca Agencia, 2023-01-20)_
- Humberto Murakami visitou e gostou, Duas famílias ficaram lá em 2023 e o custo foi interessante _(por Patricia Lumy, 2023-04-24)_

### Furore (hotel próximo a Amalfi) (1 review)
- ⚠️ Agente ficou hospedada há algum tempo e não recomenda. _(por Fernanda Helou, 2025-04-24)_

### Gabrielli (Starhotels) (3 reviews)
- Clientes adoraram, Custo estava ótimo _(por Patricia Lumy, 2026-05-14)_
- Clientes adoraram, deu muito certo _(por Ana Roberta Haus 22, 2026-05-14)_
- Ótimo feedback, Clientes tiveram upgrade, Bom custo-benefício _(por Fernanda Helou, 2026-05-14)_

### Gallery Art Hotel (1 review)
- ⚠️ Não compara com Six Senses, mas atende bem quem busca custo-benefício. — quase todos os quartos com vista linda, espaçosos _(por Caroline Assad Audi TA Travel, 2024-03-25)_

### Gili Lankanfushi (1 review)
- casal em lua de mel amou, tom da água do mar muito bonito _(por Fernanda Balestra, 2023-06-20)_

### Gleneagles (1 review)
- ⚠️ não tão lindo quanto o Castello di Reschio, na comparação pessoal da agente — maravilhoso _(por Ucha Verissimo Agencia, 2025-10-08)_

### Gran Hotel Inglés (1 review)
- clientes que adoraram _(por Ana Roberta / Haus 22, 2023-09-05)_

### Grand Beach Hotel Surfside (4 reviews)
- ⚠️ A group of a client's friends staying there was robbed; stopped offering it afterward. Also had non-commissionable site promotions. — Good value, nice apartments _(por Elaine Scanavacca Agencia, 2021-06-15)_
- aceitou pedidos específicos de quarto, surpresa de aniversário sem cobrar (vinho, doces, balões) _(por Fernanda Helou, 2024-01-05)_
- custo-benefício muito bom, cliente gostou _(por Ana Terra, 2024-06-24)_
- ⚠️ Pax reclamaram da limpeza. _(por Fernanda Helou, 2024-06-24)_

### Grand Floridian (Walt Disney World) (1 review)
- ⚠️ Cliente reclamou de quarto com cheiro forte de cigarro e falta de limpeza diária. Confirmado por outros agentes que resorts Disney/FS suspenderam limpeza diária durante a pandemia, oferecendo apenas 'limpeza leve' a cada dois dias (retirar lixo, repor toalhas/amenities, aspirar se necessário). _(por Luis Sassi Flaptur / Flaptur, 2021-12-20)_

### Grand Hotel (La Barra, Punta del Este) (1 review)
- ⚠️ Precisa de carro para se locomover — Localização ótima, perto de La Barra _(por Mafe Caramella, 2022-01-18)_

### Grand Hotel et de Milan (1 review)
- venda recente: hóspedes adoraram, bom para famílias mais exigentes _(por Tuca / Fernanda Balestra / Fernanda Helou, 2023-08-09)_

### Grand Hotel Excelsior Amalfi (1 review)
- considerado boa opção mid-range na Costa Amalfitana _(por Tuca / Patricia Lumy / Fernanda Helou, 2023-12-27)_

### Grand Hotel National Lucerne (1 review)
- Quartos clássicos muito bons _(por Patricia Lumy, 2026-02-04)_

### Grand Hotel Quisisana (2 reviews)
- ✅ Pedir a suíte que o CR7 ficou, mais isolada/privativa. — ⚠️ Caro (em torno de EUR 3.000/noite); decoração duvidosa, 'estilo sul da Itália'. — hotel lindo, serviço e comida impecáveis, piscina ótima _(por Guilherme Polacow Team Travel, 2024-05-24)_
- Amou a estadia _(por Patricia Lumy, 2025-03-31)_

### Grand Hotel Terme (1 review)
- ⚠️ É 5 estrelas mas um 5 estrelas 'standard' — Fica na porta do muro (dentro/perto da cidade murada de Sirmione) _(por Ana Maria Junqueira, 2022-05-09)_

### Grand Hotel Vesuvio (1 review)
- ⚠️ operadora prometeu reservar direto com o hotel mas reservou via broker (TBO) sem avisar; causou problema de linkagem de reserva, exigência de novo check-in/check-out e não reconhecimento do early check-in pago _(por Tati Assad, 2023-07-13)_

### Grand House - Relais & Chateaux (1 review)
- ⚠️ fica na ponta do Algarve, na divisa com a Espanha — visitou pessoalmente e gostou _(por Ana Roberta / Haus 22, 2023-08-04)_

### Grand Hyatt Athens (1 review)
- Ótimo custo-benefício, Passageiros elogiaram os serviços _(por Patricia Lumy, 2023-05-09)_

### Grand Hôtel (1 review)
- Hotel clássico, considerado o melhor da cidade, Público cativo que sempre retorna, Vendido bem em 2022 sem queixas _(por Luis Sassi Flaptur, 2022-08-08)_

### Grand La Margna / Grace St Moritz (1 review)
- maravilhoso, quarto excelente, atrai público mais jovem _(por Humberto Murakami, 2024-03-27)_

### Grand Velas Riviera Maya (2 reviews)
- ⚠️ Clients hated the stay. _(por Maria Amelia Agencia, 2021-05-25)_
- ⚠️ Client reported the rooms and hotel smelled of mold. _(por Luis Sassi Flaptur, 2021-05-25)_

### Grande Hotel (Campos do Jordão) / Vila Inglesa (Mazzaropi) (1 review)
- ⚠️ Vila Inglesa perdeu charme após se tornar Mazzaropi, banheiras muito altas em alguns quartos; para clientes sem crianças/mais exigentes, Grand Hotel é melhor opção; outras boutique recomendadas na região: Quebra Noz, LAH, Chateau La Villette — ambos bons para famílias com crianças pequenas _(por Bia Parra / Carol Cordeiro, 2023-09-01)_

### Grande Hotel Campos do Jordão (1 review)
- ⚠️ Almoço é somente no salão grande, formato buffet; público bem diferente do Toriba — Reformado recentemente, segundo fornecedores _(por Ucha Verissimo Agencia, 2022-02-10)_

### Grootbos Private Nature Reserve (1 review)
- Bem bacana, Boas experiências de observação de baleias e trekking _(por Tati Assad, 2023-04-04)_

### Habitas Tulum (1 review)
- ⚠️ Commission cut from 12% (via operator) to 10% once client paid the hotel directly. _(por Fernanda Helou, 2021-07-22)_

### Hamares (Noronha) (3 reviews)
- hotel com melhor vista em Noronha _(por Humberto Murakami, 2025-09-18)_
- ⚠️ a própria agente nunca se hospedou lá — vende bem e clientes adoram, concierge ótimo _(por Dani Filippozzi, 2025-09-20)_
- ⚠️ cama ruim, sensação de dois colchões de solteiro separados; concierge não proativa; atendimento na piscina ruim; equipe em geral sem treinamento adequado, exceto Patrícia (recepção) e Wellington (restaurante) — festa/réveillon excelente _(por Dani Filippozzi, 2026-01-03)_

### Hard Rock Hotel Cancún (1 review)
- ⚠️ hated it; poor food and drinks quality _(por Marcus Carneiro, 2021-04-16)_

### Hard Rock Hotel Riviera Maya (1 review)
- ⚠️ not open sea — client with young kids loved it, reef-protected shallow beach good for children _(por Vivi Yuri Agencia, 2021-04-16)_

### Havila Voyages (navio, Noruega) (1 review)
- ⚠️ gostou mas não achou mágico; perrengue para acessar a praia — vista bonita _(por Elaine Scanavacca, 2023-11-22)_

### Haya Milagres (2 reviews)
- clientes venderam e curtiram _(por Laryssa Siqueira Trivia, 2025-09-13)_
- Clientes gostaram _(por Laryssa Siqueira Trivia, 2026-06-22)_

### Hayo Pé na Areia (1 review)
- Gostou muito, Um dos melhores restaurantes pé na areia de Caraíva _(por Bia Parra, 2026-03-18)_

### Hermitage Monaco (1 review)
- Quartos super amplos, Estilo mais clássico _(por Fernanda Credidio Agencia, 2026-05-31)_

### Hibisco (1 review)
- fully renovated, close to Quadrado, good value _(por Juliana Haus 22, 2021-05-06)_

### Hideaway (Maldivas) (2 reviews)
- ⚠️ Reclamações de comida ruim, butler que ignorava os hóspedes, e tratamento mal conduzido por segurança em situação de quarentena na praia; hóspedes se sentiram desrespeitados — Viram golfinhos e arraias; água clara _(por Fernanda Helou, 2022-02-20)_
- ⚠️ Não é hotel de alto luxo; alinhar expectativa do cliente antes de vender — Amiga que tem agência teve boa experiência e recomenda _(por Vivi Yuri Agencia, 2022-02-20)_

### Highstay (apart-hotéis com serviço) (2 reviews)
- Apartamentos com serviços lindos _(por Elaine Scanavacca Agencia, 2026-07-13)_
- Indicado pela Vivi Yuri, parece super legal _(por Fernanda Credidio Agencia, 2026-07-14)_

### Hilton Moorea Lagoon Resort (1 review)
- ⚠️ Ilha isolada sem muito o que fazer; gastronomia boa mas não extraordinária; passeios limitados a mergulho. — Gostou bastante _(por Bia Parra, 2023-05-03)_

### HIU Hotel (litoral norte SP) (1 review)
- ⚠️ Comissiona 10%; não aceita crianças (segundo relato) — Cliente amou, Mesmo dono do Nau Royal _(por Mafe Caramella, 2022-02-08)_

### Holiday Inn Santiago Aeroporto (1 review)
- ótimo, em frente ao aeroporto, quarto grande com 2 camas _(por Pedro Alvarenga Irmao Scanavacca, 2024-05-28)_

### Hospes Casas Rey de Baeza (1 review)
- ✅ Sensação forte de 'estar na Espanha'; pátio central grande. — ⚠️ Piscina do terraço é pequena e pouco agradável, fica no alto com espreguiçadeiras na parte de baixo. — Considerado o hotel-boutique mais bonito de Sevilha pela agente, Membro SLH, Localização central, chega de táxi, Quartos charmosos com azulejo no chão, Seria a escolha da agente para se hospedar _(por Elaine Scanavacca Agencia, 2025-07-08)_

### Hotel Baur Au Lac (1 review)
- Considerado o mais sofisticado de Zurique _(por Bia Parra, 2023-03-17)_

### Hotel Belles Rives (1 review)
- ✅ Café da manhã na varanda. — localização incrível, praia ótima, decoração clássica _(por Laryssa Siqueira Trivia, 2024-03-03)_

### Hotel Bristol (1 review)
- Excelente custo-benefício ao vender os quartos reformados, Concierge do hotel excelente _(por Patricia Lumy, 2022-12-05)_

### Hotel Brunelleschi (1 review)
- ⚠️ categoria é 4 estrelas, não 5 — gostamos muito _(por Tuca / Fernanda Helou, 2023-07-26)_

### Hotel Colline de France (2 reviews)
- Reserva tranquila, Comissão paga sem demora, Cartinha com chocolates em nome da agência _(por Patricia Lumy, 2023-02-28)_
- ⚠️ Hotel se recusou a transferir reserva feita direto pelo cliente sem cobrar 100% adiantado, quebrando o acordo original de 50%/50%. _(por Fernanda Credidio Agencia, 2023-02-28)_

### Hotel De L'Europe Amsterdam (2 reviews) _(mescladas de: Hotel L'Europe Amsterdam)_
- ⚠️ lobby escuro e pesado no visual (opinião pessoal da agente, que não curtiu esse estilo) — cliente amou, quarto lindo e enorme com upgrade _(por Elaine Scanavacca Agencia, 2025-08-21)_
- ⚠️ lobby considerado datado/antiquado; decoração varia muito por quarto, alguns em vermelho/veludo forte — pax que ficou recentemente amou o quarto _(por Elaine Scanavacca / Luis Sassi, 2023-07-19)_

### Hotel de Rome / Adlon Kempinski Berlin (1 review)
- ⚠️ de Rome tem wifi ruim em algumas áreas (era um antigo banco); Hilton na praça é opção BBB, cerca de 30% mais barato que os dois — de Rome: mais bonito e contemporâneo, agrada jovens, Adlon: clássico e icônico, vista para Portão de Brandemburgo, agrada tradicionais _(por Humberto Murakami / Fernanda Credidio / Elaine Scanavacca, 2023-08-02)_

### Hotel Galileo (base do Cerro Catedral, Bariloche) (1 review)
- ⚠️ Também é antigo _(por Carol Cordeiro Agencia, 2022-03-10)_

### Hotel Guarda Golf (2 reviews) _(mescladas de: Guarda Golf)_
- ⚠️ É pequeno: recepção e restaurante pequenos, não é hotel de grande estrutura. — intimista, chic, servico impecavel _(por Marcia Polacow / Team Travel, 2021-11-10)_
- Adorou a estadia _(por Elaine Scanavacca Agencia, 2022-07-07)_

### Hotel Helmhaus Zürich (2 reviews) _(mescladas de: Helmhaus Zurich)_
- Hiper bem localizado, Excelente custo-benefício _(por Humberto Murakami, 2022-02-09)_
- Ótimo custo-benefício, Super bem localizado _(por Humberto Murakami, 2023-02-16)_

### Hotel Histórico Central (1 review)
- good price, good location _(por Vivi Yuri Agencia, 2021-05-17)_

### Hotel Janeiro (2 reviews) _(mescladas de: Janeiro Hotel)_
- ⚠️ Piscina é bem pequena; com dois casais no mesmo espaço fica meio complicado. Serviço de praia não inclui bar (só toalha, cadeira, guarda-sol e água). — gostosinho, localizacao otima, servico de praia diario incluso _(por Giovana Polotto / Appetitte Travel, 2021-09-27)_
- ⚠️ Rooftop pool is very small, more for people-watching than swimming. _(por Humberto Murakami, 2021-05-28)_

### Hotel La Ponche (1 review)
- Cliente adorou (viagem de 2022) _(por Luis Sassi Flaptur, 2023-04-13)_

### Hotel Le Lana (1 review)
- ⚠️ uma agente achou a decoração 'meio cafona' — super BBB (bom bonito barato) para Courchevel _(por Maria Amelia / Claudia Bernardo / Six Viagens, 2023-08-02)_

### Hotel Le Palme (Forte Village) (1 review)
- ⚠️ Não é super top, mas entrega bem. — Grupo amou a experiência _(por Mafe Caramella, 2023-05-16)_

### Hotel Madoka no Mori Hakone (1 review)
- ✅ Onsen privativo. — clientes adoraram, moderno _(por Vivi Yuri Agencia, 2024-02-15)_

### Hotel Mercer Sevilla (1 review)
- Cliente adorou, Super novo _(por Danielle Coltro, 2023-03-30)_

### Hotel Metropole Monaco (1 review)
- Lobby muito bem decorado, Spa ótimo, Restaurante japonês com estrela Michelin _(por Dani Filippozzi, 2026-05-30)_

### Hotel Pire Hue (Bariloche) (1 review)
- ⚠️ Hotel super antigo, não é muito o perfil dos clientes da agência _(por Carol Cordeiro Agencia, 2022-03-10)_

### Hotel Roma (V Retreats), Ortigia (1 review)
- ✅ Vender a partir da segunda categoria de quarto. — vendido mais de uma vez com sucesso _(por Fernanda Credidio Agencia, 2024-03-22)_

### Hotel Royal-Riviera (1 review)
- ⚠️ Café da manhã caro pelo que entrega; quartos de categoria inicial pequenos. — localização ótima _(por Elaine Scanavacca Agencia, 2024-03-03)_

### Hotel Splendid Venezia (1 review)
- atendimento excelente, resposta a e-mail em menos de 30 min, serviço de Meet & Greet diferenciado a partir de Veneza Santa Lucia, charmoso e bom atendimento _(por Bia Parra / Danielle Coltro, 2023-07-19)_

### Hotel Toriba (1 review)
- Horto do Toriba é uma delícia com crianças e para família _(por Bia Parra, 2023-10-30)_

### Hotel Tremezzo (1 review)
- Clientes estão amando _(por Luis Sassi Flaptur, 2023-03-23)_

### Hotel Unique (1 review)
- ⚠️ quoted a higher contract rate than its own website, then let client book direct online _(por Fernanda Balestra, 2021-04-22)_

### Hotel Urso Madrid (3 reviews) _(mescladas de: Hotel Urso (Madrid))_
- Super bem localizado _(por Fernanda Balestra, 2022-02-25)_
- Visitou e adorou _(por Ana Roberta Haus 22, 2022-02-25)_
- ✅ Pedir explicitamente quarto silencioso. — ⚠️ Quartos meio barulhentos. — gostei _(por Fernanda Credidio Agencia, 2024-07-08)_

### Hotel Vila Amazônia (Manaus) (1 review)
- ⚠️ É caro — Muito bom, vale a pena ficar por lá _(por Patricia Lumy, 2022-01-27)_

### Hotel Vilon (4 reviews) _(mescladas de: Hotel Vilòn, Vilon)_
- ⚠️ café da manhã deixa um pouco a desejar — bastante chic, serviço impecável, comida boa _(por Ucha Verissimo Agencia, 2025-10-14)_
- quarto ótimo, melhor negroni _(por Guilherme Polacow Team Travel, 2025-10-14)_
- ⚠️ café da manhã à la carte demora muito para ser servido — adorou ficar _(por Elaine Scanavacca Agencia, 2025-10-14)_
- ⚠️ Conheceu mas não se hospedou. — Ótimo, super bonito, Localização excelente _(por Franciele Nascimento Condor Turismo, 2023-03-23)_

### Hotel Zagaia Bonito / Pousada Boyrá (1 review)
- ⚠️ sempre alinhar expectativa - não existe luxo real em Bonito — Zagaia: melhor localização e conforto, Boyrá: opção mais isolada _(por Maria Amelia, 2023-09-05)_

### Hyatt Centric Carmelo / Hyatt Carmelo (Uruguai) (2 reviews)
- ⚠️ Clientes relataram em fev/2020: hotel cansado, serviço ruim, camareira limpava o quarto só às 5 da tarde, comida ruim _(por Fernanda Credidio Agencia, 2022-02-23)_
- ⚠️ Antes da pandemia, clientes relataram que o hotel estava bem cansado _(por Luis Sassi Flaptur, 2022-02-23)_

### Hyatt Regency Grand Cypress Resort (1 review)
- ⚠️ Repassando e-mail de Ricardo Ojeda Marins (Hyatt Sales Force): mais distante da Universal e 'também não está tão bacana'. _(por Luis Sassi Flaptur, 2023-02-16)_

### Hyatt Regency Mexico City (Polanco) (1 review)
- ⚠️ estilo mais corporativo — bem localizado em Polanco, perto de vários restaurantes e bares, bairro lindo _(por Juliana Haus 22, 2025-10-01)_

### Hyatt Regency Orlando (1 review)
- ⚠️ Repassando e-mail de Ricardo Ojeda Marins (Hyatt Sales Force): localização ótima e tarifa boa, mas precisa de reforma; não recomendado para cliente mais exigente. _(por Luis Sassi Flaptur, 2023-02-16)_

### Hyatt Zilara Cancun (1 review)
- Sent several families, feedback always good _(por Bia Parra, 2021-08-11)_

### Hyatt Zilara Riviera Maya (1 review)
- good client feedback _(por Giovana Polotto, 2021-05-12)_

### Hyatt Ziva Cap Cana (1 review)
- ✅ Book the Club room category (includes an a la carte restaurant). — Very new, guest arrived and loved it, called the hotel beautiful _(por Tati Assad, 2021-08-03)_

### Hyde Bodrum (1 review)
- Mais budget e all inclusive, Hotel relativamente novo, Fica meia hora do Scorpios, 'O hotel é uma graça' _(por Vivi Yuri Agencia, 2026-05-21)_

### Hôtel de Berri (Paris) (1 review)
- Mandou clientes e eles gostaram _(por Humberto Murakami, 2022-01-13)_

### Hôtel Lancaster Paris (1 review)
- ⚠️ spa pequeno (mas agente considera não ser um problema em Paris) — bar bacana com drinks autorais, quartos grandes com piso de madeira bonito, ótima localização (Champs-Élysées, metrô na porta), bom suporte do contato Lyderick _(por Elaine Scanavacca Agencia, 2025-12-22)_

### Iberostar Selection Praia do Forte (1 review)
- ⚠️ Rooms a bit worn, food just ok, pool areas can be quite noisy — not recommended for a demanding client used to better hotels. _(por Vivi Yuri Agencia, 2021-08-18)_

### Ibis Recife Aeroporto (1 review)
- melhor opção para pernoite bem perto do aeroporto _(por Humberto Murakami / Vivi Yuri, 2023-09-01)_

### Ibis Styles México Zona Rosa (1 review)
- surprisingly stylish and well put together despite the brand name _(por Elaine Scanavacca Agencia, 2021-05-17)_

### Ibiza Gran Hotel (1 review)
- eles são demais _(por Fernanda Balestra, 2024-06-20)_

### Iceland Parliament Hotel (1 review)
- gostei muito _(por Fernanda Credidio Agencia, 2024-05-14)_

### IDI (fornecedor de experiências Itália) (1 review)
- ⚠️ Cancelou ingressos de experiência importante em Veneza a menos de 1 mês da viagem sem fornecer comprovantes; atendimento ruim do dono; agência parou de trabalhar com o fornecedor _(por Tati Assad / TA Travel, 2024-10-22)_

### Ikos Porto Petro (1 review)
- Ótimo custo-benefício para famílias, All inclusive, Família exigente hospedada disse que o serviço é muito bom _(por Fernanda Helou, 2026-06-29)_

### Il Borro (1 review)
- ⚠️ Hotel estava fechado para evento privado durante a visita, então não é certo como é o funcionamento normal. — sensacional, cidade charmosa _(por Beto Nascimento Flaptur, 2024-04-09)_

### Il Boscareto Resort & Spa (1 review)
- vendido para uma família que gostou bastante _(por Vivi Yuri Agencia, 2025-09-16)_

### Il Melograno (1 review)
- ⚠️ Quem é do padrão Marriott adora, quem é do padrão Four Seasons acha ruim — depende muito do perfil do cliente. — Bom custo-benefício _(por Felipe Pipa Bari / FB Travel, 2026-04-15)_

### Il Sereno (Lago di Como) (1 review)
- ⚠️ Segundo Maria Amelia Agencia, italianos tendem a não gostar do estilo, mas clientes mais jovens amam — Super contemporâneo, Agente amou _(por Marcus Carneiro, 2022-03-05)_

### Infante Sagres (1 review)
- ⚠️ As vezes nao comissiona em certas tarifas (Booking); hotel nao honrou tarifa quando cliente achou mais barato, precisou reservar via Expedia. — Hiper bem localizado _(por Fernanda Balestra, 2025-02-20)_

### INK Hotel Amsterdam (1 review)
- gostei muito, jovem, bem localizado, descolado, preço bom _(por Elaine Scanavacca Agencia, 2024-05-16)_

### Inturotel Cala Esmeralda (1 review)
- ⚠️ Não é luxo. — Adults-only, Pertinho da praia _(por Fernando Nishi Travel&Soul, 2023-02-14)_

### Inverlochy Castle (1 review)
- sempre vende e é sucesso com os clientes, 1 noite já rende como se fossem 2 dias de experiência (chega de manhã e sai no fim da tarde do dia seguinte) _(por Elaine Scanavacca Agencia, 2025-10-08)_

### Jaci's Lodge Madikwe (1 review)
- atendimento top, lodge top, safári maravilhoso _(por Danielle Coltro, 2024-01-05)_

### Jaci's Lodges (4 reviews) _(mescladas de: Jaci's Lodge)_
- ⚠️ Em julho os lodges costumam estar lotados. — So bons feedbacks _(por Carol Cordeiro Agencia, 2025-02-17)_
- ⚠️ Fechado para reforma apos fortes chuvas/alagamento, reabertura prevista para outubro/2025; considerado inferior a um Singita. — Quartos/lodges na arvore _(por Vivi Yuri Agencia, 2025-04-23)_
- ⚠️ Fechado por alagamento na região; reabertura prevista para julho de 2026, mais exclusivo e totalmente renovado. — Todos os clientes que foram amaram _(por Carol Cordeiro / Carol Cordeiro Agencia, 2026-03-19)_
- sensacional, valor bom, grupo recente fechado com sucesso _(por Danielle Coltro, 2023-11-23)_

### Jaguaribe Lodge (1 review)
- ✅ Good fit for guests into kite-surfing who also want to unwind; nearby kite school. — ⚠️ No air conditioning in the bungalows. — Beautiful beach-and-river setting on stilts, excellent bakery/bread, really good breakfast, good food overall _(por Fernanda Credidio Agencia, 2021-08-25)_

### Japaratinga Resort (1 review)
- ⚠️ Precisa andar um pouco para chegar à praia; não se vê o mar da piscina; quartos são simples. É da mesma rede do Salinas Maragogi — Alimentos e bebidas sensacionais, Freezer com cerveja (corona, heineken), vinhos, espumantes, caipiroskas incluídos, Comida ótima _(por Franciele Nascimento Condor Turismo / Condor Turismo, 2022-02-02)_

### Jequitimar (1 review)
- ⚠️ Lost a 4-apartment sale after Accor gave the client a direct net rate; group contact said nothing could be done. _(por Claudia Bernardo Six Viagens, 2021-08-24)_

### Joali Maldives (1 review)
- top for kids _(por Fabiana Ferrari Agencia, 2021-03-23)_

### Juma Lodge (Amazônia) (1 review)
- ⚠️ Muito pouco flexíveis, o 'não' costuma ser a primeira resposta; comunicação entre o escritório de SP e o hotel na selva precisa melhorar; palestra inicial é muito longa; só tem ventilador, não tem ar condicionado; não é adequado para pessoas com dificuldade de locomoção/cadeirantes, pois a entrada/saída do hotel, barco e passeios exigem mobilidade — Estrutura do hotel super adequada, comida simples mas bem feita, Passeios acompanhados por guias muito experientes e profissionais (Zé Carlos e Hudson), Staff do hotel atencioso, Crianças são bem-vindas e bem cuidadas, É mais simples que o Anavilhanas e o Mirante _(por Patricia Lumy, 2022-01-27)_

### K2 Djola (1 review)
- ⚠️ Banheiro estava bem antiguinho/desatualizado. Visita foi feita cerca de 3 anos antes da mensagem (apenas para jantar, não para hospedagem). — Gostou da parte social do hotel, Gostou do tamanho do quarto _(por Elaine Scanavacca Agencia, 2025-06-04)_

### Kempinski Boulevard Dubai (1 review)
- ⚠️ não é um hotel grande — clientes gostaram muito, bem localizado e novo _(por Fernanda Credidio Agencia, 2025-11-18)_

### Kempinski Cairo (1 review)
- ⚠️ Recomendado como alternativa quando o FS Nile está lotado (ex.: alta temporada de janeiro no Cairo). — bem localizado perto do FS Nile, equipe otima, coloca amenities para os hospedes _(por Fernanda Balestra / FB Travel, 2021-11-24)_

### Kempinski Hotel Soma Bay/Hurghada (1 review)
- ⚠️ Terrible service, dirty room, nearly two-hour check-in with the guest waiting on the balcony while the still-wet room was cleaned; not sellable to a luxury client. _(por Tati Assad, 2021-06-25)_

### Kempinski Laje de Pedras / Serrazul (1 review)
- ⚠️ hotel ainda não está pronto, só o restaurante funciona; é caro — comida do restaurante incrível _(por Humberto Murakami, 2023-11-10)_

### Kempinski Mar Morto (1 review)
- Um dos hotéis mais bacanas em que já se hospedou _(por Elaine Scanavacca Agencia, 2022-09-21)_

### Kempinski Munique (1 review)
- ⚠️ Decoração antiga (antigão), embora mais central que o Rocco Forte. — Quarto de tamanho ótimo _(por Guilherme Polacow / Team Travel, 2026-04-14)_

### Kempinski Seychelles Resort (Mahé) (2 reviews)
- ⚠️ Visitou pessoalmente: prédio de dois andares com quartos lado a lado; não gostou. Recomendação de não vender. _(por Humberto Murakami, 2022-12-20)_
- ⚠️ Achou a praia estranha, segundo relato de terceiros. _(por Fernanda Helou, 2022-12-20)_

### Kempinski St. Moritz (2 reviews)
- ⚠️ Múltiplos boletins de ocorrência de hóspedes; hotel malconservado, sem manutenção, equipe não ajuda com problemas. _(por Luis Sassi Flaptur, 2023-02-19)_
- ⚠️ Visitou pessoalmente: recepção feia, sofá parecia de consultório odontológico (couro sintético marrom); quartos ok, mas o nome/preço enganam quem não visita. _(por Elaine Scanavacca Agencia, 2023-02-19)_

### Kempinski Vienna (1 review)
- Vizinho do Ritz-Carlton _(por Marcia Polacow Agencia, 2022-03-14)_

### Kempinski Çirağan Palace Istanbul (1 review)
- ⚠️ é um hotel mais antigo comparado ao Four Seasons vizinho, que pode ser "melhor" em termos de modernidade — equipe extremamente atenciosa, quartos renovados com comodidades modernas (ex.: portas USB-C na cabeceira), restaurantes excelentes, porém caros, vista incrível do Bósforo _(por Beto Nascimento Flaptur, 2025-09-25)_

### Kenoa Resort (2 reviews)
- ⚠️ Difícil conseguir cotas/alocação para agentes de viagem. — Serviço muito bom, referência entre os hotéis do Nordeste _(por Fernanda Credidio Agencia, 2022-08-19)_
- ⚠️ praia mais ou menos — gosta do hotel _(por Laryssa Siqueira Trivia, 2025-09-13)_

### Kinsuikan Ryokan (1 review)
- ✅ Dormir ao menos 1 noite na ilha de Miyajima. — ryokan maravilhoso _(por Ucha Verissimo Agencia, 2024-04-14)_

### Kuara (4 reviews) _(mescladas de: Kûara)_
- ⚠️ Não tem nada específico para kids — Praia pop, ok, Cadeiras separadas na frente do mar, Quartos bons e comida boa _(por Laryssa Siqueira Trivia, 2022-04-25)_
- ⚠️ Tem DJ em alguns dias com música alta, pode ser barulho demais dependendo da idade da criança — Praia ok, pax amaram, Uma amiga foi com criança e adorou _(por Fernanda Helou, 2022-04-25)_
- Amou o hotel _(por Luis Sassi Flaptur, 2022-11-27)_
- Hotel descrito como 'uma delícia' _(por Fernanda Balestra, 2022-11-27)_

### Kurotel (1 review)
- very willing partner, good health programs _(por Tati Assad, 2021-03-16)_

### L'AND Vineyards (2 reviews)
- ⚠️ É para quem gosta de hotel mais design; pode ter passado por renovação, Danielle não sabe como está atualmente — Sensacional, Restaurante Michelin, Produz seu próprio vinho _(por Danielle Coltro, 2022-04-25)_
- ⚠️ Achou o hotel mal cuidado em 2015 e parou de indicar desde então _(por Ana Roberta Haus 22, 2022-04-25)_

### L'Esprit Saint-Germain (1 review)
- ⚠️ agente que visitou pessoalmente achou os quartos tão pequenos que sentiu claustrofobia — pax que ficou adorou _(por Humberto Murakami / Fernanda Helou / Elaine Scanavacca, 2023-11-25)_

### L'Hotel Porto Bay (1 review)
- ⚠️ Not a trendy/modern property, but pleasant. — Delicious breakfast, good service, agreeable stay _(por Fernanda Credidio Agencia, 2021-05-24)_

### La Bastide de Moustiers (1 review)
- Visitou/almoçou em 2019 e amou, Hóspedes em 2022 também amaram, Hotel boutique pequeno e charmoso, comida incrível _(por Fernanda Helou, 2023-01-24)_

### La Belle Juliette (1 review)
- ⚠️ Vendeu há um tempo, clientes gostaram; quartos de 20m2 (vender 2ª categoria); capacidade máxima de 3 pessoas por quarto. — Estilo chic contemporâneo, Spa com piscina indoor, Restaurante virado para o jardim _(por Elaine Scanavacca Agencia, 2023-03-28)_

### La Ferme Saint-Siméon (Relais & Châteaux) (1 review)
- ⚠️ Não é pertinho do Mont Saint-Michel; fica a quase 2h de distância — Muito legal, em Honfleur _(por Ucha Verissimo Agencia, 2022-05-18)_

### La Fiermontina (1 review)
- Clientes amaram _(por Fernanda Helou, 2023-04-25)_

### La Maison des Têtes (1 review)
- bem central em Colmar _(por Ucha Verissimo, 2023-06-27)_

### La Reserve Eden au Lac (1 review)
- A 10 minutos a pé do Baur Au Lac, Está muito bonito _(por Bia Parra, 2023-03-17)_

### La Samanna (St Martin) (1 review)
- ⚠️ St Maarten tem hotelaria boa fraca em geral, e piorou ainda mais depois do furacão; praias lindas mas pouca estrutura de restaurantes por perto — É o hotel mais top da ilha _(por Humberto Murakami, 2022-03-09)_

### La Villa Florentine (1 review)
- ⚠️ Não curtiu: tem uma escadaria para descer ao centrinho considerada 'matadora'. _(por Elaine Scanavacca / ES Turismo, 2021-09-28)_

### Lake Villas (1 review)
- ⚠️ Withdrew rate/availability information once told the booking was for an agency and demanded email-only contact, while offering direct clients installment payment. Another agent alleges past use of forced/slave labor. _(por Humberto Murakami, 2021-07-30)_

### Le Barthélemy Hotel & Spa (1 review)
- ⚠️ Evitar vender categoria de entrada; quartos grudados/pequenos, piscina e praia pequenas. — estético _(por Fernanda Credidio Agencia, 2024-02-27)_

### Le Burgundy (7 reviews) _(mescladas de: Burgundy Hotel)_
- ⚠️ Um pax achou o room service pouco flexível para crianças e achou o hotel um pouco datado. — Vende muito, hóspedes voltam (até 3ª vez), Melhor custo-benefício entre 5 estrelas de Paris _(por Elaine Scanavacca Agencia, 2023-02-15)_
- Vende bastante, nunca teve reclamação _(por Ucha Verissimo Agencia, 2023-02-15)_
- ⚠️ Feedback de grupo de clientes. — Quarto show, Early check-in, Serviço ótimo _(por Luis Sassi Flaptur, 2023-06-07)_
- ⚠️ Estadia em grupo com Fernanda Credidio Agencia e Tati Assad no ano anterior (2022). — Foi demais _(por Danielle Coltro, 2023-06-07)_
- Adorou quando se hospedou _(por Carol Cordeiro Agencia, 2023-06-07)_
- Localização e serviço impecáveis _(por Juliana Haus 22, 2023-06-07)_
- ⚠️ Clientes em dez/jan tiveram problemas nos quartos, que são todos diferentes; hotel deu upgrade que não agradou (quarto com escada para pessoa idosa); tem quartos de entrada bem pequenos. _(por Laryssa Siqueira Trivia / Trivia, 2026-02-20)_

### Le Burgundy Paris (1 review)
- ⚠️ Pode ser vendido de olhos fechados. — impecavel, localizacao excelente _(por Marcia Polacow / Team Travel, 2021-11-27)_

### Le Colombier Colmar - Design Hotel Centre Ville (1 review)
- ⚠️ cuidado, existe quarto com janela muito pequena — fotos dos quartos parecem modernas, pode ter sido reformado _(por Tuca / Fernanda Helou, 2023-06-27)_

### Le Coquillade (1 review)
- Adorou _(por Ucha Verissimo Agencia, 2022-04-26)_

### Le Guanahani (1 review)
- ✅ Villa de 2 quartos na praia. — Villa de 2 quartos na praia incrivel, Piscina ao lado, otimo para criancas e adultos _(por Humberto Murakami / Get Out N About Travel, 2025-02-17)_

### Le Keppler Paris (1 review)
- ⚠️ outra agente achou mega apertado numa estadia anterior — boa opção, tarifa razoável _(por Danielle Coltro / Elaine Scanavacca, 2023-11-28)_

### Le Sereno St Barth (2 reviews) _(mescladas de: Le Sereno (St Barth))_
- ⚠️ Na visita do agente, havia acúmulo de algas na praia em frente ao Le Sereno, por ficar no canto da praia — Fica bem ao lado do Le Barthélemy _(por Marcus Carneiro, 2022-03-24)_
- ⚠️ Precisa de reforma (mais antigo). — quartos espalhados, praia com mais espaço, privacidade _(por Fernanda Credidio Agencia, 2024-02-27)_

### Le Strato Courchevel (1 review)
- ⚠️ Nao amou os banheiros. — Chales de diferentes tamanhos _(por Vivi Yuri Agencia, 2025-03-21)_

### Les Arcs Panorama (Club Med) (1 review)
- ✅ Espaço 5 tridentes com serviços diferenciados (prioridade em restaurantes, check-in diferenciado). — ⚠️ Dois relatos de outras agências dizem que os clientes detestaram/não gostaram. — ski-in/out, 425km de pistas, bom para família 0-17 anos _(por Laryssa Siqueira Trivia, 2024-02-26)_

### Lido Palace (1 review)
- adorou Riva del Garda, no norte do lago _(por Ucha Verissimo, 2023-06-28)_

### Llao Llao (1 review)
- ⚠️ Nao tem mais representante no Brasil desde a saida de contato anterior; dificil receber comissao; recomenda-se vender via DMC. _(por Fernanda Balestra, 2025-03-31)_

### Loews Miami Beach (3 reviews)
- ⚠️ Barulho de balada, elevador quebrado, quarto sem ar condicionado _(por Tuca Socia Fernanda Helou, 2026-05-12)_
- ⚠️ Quartos ruins costumam ser os reservados via Booking.com; reservas diretas recebem quartos bons _(por Elaine Scanavacca Agencia, 2026-05-12)_
- Hotel sempre lotado _(por Guilherme Polacow Team Travel, 2026-05-12)_

### Londra Palace (1 review)
- Relais Chateau reformado, banheiros lindos, vista linda, clássico bonito tipo Copacabana Palace atual _(por Elaine Scanavacca Agencia / ES Viagens, 2024-08-19)_

### Los Cauquenes (2 reviews)
- ⚠️ não pensado para famílias, público mais de casais — mais elegante e intimista que o Arakur, ótimo feedback vendendo para casais _(por Dani Filippozzi, 2025-10-02)_
- acha melhor opção que o Arakur para casais _(por Tuca Socia Fernanda Helou, 2025-10-02)_

### Lotte Hotel (2 reviews)
- ⚠️ Apartamentos 'normais' (não-Towers) estão péssimos; cliente teve problema em janeiro/2023 até conseguirem trocar para a Towers; reforma total prevista só para 2024 - recomenda ficar só na Towers. _(por Marcia Polacow Agencia, 2023-02-23)_
- Towers foi ótimo, pax não reclamaram _(por Fernanda Helou, 2023-02-23)_

### Lotte New York Palace (3 reviews)
- fantastic _(por Fernanda Helou, 2021-05-21)_
- liked it a lot _(por Ana Roberta Haus 22, 2021-05-21)_
- ⚠️ Vale a pena apenas se o cliente tiver orçamento maior (categoria mais cara). — Quartos da categoria Towers são melhores, com elevadores separados _(por Fernanda Helou, 2022-11-25)_

### Lungarno Collection (1 review)
- incrível, novinho, recém reformado _(por Guilherme Polacow / Team Travel, 2023-07-26)_

### Lutetia Paris (1 review)
- ⚠️ Feedback negativo do pax após a venda. _(por Patricia Lumy, 2024-06-28)_

### Maalot (1 review)
- Super descolado, Mais intimista _(por Franciele Nascimento Condor Turismo, 2023-03-23)_

### Majestic Hotel & Spa Barcelona (1 review)
- ⚠️ Hotel ofereceu cupom de desconto direto no site ao cliente, minando reserva feita pela agência via consórcios (Elite/Leading/Vita); agente recomendou não indicar mais o hotel. _(por Fernanda Balestra, 2024-02-16)_

### Mala Mala (1 review)
- ⚠️ Ficou hospedada no Ratray's; visitou os outros 2 lodges e pareciam bem bons. — Comida maravilhosa, Ranger excelente _(por Claudia Bernardo / Six Viagens, 2026-03-19)_

### Mandapa, a Ritz-Carlton Reserve (1 review)
- Colocou lua de mel no Mandapa e no Bulgari; clientes preferiram o Mandapa _(por Dani Filippozzi, 2026-06-22)_

### Mandarin Oriental Barcelona (1 review)
- ⚠️ O quarto de entrada é meio pequeno e sem graça — Localização perfeita, Hotel muito bonito, Ótimos restaurantes, Serviço/staff (intermediários) ótimos, Café da manhã era maravilhoso antes da pandemia _(por Marcus Carneiro, 2022-01-20)_

### Mandarin Oriental Bodrum (1 review)
- ⚠️ visitado há 8 anos (a partir da mensagem de 2025-08-29), início de outubro; beach club já sem nenhum aberto nessa época — restaurantes da marina ainda abertos em início de outubro, passeio de barco e praia do hotel aproveitáveis _(por Ana Roberta Haus 22, 2025-08-29)_

### Mandarin Oriental Doha (1 review)
- Amou a experiência, Bairro descolado (Mshaireb) _(por Laryssa Siqueira Trivia, 2023-04-20)_

### Mandarin Oriental Emirates Palace Abu Dhabi (1 review)
- ✅ brunch de sexta-feira — ⚠️ restaurantes muito caros; acesso restrito sem reserva, como o Burj Al Arab; não é muito aconchegante por conta da escala monumental — pé direito altíssimo, lustres imensos, réplica de palácio, quarto suíte de 2 quartos, imenso, pôr do sol mais lindo do mundo, brunch de sexta-feira ótimo, no jardim _(por Elaine Scanavacca, 2023-07-24)_

### Mandarin Oriental Lago di Como (1 review)
- ⚠️ Localização ruim, segundo a agente — Hotel lindo _(por Maria Amelia Agencia, 2022-03-05)_

### Mandarin Oriental Madrid (2 reviews) _(mescladas de: Mandarin Oriental Madrid (Ritz))_
- Muito melhor que o Palace Madrid na mesma viagem _(por Elaine Scanavacca / Elaine Scanavacca Agencia, 2026-02-25)_
- Amou ficar lá, Tem um charme que não sentiu no Four Seasons Madrid _(por Elaine Scanavacca Agencia, 2026-07-02)_

### Mandarin Oriental Marrakech (2 reviews)
- Hóspedes que passaram o Réveillon lá amaram _(por Ucha Verissimo Agencia, 2023-01-13)_
- Programa infantil elogiado: aulas de culinária e cerâmica _(por Elaine Scanavacca Agencia, 2023-01-13)_

### Mandarin Oriental Miami (2 reviews) _(mescladas de: Mandarin Oriental Miami (Brickell))_
- ⚠️ Quartos estão precisando de renovação; se a tarifa estiver alta, não vale. — Localização ótima, shopping embaixo _(por Patricia Lumy, 2026-03-05)_
- boas tarifas apesar de antigo (em torno de USD 380), gostei de ficar _(por Vivi Yuri Agencia, 2024-07-12)_

### Mandarin Oriental New York (1 review)
- ⚠️ location described as 'mais ou menos' (so-so) — better for guests who already know NYC — loved room, restaurant _(por Humberto Murakami, 2020-11-17)_

### Mandarin Oriental Singapore (1 review)
- já ficou 3 vezes e adorou _(por Marcia Polacow Agencia, 2024-04-08)_

### Marbella Club Hotel Golf Resort & Spa (2 reviews)
- Clientes colocados lá adoraram _(por Humberto Murakami, 2023-04-05)_
- Esteve lá e 'pirou', considera o máximo _(por Tati Assad, 2023-04-06)_

### Margutta 19 (1 review)
- ⚠️ Não tem lobby nem recepção tradicional - elevador fica logo na entrada. — hóspedes amam e voltam, vende muito bem _(por Ana Terra, 2024-03-04)_

### Maria Bonita (Noronha) (2 reviews)
- ⚠️ não é para "gente fresca" (perfil mais simples) _(por Humberto Murakami, 2025-09-18)_
- ⚠️ não tem vista nenhuma — muito bem localizado no centro, adorou o serviço, concierge ótimo _(por Dani Filippozzi, 2025-09-20)_

### Maria Cristina (1 review)
- Melhor hotel de San Sebastián, Tem quartos conectados (propriedade Marriott) _(por Beto Nascimento / Flaptur, 2026-01-30)_

### Marina Bay Sands (3 reviews)
- ⚠️ parece um aeroporto, lobby gigante e mega movimentado, piscina superlotada ('piscinão de Ramos') _(por Marcia Polacow, 2023-06-20)_
- ⚠️ Parece um aeroporto, movimento excessivo. _(por Marcia Polacow Agencia, 2024-04-08)_
- ⚠️ Piscina considerada cafona/farofa; entra muita gente. _(por Tuca Socia Fernanda Helou, 2024-04-08)_

### Marques de Riscal (3 reviews)
- Maravilhoso _(por Humberto Murakami, 2023-05-15)_
- ⚠️ Um pouco desgastado ('cansadito') — Arquitetura impressionante, Vinhos muito apreciados _(por Beto Nascimento Flaptur, 2026-07-03)_
- Arquitetura realmente impressiona _(por Vivi Yuri Agencia, 2026-07-03)_

### Marriott Geneva Airport Hotel (1 review)
- ⚠️ não é dentro do terminal, mas tem shuttle a cada 20 min — maravilhoso, já ficou lá e colocou vários clientes, todos amam _(por Humberto Murakami / Maria Amelia, 2024-01-04)_

### Marriott Niagara Falls Fallsview (1 review)
- Suíte com a cama virada para as quedas e uma janela de vidro enorme com vista frontal das Cataratas do Niágara, É o único hotel identificado com esse tipo de suíte de frente para as quedas _(por Humberto Murakami, 2022-01-26)_

### Martinhal Chiado (1 review)
- Incrível, Excelente localização _(por Maria Amelia Agencia, 2023-05-10)_

### Martinhal Lisbon Chiado (2 reviews)
- amou, pax sempre adoram _(por Fernanda Helou, 2026-01-08)_
- amou muito _(por Danielle Coltro, 2026-01-08)_

### Martinhal Sagres (2 reviews)
- Quartos novos de frente para o mar são um espetáculo _(por Maria Amelia Agencia, 2023-05-24)_
- Visitou e amou _(por Ana Roberta Haus 22, 2023-05-24)_

### Mas de Torrent (2 reviews)
- É R&C (Relais & Châteaux), Tem restaurante Michelin, Hotel bem charmoso _(por Vivi Yuri Agencia, 2026-05-25)_
- Feedback bom, Ficou hospedada há 18 anos e amou _(por Ana Roberta Haus 22, 2026-05-25)_

### Masseria San Domenico (1 review)
- clientes ("os Barone") foram conhecer e acharam super bonita, perto da Torre Maizza _(por Elaine Scanavacca Agencia, 2025-08-28)_

### Masseria Torre Coccaro (1 review)
- ⚠️ Hospede achou simples/despretensioso (cadeiras de piscina de plastico), esperava mais, mas foi bem brifado e pagou metade do preco do Borgo Egnazia. _(por Elaine Scanavacca Agencia, 2025-03-12)_

### Maui Maresias (1 review)
- Já vendemos e os clientes gostaram _(por Fernanda Credidio Agencia, 2022-02-08)_

### Mayfair Paris (1 review)
- Clientes super felizes com o hotel, após indicação de Fernanda Helou _(por Ana Roberta Haus 22 / Haus 22, 2022-01-05)_

### Maçakizi (Bodrum) (2 reviews)
- Fica perto das coisas (ao contrário do Edition e Six Senses, que ficam longe) _(por Elaine Scanavacca Agencia, 2022-03-07)_
- ⚠️ Pax do ano anterior reclamou que não conseguia ir a pé a lugar nenhum (nem para tomar sorvete), se sentiu 'preso' _(por Fernanda Balestra, 2022-03-07)_

### Melia Iguazu (1 review)
- ⚠️ Preço igual ou maior que o do Belmond na região. — Adorou a visita _(por Elaine Scanavacca Agencia, 2023-05-25)_

### Melia The Level (1 review)
- ⚠️ best for mid-tier ('cliente mediano') budget clients _(por Humberto Murakami, 2020-10-28)_

### Meliá Cala Galdana (1 review)
- ⚠️ hotel mais antigo da região, mas com a melhor praia — cliente adorou, praia super gostosa, possível passeio de barco ou carro até outras praias, renovado recentemente _(por Fernanda Credidio / Fernanda Helou, 2023-07-13)_

### Meliá Paradisus Punta Cana (1 review)
- ✅ book the 'Reserve' area for better amenities — ⚠️ direct site pays 20% commission but no installments — recommended pick for Punta Cana _(por Humberto Murakami, 2021-05-14)_

### Meridien (1 review)
- ⚠️ about 1h from town's interesting areas — quite good _(por Elaine Scanavacca Agencia, 2021-04-20)_

### METT Bodrum (1 review)
- ⚠️ localização mais na cidade de Bodrum, mais longe da Scorpios/Mandarin/Edition/marina — tarifa excelente _(por Beto Nascimento Flaptur, 2025-08-29)_

### MGallery (Islândia) (1 review)
- ⚠️ Moderninho, mas entrava vento pela janela _(por Elaine Scanavacca Agencia, 2026-07-13)_

### Mirante do Gavião (3 reviews)
- Melhor comida entre lodges da Amazônia, Experiências genuínas e autênticas, Pegada autêntica, diferente do Anavilhanas, Clientes nunca saíram decepcionados, sempre amam _(por Fernanda Credidio Agencia, 2022-09-29)_
- Design bom, Comida ótima _(por Danielle Coltro, 2022-09-29)_
- ✅ ir a pé até Novo Airão ou visitar a Fundação Malaquias (loja de móveis e madeira, projeto sócio-ambiental do Ruy) — ⚠️ mais próximo do vilarejo de Novo Airão do que o Anavilhanas; quem quer ficar mais afastado da civilização, o Anavilhanas é mais indicado — decoração e gastronomia excelentes, vista linda do rio a partir dos quartos, que ficam no alto, deck para drinks ou nadar no rio ao fim da tarde, design moderno e de bom gosto, chef famosa, a mesma do restaurante Caxiri _(por Danielle Coltro, 2025-09-09)_

### Mitsui Kyoto (1 review)
- ⚠️ Café da manhã peca bastante, único ponto negativo. — lindo, ótimas acomodações, serviço bom _(por Humberto Murakami, 2024-07-10)_

### Mnemba Island Lodge (1 review)
- ✅ Very high-end, celebrity-favorite property. — Extremely private, amazing _(por Danielle Coltro, 2021-06-05)_

### Monastero di Cortona (2 reviews)
- ⚠️ Não se chega ao hotel de carro, precisa estacionar fora e caminhar. — agradável, cidade charmosa _(por Beto Nascimento Flaptur, 2024-04-09)_
- hotel igualou tarifa do Booking.com e reconheceu 10% de comissão para a agência - postura correta _(por Ana Roberta Haus 22, 2024-04-12)_

### Mondrian South Beach (1 review)
- ⚠️ Vender apenas quartos reformados. — cliente satisfeito, só pediu early check-in _(por Guilherme Polacow Team Travel, 2024-03-06)_

### Morada dos Canyons (1 review)
- ✅ Chale simples sem vista dos canyons (segundo o proprio agente, tao bom quanto os com vista). — ⚠️ Comida boa mas menos sofisticada que o Parador; comissao nao paga em reserva feita direto. — Spa incrivel com suite surreal, Vista dos canyons imbativel de todos os lados, Diferentes tipos de chale _(por Beto Nascimento Flaptur / Flaptur, 2025-02-23)_

### Morena (1 review)
- ⚠️ regional/rustic standard, not ultra-luxury; refuses installment payments via agency — demanding client liked it _(por Patricia Mil Homens Agencia, 2021-05-14)_

### Mr. C Miami Coconut Grove (1 review)
- novo, descolado, descontraído, área revitalizada com bons restaurantes e bares, vale oferecer pro cliente _(por Fernanda Helou, 2024-06-01)_

### Museum Hotel Capadócia (1 review)
- ⚠️ Pessoal que voltou recentemente da Turquia disse que o hotel foi uma decepção, está cansado e passado. _(por Elaine Scanavacca Agencia, 2024-08-06)_

### Myconian Ambassador (1 review)
- gostei bem _(por Elaine Scanavacca, 2023-12-19)_

### Myconian Villa (1 review)
- Todos os clientes amaram _(por Fernanda Helou, 2026-06-22)_

### Nannai Beach Resort (2 reviews)
- Feedback maravilhoso _(por Patricia Lumy, 2022-10-28)_
- Hotel considerado lindo, segundo relato de amiga que se hospedou e amou _(por Fernanda Helou, 2022-10-28)_

### Nannai Resort & Spa (3 reviews)
- Clientes adoraram, inclusive famílias com crianças _(por Patricia Lumy, 2023-03-20)_
- Pax com 2 filhos ficou em bangalô com piscina privativa e gostou muito _(por Elaine Scanavacca Agencia, 2023-03-20)_
- ⚠️ Em julho venta bastante e chove; ficou alguns dias no bangalô por causa da chuva, mas também teve dias lindos. — Comida boa, Babás boas _(por Laryssa Siqueira Trivia, 2023-03-24)_

### Nau Hotel Camburi (1 review)
- unanimidade entre os agentes como melhor do litoral norte _(por Beto Nascimento / Fernanda Helou / Flaptur, 2023-12-19)_

### Nayara Springs / Nayara Tented Camp (1 review)
- ⚠️ Nayara Tented Camp está lotado — visitou o Nayara Springs, achou muito legal _(por Ucha Verissimo / Vivi Yuri, 2023-10-23)_

### NH Barbizon Palace Amsterdam (1 review)
- bem ok, quarto bom, pertinho da estação central _(por Guilherme Polacow Team Travel, 2024-05-16)_

### NH Collection Plaza Santiago (1 review)
- ⚠️ Não dá para esperar muito do serviço — Quartos bons, Localização ótima, Bom 4 estrelas _(por Fernanda Credidio Agencia, 2022-03-04)_

### NH Taormina (1 review)
- ⚠️ em agosto o único quarto de entrada disponível custava €710/noite com apenas 20m², possivelmente vista garagem _(por Humberto Murakami, 2023-07-17)_

### Niyama Maldives (1 review)
- ⚠️ couple had little basis for comparison — young couple liked it _(por Tati Assad, 2021-04-27)_

### Niyama Private Islands Maldives (4 reviews) _(mescladas de: Niyama Private Island, Niyama Private Islands)_
- Descrito como "o maximo" _(por Fernanda Balestra, 2025-02-24)_
- ✅ Best resort for surfers per guest feedback. — Surfing clients loved it _(por Fernanda Balestra, 2021-05-26)_
- Surfer clients specifically requested it, called it the best for surfing _(por Giovana Polotto Agencia, 2021-05-26)_
- clientes amaram, todo mundo gosta _(por Ana Roberta / Vivi Yuri / Haus 22, 2024-01-04)_

### Nizuc Resort & Spa (4 reviews)
- doesn't feel like typical Cancún _(por Humberto Murakami, 2021-05-12)_
- loves it _(por Patricia Mil Homens Agencia, 2021-05-12)_
- ⚠️ Felt more like a standard resort than refined; central pool bar had visible trash and a bad smell. — Good rooms with private pool, protected calm beach thanks to a reef _(por Fernanda Helou, 2021-07-01)_
- ✅ Book rooms close to the main building, or pool villas if budget allows. — Very satisfied, consistently good client feedback _(por Ucha Verissimo Agencia, 2021-08-07)_

### Nobis Hotel Copenhagen (1 review)
- Vendeu em janeiro e clientes adoraram _(por Laryssa Siqueira Trivia, 2026-06-30)_

### Nobu Hotel Ibiza (1 review)
- Feedback geral dos clientes é positivo _(por Marcus Carneiro, 2023-01-14)_

### Nobu Marrakech (1 review)
- clientes gostaram bastante, tarifa boa _(por Ucha Verissimo Agencia, 2024-03-21)_

### Nolinski Venezia (1 review)
- ⚠️ Bem boutique, sem academia; quartos da mesma categoria variam de tamanho. — Atendimento muito bom _(por Caroline Assad Audi TA Travel, 2025-02-04)_

### Nomade Hotel (2 reviews)
- ⚠️ Cut off the agency's commission on the booking entirely. — A relative staying there for work loved it _(por Elaine Scanavacca Agencia, 2021-07-22)_
- ⚠️ Blocked an agency booking for New Year's (claimed to be sold out) but confirmed instantly when the same client called direct. _(por Luis Sassi Flaptur, 2021-07-22)_

### Nomade Tulum (2 reviews)
- bem bacana, vizinho do Be Tulum, dá pra visitar o restaurante/beach club dele no mesmo dia _(por Beto Nascimento Flaptur, 2025-10-08)_
- ⚠️ Quartos tipo acampamento de escola; quarto casa na árvore chegava a ~45 graus com só ventilador; achou que não dá pra mandar cliente a menos que ele mesmo peça. _(por Fernanda Helou, 2026-02-20)_

### Nos Hotel (1 review)
- Não há opção 'top' na ilha de Sifnos, mas o hotel agradou _(por Marcia Polacow Agencia, 2026-04-29)_

### Novotel Bosphorus (1 review)
- ⚠️ Quartos são padrão Novotel (nada especial), mas o hotel em geral é bacana. — Spa bom, Café da manhã excelente _(por Vivi Yuri / Vivi Yuri Agencia, 2026-02-03)_

### Novotel Itu (1 review)
- ⚠️ Comida fraca segundo a própria agente e confirmado por cliente de outra agente. — dois parques aquaticos pequenos por idade, piscina aquecida no spa, trapezio e recreacao _(por Carol Cordeiro / Carol Cordeiro Viagens, 2021-10-13)_

### Oberoi (Nile cruise) (1 review)
- marvelous, personal experience _(por Ana Terra, 2021-04-22)_

### Octant Douro (1 review)
- ✅ Piquenique organizado pelo guest relation (Lorenzo) na Ilha dos Amores, com queijos, vinhos e frutas — ⚠️ Não fica no Douro vinhateiro propriamente (onde estão as vinícolas); fica em região próxima ao Porto. — Vistas dos quartos espetaculares, Hotel chic, Restaurante do hotel bem gostoso, Restaurante à parte com menu degustação de 10 etapas, Piscina com vista deslumbrante, saunas seca e úmida, Funciona bem para família com bebê de 1 ano _(por Fernanda Balestra, 2022-08-12)_

### OKU Ibiza (2 reviews) _(mescladas de: Oku Ibiza)_
- ⚠️ Mais parece um resort do que um hotel boutique. — Quartos grandes, Serviço bom, Ótimo esquema para famílias _(por Fernanda Credidio Agencia, 2022-08-26)_
- ⚠️ Mais rústico. — adorei, perto das praias mais bonitas _(por Laryssa Siqueira Trivia, 2024-06-08)_

### One South Beach (1 review)
- ⚠️ Continues sending frequent direct-booking marketing emails to the guest even after the reservation was made through the agency. _(por Luis Sassi Flaptur, 2021-07-16)_

### One&Only (África do Sul) (1 review)
- ⚠️ Mesmo com a diretora do hotel mostrando o cofre pessoalmente a cada hóspede, houve furto durante a estadia. _(por Elaine Scanavacca Agencia, 2022-09-19)_

### One&Only Reethi Rah (1 review)
- ⚠️ 2-bedroom villa pricing described as excessive _(por Humberto Murakami, 2021-03-18)_

### One&Only Royal Mirage/The Palm Dubai (1 review)
- Marvelous _(por Fernanda Helou, 2021-06-24)_

### Ort Hotel (1 review)
- new hotel, good feedback _(por Juliana Haus 22, 2021-04-19)_

### Ortea Palace Syracuse (1 review)
- ⚠️ Considerado o melhor hotel de Siracusa, mas decoração de gosto muito ruim/'medonho'. _(por Marcia Polacow Agencia, 2024-03-08)_

### Palacio Gran Vía (1 review)
- família com 2 filhas adolescentes gostou bastante _(por Bia Parra / Trivia Viagens, 2024-08-20)_

### Palafitos Overwater Bungalows, El Dorado Maroma (1 review)
- ⚠️ Estrutura vista pessoalmente parecia abandonada, muito feia. _(por Fernanda Helou, 2024-04-08)_

### Palazzo Bozzi Corsi by La Fiermontina (2 reviews) _(mescladas de: Palazzo Bozzi Corso (Fiermontina))_
- Considera o melhor hotel de Lecce _(por Elaine Scanavacca Agencia, 2023-04-25)_
- amei _(por Elaine Scanavacca Agencia, 2024-05-15)_

### Palmaia - The Royal Beach (2 reviews)
- ⚠️ Compared favorably to the Banyan Tree, which the agent found had almost no usable beach due to seaweed. _(por Elaine Scanavacca Agencia, 2021-06-23)_
- ⚠️ Room buildings' plain style clashes with the charming common areas; slow golf-cart shuttle service. — Best beach among the Riviera Maya hotels compared, little sargassum, private and secluded feel, good spa with private cenote _(por Fernanda Helou, 2021-07-01)_

### Palácio de Estoi (Small Luxury Hotels) (3 reviews)
- Cliente adorou (antes da pandemia) _(por Tati Assad, 2022-02-24)_
- ⚠️ Hóspede achou meio velho, com 'cheiro de velho', sensação de muito cansado — É histórico _(por Marcus Carneiro, 2022-02-24)_
- Fez grupo lá, muito top, estilo Copa, adoraram _(por Maria Amelia Agencia, 2022-02-24)_

### Palácio Tangará (2 reviews)
- Melhor spa (comparado ao Fasano), Mais opções gastronômicas, Melhores quartos _(por Humberto Murakami, 2023-02-28)_
- Considerado o melhor spa entre os três (Fasano, Emiliano, Tangará), Piscina coberta grande e elogiada _(por Marcia Polacow Agencia, 2023-03-30)_

### Parador Cambara do Sul (4 reviews) _(mescladas de: Parador Cambará do Sul)_
- ⚠️ Comida considerada mediana apesar do hotel/servico bons. — Quartos em formato de barril muito elogiados _(por Vivi Yuri Agencia, 2025-02-23)_
- ✅ lounge de queijos e passeio de balão — ⚠️ comida mediana; passeios têm sobretaxa alta; chuva impediu passeios na visita (dezembro, ano não especificado); 1ª categoria bonitinha mas móveis grandes deixam o quarto apertado; 2ª categoria tem jacuzzi no deck da frente mas perde privacidade — casulos são lindos, com jacuzzi nos fundos, vista linda e privativos, cama deliciosa _(por Elaine Scanavacca Agencia, 2025-09-12)_
- ⚠️ quando visitou a categoria "casulo" ainda não existia; considera os casulos pequenos e prefere as suítes, que são maiores (depende do perfil do cliente) — camas boas, enxoval bom, comida boa, passeios organizados com guias próprios: cavalo, bike, caminhadas, canyons imperdíveis _(por Fernanda Credidio Agencia, 2025-09-12)_
- parador muito lindo, região e canyons lindos _(por Pedro Alvarenga Irmao Scanavacca, 2025-09-12)_

### Paragon 700 (1 review)
- ⚠️ Sobrinha da agente reclamou de falta de atencao/servico (pediram balde de gelo e o garcom mandou pegar no bar); casal nao gostou apesar do conceito de "se sentir em casa". — Bom valor _(por Elaine Scanavacca Agencia, 2025-04-14)_

### Park Hyatt Buenos Aires (Palacio Duhau) (1 review)
- Cliente recente amou _(por Marcia Polacow Agencia, 2023-05-03)_

### Park Hyatt Buenos Aires / Sofitel Recoleta (1 review)
- clientes adoraram o Park Hyatt, ótimo feedback do Sofitel Recoleta _(por Marcia Polacow, 2023-11-08)_

### Park Hyatt Kyoto (1 review)
- Localização perfeita perto de ruas e templos importantes, Food hall do Park Hyatt na frente do hotel _(por Laryssa Siqueira Trivia, 2026-06-15)_

### Park Hyatt Vienna (1 review)
- Localização excelente _(por Guilherme Polacow Team Travel, 2022-03-13)_

### Park Hyatt Zurich (1 review)
- ⚠️ Tem mais cara de hotel corporativo (corredores, café da manhã e quartos). — Funciona bem _(por Bia Parra, 2023-03-17)_

### Park Lane (NYC) (1 review)
- É Preferred, Localização boa, Foi inteiro reformado, Tarifa barata para NYC _(por Tati Assad, 2022-01-13)_

### Park Lane Hotel (3 reviews)
- ⚠️ bad breakfast; some rooms old; expensive relative to alternatives — large rooms, beautiful park views _(por Fernanda Helou, 2021-05-21)_
- ⚠️ visited when hotel had no running water; run-down _(por Ana Roberta Haus 22, 2021-05-21)_
- ⚠️ Relato pontual de familia dizendo que a frequencia do lobby estava esquisita. — Hotel reformado, otimo _(por Tati Assad, 2025-03-07)_

### Park Lane Hotel New York (1 review)
- ⚠️ não tem vista de cidade boa; hotel ok mas não é do nível Four Seasons/The Pierre/Waldorf Astoria — reformado durante a pandemia, não está datado, clientes recentes (novembro) tiveram experiência adequada _(por Vivi Yuri Agencia, 2025-12-22)_

### Parklane Hotel New York (3 reviews)
- Clientes voltam todo ano e gostam, Gostam do tamanho do quarto, No geral atende bem _(por Vivi Yuri Agencia, 2026-06-10)_
- ✅ Pedir quarto em andar alto com vista para o parque — ⚠️ Se a tarifa não incluir café da manhã, cobram USD 75/pessoa para tomar no hotel _(por Ana Terra, 2026-06-10)_
- ⚠️ Café da manhã não vale a pena (caro); há cafés melhores nas proximidades — Feedback bom, Hotel reformado, Serviço em ordem _(por Fernanda Helou, 2026-06-10)_

### Passiom (1 review)
- ⚠️ Família (marido e filhos) não curtiu; serviço avaliado como ruim. _(por Luis Sassi Flaptur, 2022-08-19)_

### Pata Lodge (Patagônia) (1 review)
- ⚠️ Não há onde sair para comer fora; comida boa mas não variava muito. — gostaram, eh lindo _(por Fernanda Balestra, 2024-06-07)_

### Patina Maldives (1 review)
- excellent cuisine, huge rooms, brand new property _(por Giovana Polotto, 2021-03-18)_

### Patria Palace Lecce (1 review)
- ⚠️ Bom para pax normal, mas para pax sofisticado o Palazzo Bozzi Corso é superior. — gostei desse hotel _(por Elaine Scanavacca Agencia, 2024-05-15)_

### Pavillon de la Reine / Pavillon Saint-Germain (1 review)
- ⚠️ quartos a partir de €900/noite, categoria Jr Suite saiu por €1.500 para 3 pessoas — tarifa negociada de €800 via representante, considerada 'super boa' _(por Humberto Murakami / Elaine Scanavacca, 2023-08-25)_

### Pedras do Patacho (2 reviews)
- ⚠️ Guest's room flooded and an elderly relative fell and was injured; management admitted this is a recurring problem in that room type. _(por Luis Sassi Flaptur, 2021-06-15)_
- Stayed there recently (around the same time as this report): found it lovely for a week _(por Bia Parra, 2021-06-15)_

### Peisey Vallandry (Club Med) (1 review)
- ⚠️ Aquecimento do quarto quebrado (fora estava -15C), demoraram mais de 1 dia para conserto; restaurante caótico; sala de esqui sem bancos para sentar; funcionário de manutenção ouvido reclamando ao telefone sobre o problema. _(por Elaine Scanavacca / Elaine Scanavacca Agencia, 2026-01-16)_

### Pendry San Diego (1 review)
- ⚠️ Achou "fraquinho" apos 1 noite. _(por Ucha Verissimo Agencia, 2025-02-17)_

### Pera Palace (1 review)
- ⚠️ Clima 'Agatha Christie', muito específico, pode não agradar todo perfil de cliente. _(por Elaine Scanavacca Agencia, 2024-02-07)_

### Pera Palace Istanbul (1 review)
- ⚠️ sem contato local no Brasil; outra agente achou 'muito vintage' numa visita antiga — todo mundo gosta, mega histórico, localização boa, quartos grandes _(por Fernanda Credidio / Elaine Scanavacca, 2023-11-06)_

### Pestana Palácio do Freixo (Porto) (1 review)
- ⚠️ Fica longe do centro do Porto — Gostou da área da piscina _(por Humberto Murakami, 2022-03-14)_

### Pevero Hotel (1 review)
- ⚠️ Precisa de carro próprio - região com pouquíssimo táxi disponível. — Café excelente, Área externa ótima com várias piscinas, Acesso fácil à praia, Boa localização _(por Fernanda Balestra, 2023-06-09)_

### Pine Cliffs Hotel (Algarve) (1 review)
- ⚠️ Fica no alto, precisa de carro (tem elevador até a praia). — clientes amaram _(por Fernanda Helou, 2024-07-26)_

### Pine Cliffs Resort (4 reviews) _(mescladas de: Pine Cliffs)_
- ⚠️ Precisa descer um elevador para chegar à praia — Super estrutura, restaurantes, kids club frente mar _(por Fernanda Credidio Agencia, 2022-04-25)_
- Já ficou e achou bom _(por Laryssa Siqueira Trivia, 2022-04-25)_
- ⚠️ Resort muito grande; uma cliente reclamou um pouco do restaurante e da comida (achou apenas ok). — Família gostou bastante _(por Vivi Yuri Agencia, 2023-05-25)_
- clientes amaram, villas de 3-4 quartos com ótimo custo-benefício, atende bem família e casal _(por Humberto Murakami, 2023-11-22)_

### Pire Hue (1 review)
- ⚠️ Hotel velho, 'caindo aos pedaços'. _(por Tuca Socia Fernanda Helou, 2024-02-08)_

### Ponta dos Ganchos (1 review)
- ⚠️ Às vezes parece meio cansado (instalações) — Hóspedes disseram nunca ter visto serviço tão surreal de bom, tudo impecável _(por Fernanda Helou, 2022-04-13)_

### Portillo (4 reviews)
- ⚠️ Feedback de cliente: hotel muito velho, comida apenas ok, quartos muito pequenos (categoria antiga), banheiro cabia só 1 pessoa; avaliação de que não dá para recomendar. _(por Tati Assad, 2022-07-13)_
- ⚠️ Hotel já era velho há alguns anos, na época em que a agente esteve lá. — Garçons e comida ótimos _(por Danielle Coltro, 2022-07-13)_
- ⚠️ Anos atrás achou o hotel fraco; ouviu dizer que reformaram, mas segue reserva sobre a real melhoria. _(por Fernanda Helou, 2022-07-13)_
- ⚠️ Hotel bem fraquinho; preços na faixa de USD 5.000 e sempre lotado; não entende tanto badalo. — Comida muito boa, Pistas de ski boas _(por Pedro Alvarenga / Irmao Scanavacca, 2026-04-08)_

### Posada Terra Santa (1 review)
- ⚠️ Zero serviço; disponibilidade ruim; agência decidiu não vender mais — Hóspedes gostaram dos quartos e da decoração, acharam lindo _(por Fernanda Helou, 2026-06-21)_

### Post Ranch Inn (Big Sur) (1 review)
- Luxo descontraído, não tão tradicional, Vista surreal, dá para ver o mar, Comida ótima, Quartos de vários tipos, incluindo estilo casa na árvore, Piscina no meio das nuvens _(por Fernanda Helou, 2022-01-06)_

### Pousada Amendoeira (2 reviews)
- ⚠️ Propriedade simples; não tem piscina. — Serviço bom, Comida boa, Boa localização _(por Fernanda Helou, 2022-08-12)_
- ⚠️ Piscina não estava pronta na visita (inauguraria logo depois) — staff surreal, café da manhã excelente à la carte com pão sem glúten sob demanda, comida ótima, ao lado de beach club famoso _(por Fernanda Balestra / FB Travel, 2024-09-02)_

### Pousada Bahia Bonita (1 review)
- ⚠️ refused refund/credit for 2 cancellations; ignored WhatsApp and email for weeks _(por Ana Maria Junqueira, 2021-04-29)_

### Pousada Boyra (Bonito) (1 review)
- É muito boa _(por Franciele Nascimento Condor Turismo / Condor Turismo, 2022-01-04)_

### Pousada da Colina (2 reviews)
- very good, clients loved it _(por Humberto Murakami, 2021-05-14)_
- ⚠️ service still slow, restaurant sluggish; very quiet/couple-oriented; no children under 16 — liked the bungalow accommodation _(por Fernanda Credidio Agencia, 2021-05-14)_

### Pousada do Cedro (1 review)
- ⚠️ Zero partnership with agencies — contact attempts are ignored. — Property/product itself is great _(por Fernanda Balestra, 2021-07-06)_

### Pousada do Toque (1 review)
- ⚠️ Na última visita (há um tempo) parecia precisar de manutenção; segundo informações recentes de fornecedor, foi reformada _(por Fernanda Helou, 2022-02-10)_

### Pousada Literária Paraty (1 review)
- café da manhã sensacional, de longe a melhor opção em Paraty, melhor piscina de Paraty, quartos grandes com sala e cozinha _(por Guilherme Polacow Team Travel, 2025-11-30)_

### Pousada Maravilha (3 reviews)
- ⚠️ Broken mosquito screen in a room; staff told the guest to just keep it shut rather than fix it, despite the hotel's very high rates. _(por None, 2021-08-10)_
- visitada em FAM da Reluq em dezembro (ano não especificado), achou super boa, reformaram a pousada, fica do lado do Nannai _(por Elaine Scanavacca Agencia, 2025-09-10)_
- ⚠️ quartos cansados/desatualizados — melhor serviço comparando com Morena e Nannai _(por Laryssa Siqueira Trivia, 2025-09-10)_

### Pousada Mi Secreto (1 review)
- ⚠️ Denúncias de maus-tratos a hóspedes; dona apontada como pouco confiável (histórico de calote com outra rede); cliente da Ana Roberta com reembolso enrolado. _(por Vivi Yuri Agencia, 2024-02-09)_

### Pousada Refugio da Vila (1 review)
- Restaurant is very good _(por Vivi Yuri Agencia, 2021-05-28)_

### Pousada Triboju (Fernando de Noronha) (1 review)
- ⚠️ Está um pouco cansada (desgastada); comparada à Pousada Teju Açu, a Teju tem mais serviço — Pax gostou _(por Humberto Murakami, 2022-01-26)_

### Pousada Xue (2 reviews)
- Clients loved it, very high service level (5 villas, 11 staff), gastronomy is the standout _(por Humberto Murakami, 2021-06-18)_
- Incredible hosts, cook very well, love to welcome guests _(por Juliana Haus 22, 2021-06-18)_

### Pousada Zé Maria (1 review)
- ⚠️ apto standard é pequeno e com localização ruim dentro da pousada, agente recomenda não vender essa categoria; considerada 'cansada' frente à concorrência _(por Fernando Nishi / Travel&Soul, 2024-01-09)_

### Principe di Savoia (1 review)
- ⚠️ Incidente reportado na sauna do hotel: mulher se insinuou para um hóspede, suspeita de garota de programa — Cliente com 3 quartos/6 pax 'amaram tudo' _(por Vivi Yuri Agencia, 2026-05-04)_

### Principe Forte dei Marmi (1 review)
- ⚠️ Cliente pagou EUR 2.500/diária e não achou o hotel chique/legal _(por Dani Filippozzi, 2026-06-22)_

### Pulso Hotel Faria Lima (1 review)
- ✅ Bar Sarau para drinks; café da manhã completo; boulangeria do hotel. — ⚠️ Diária considerada cara, mas agente pondera que pode ter sido por ser véspera de Dia dos Namorados e reserva de última hora. — Serviço extremamente atencioso, Concierge resolveu pedidos elaborados (flores, vinho, jantar externo entregue no quarto), Quartos espaçosos, modernos e com automação (Alexa), Café da manhã muito bom e completo, Agente prefere o Pulso a Emiliano, Fasano e Tangará para esse tipo de programa _(por Beto Nascimento Flaptur, 2025-06-13)_

### Quinta da Comporta (1 review)
- pays commission properly _(por Giovana Polotto, 2021-05-11)_

### Quinta do Vallado (1 review)
- ⚠️ nothing much to do on-site _(por Humberto Murakami, 2021-05-20)_

### Quinta dos Pinhais (1 review)
- clients liked it a lot, well treated, nice surrounding area _(por Fernanda Credidio Agencia, 2021-04-29)_

### Quisisana Hotel (1 review)
- ⚠️ quarto muito pequeno; hóspedes pagaram EUR 200 pelo quarto e EUR 2800 adicionais pela vista — vista excelente da varanda _(por Luis Sassi / Flaptur, 2023-06-13)_

### Radisson Blu Zurich Airport (1 review)
- Funcionou bem para pernoite, Único hotel com acesso direto ao terminal _(por Fernando Nishi Travel&Soul, 2026-06-23)_

### Raffles Hotel Singapore (2 reviews)
- todo renovado na pandemia, hotel pequeno e boutique _(por Luis Sassi / Flaptur, 2023-06-30)_
- hotel boutique, pequeno, totalmente reformado _(por Luis Sassi / Flaptur, 2023-07-24)_

### Refúgio na Serra (1 review)
- ⚠️ Precisa dividir a hospedagem com Lençóis por causa da distância dos passeios na Chapada Diamantina. — Hotel incrível, Serviço TOP _(por Carol Cordeiro / Carol Cordeiro Agencia, 2026-02-20)_

### Reserva do Patacho (1 review)
- ⚠️ Não aconselha para criança; não tem absolutamente nada para criança (visitou em setembro, ano não especificado) _(por Madu Apptitte Travel, 2022-04-19)_

### Residences at The Fives (1 review)
- ✅ Request kitchen utensils at booking time. — ⚠️ Guests did not use the restaurant; cooked/ordered delivery instead. — 4-star, guests satisfied despite low expectations _(por Fernanda Credidio Agencia, 2021-05-25)_

### Reykjavik Konsulat Hotel (1 review)
- ⚠️ Agente nunca visitou pessoalmente, mas já vendeu bastante e clientes gostam. — bem fofo, bem localizado _(por Fernanda Credidio Agencia, 2024-05-14)_

### Rio Quente Resorts (1 review)
- ⚠️ Poor service, expensive and bad food, extremely crowded/dirty pools; would only sell if the client explicitly chose it themselves. — Stayed a few years before this 2021 message: fun water-park complex for children, rooms simple but functional and new _(por Fernanda Credidio Agencia, 2021-08-02)_

### Rituaali (1 review)
- adoramos a experiência, fotos próprias divulgadas para o grupo usar _(por Vivi Yuri / Fernanda Credidio, 2023-08-14)_

### Ritz Paris (1 review)
- ⚠️ estilo clássico - nem todos os perfis de cliente apreciam (nesse caso o marido da cliente não gostou do estilo do hotel) — serviço impecável, café da manhã divino, transfer incluso, staff foi além do esperado (buscou remédio na farmácia para hóspede passando mal) _(por Vivi Yuri Agencia, 2025-12-09)_

### Ritz-Carlton Bal Harbour (3 reviews)
- ⚠️ Hotel escuro e antigo; bom para pax tradicional que quer privacidade, não para quem busca agito. Também: café da manhã cobrado a parte (USD 50 pp); decoração anos 90. — conservado, à la carte bom _(por Fernanda Helou, 2024-01-31)_
- ⚠️ Café da manhã cobrado a parte, USD 50 por pessoa. — lobby dourado estilo Dubai, quarto e vista ótimos _(por Elaine Scanavacca Agencia, 2024-02-29)_
- ⚠️ Achou meio cansado e antigo; o Setai deve ser melhor. Bom apenas se o pax busca privacidade. — quarto está bom _(por Fernanda Helou, 2024-06-19)_

### Ritz-Carlton Cancun (1 review)
- ⚠️ Clients coming from Chable/Banyan Tree found it dated and preferred the Nizuc instead. _(por Fabiana Ferrari Agencia, 2021-08-07)_

### Ritz-Carlton New York (Central Park) (1 review)
- ✅ park view — excellent service, beautiful rooms, fully renovated _(por Ana Roberta Haus 22, 2020-11-17)_

### Ritz-Carlton Orlando, Grande Lakes (1 review)
- ⚠️ Quartos em estilo mais datado, porém confortáveis. — Ótimo para famílias, Kids club com mini zoo, 3-4 restaurantes _(por Humberto Murakami, 2023-05-29)_

### Ritz-Carlton Vienna (2 reviews)
- Gostou, Fica a distância de caminhada do centro _(por Ana Maria Junqueira, 2022-03-13)_
- ⚠️ Visitou em novembro de 2021. — Localização ótima, Gostou muito _(por Marcia Polacow Agencia, 2022-03-14)_

### Riviera Maya - Mayakoba (Banyan Tree, Rosewood, Fairmont) (1 review)
- Barreira anti-sargaco instalada pelos 4 hoteis da regiao _(por Elaine Scanavacca Agencia, 2025-04-02)_

### Robben Island (passeio) (1 review)
- ⚠️ Não recomendado para quem tem crianças; mar costuma bater forte e o passeio fecha com frequência por causa do tempo — cliente interessado em história gostou bastante _(por Vivi Yuri Agencia / Mali Travel, 2025-01-13)_

### Rocco Forte The Charles (1 review)
- Adorou a estadia _(por Elaine Scanavacca / Elaine Scanavacca Agencia, 2026-04-14)_

### Rocco Forte Verdura (1 review)
- ⚠️ Relato de experiencia ruim ("veio cansado") durante estadia pessoal. _(por Luis Sassi Flaptur / Flaptur, 2025-04-10)_

### Rocco Forte Verdura Resort (Sicília) (1 review)
- ⚠️ cliente reclamou de sujeira, quarto horrível; também considerado muito caro _(por Luis Sassi / Flaptur, 2023-11-23)_

### Ronco do Bugio (3 reviews)
- Charming, clients loved it _(por Danielle Coltro, 2021-05-23)_
- ⚠️ Visita foi há vários anos (filho tem hoje 11 anos) — Amou o hotel, Café da manhã é um sonho, continua incrível pelos comentários recentes _(por Danielle Coltro, 2022-04-29)_
- Super romântico, comida deliciosa, atendimento muito bom, Café da manhã especial, serve até 14h/16h _(por Tuca Socia Fernanda Helou, 2022-04-29)_

### Roots Resort (1 review)
- ⚠️ not really top-tier _(por Mafe Caramella, 2021-04-19)_

### Rose Garden Hotel Roma (1 review)
- casal colocado em outubro gostou muito _(por Elaine Scanavacca Agencia, 2024-05-29)_

### Rosewood Baha Mar (1 review)
- ⚠️ Hotel manager approached the agent's guest directly to offer a better penthouse upgrade once he realized the booking came from an agency; not a first-time occurrence at this property. _(por Luis Sassi Flaptur, 2021-07-13)_

### Rosewood Castiglion del Bosco (1 review)
- ⚠️ Caça às trufas oferecida pelo hotel é um fiasco, não fazer (relatado por duas agentes, uma teve reembolso parcial). — deixar por último no roteiro para evitar downgrade, considerado o mais legal da região _(por Ucha Verissimo Agencia, 2024-04-05)_

### Rosewood London (1 review)
- ⚠️ Tarifa promocional confirmada não foi honrada pelo hotel; agente pediu ajuda urgente para resolver. _(por Fernanda Balestra, 2024-02-16)_

### Rosewood Mayakoba (1 review)
- ⚠️ Segundo Humberto Murakami, precisa de uma reforma urgente — Mil vezes melhor que o Fairmont, segundo relato, Kids friendly, segundo Humberto Murakami, Hóspedes de qualquer hotel do complexo acessam todos os restaurantes _(por Maria Amelia Agencia, 2022-02-16)_

### Rosewood Santa Bárbara (1 review)
- É lindo _(por Virginia Peluffo Menton, 2022-01-06)_

### Roxy Hotel (1 review)
- Clima astral, Gostou _(por Vivi Yuri Agencia, 2023-05-09)_

### Royal Palm (2 reviews)
- Bem localizado, Indicado para pax com orçamento mais enxuto _(por Giovana Polotto Agencia, 2022-07-04)_
- Adorou a experiência (estadia há alguns anos) _(por Patricia Mil Homens Agencia, 2022-07-04)_

### Royal Palm Plaza (1 review)
- ⚠️ Difícil de negociar; não reembolsou reserva pré-paga de R$15.000 mesmo fora de alta temporada, só aprovou faturamento de R$5.000 _(por Vivi Yuri Agencia / Mali Travel, 2024-08-22)_

### Sabi Sabi Bush Lodge (1 review)
- testado com netos de 4 anos e funcionou bem, carro privativo disponível para grupos grandes _(por Elaine Scanavacca Agencia, 2024-06-26)_

### Sail Rock Resort (1 review)
- ⚠️ área externa do resort precisa de reforma — vilas em geral são boas, ofertas às vezes bem boas _(por Vivi Yuri, 2023-12-26)_

### Saint James Paris (1 review)
- ⚠️ meio longe do centro, mas bom com crianças por ter jardim — 'surreal', pax amou demais _(por Fernanda Balestra / Elaine Scanavacca, 2023-11-22)_

### Salinas (Bahia) (1 review)
- ⚠️ Comida e frequência piores que o Comandatuba, segundo relato — Infraestrutura bem melhor que o Comandatuba _(por Tuca Socia Fernanda Helou, 2022-01-14)_

### Salinas Maragogi (4 reviews)
- ⚠️ Comissionamento varia por temporada; em janeiro (baixa temporada) não comissionam, em outras épocas negociam comissão conforme disponibilidade — Pais da agente ficaram e adoraram _(por Tuca Socia Fernanda Helou, 2022-02-02)_
- ⚠️ Parentes se hospedaram e não gostaram: quartos simples, comida fraca, piscinas muito cheias de crianças. _(por Vivi Yuri Agencia, 2023-03-10)_
- ⚠️ Público mais simples que o Comandatuba; a comida do Comandatuba é considerada melhor. — Bem organizado, Tem estrutura para idosos _(por Tuca Socia Fernanda Helou, 2023-03-11)_
- ⚠️ Nunca conseguiu fechar venda porque, quando pedido, o hotel não estava comissionando e ficava mais caro que o site oficial - por isso não vende o produto. _(por Fernanda Balestra, 2023-03-11)_

### Saline (1 review)
- ⚠️ a praia não é boa para banho _(por Danielle Coltro, 2025-09-13)_

### Saline (Taiba) (1 review)
- ⚠️ A praia não é boa para banho _(por Danielle Coltro, 2026-06-22)_

### San Antonio Santorini / Santo Pure (1 review)
- ⚠️ não são hotéis super BBB — rola super bem, tarifas melhores _(por Fernanda Credidio, 2023-12-19)_

### Sani Resort (Asturias/Sani Beach) (1 review)
- O Asturias é o melhor hotel do complexo, Sani Beach é onde ficavam clientes muito exigentes, com sucesso _(por Maria Amelia Agencia, 2026-05-28)_

### Santa Clara Ibiuna (1 review)
- ⚠️ Service described as slow at times. _(por Fernanda Credidio Agencia, 2021-08-25)_

### Santo Maris Oia Suites (Santorini) (1 review)
- Clientes gostaram bastante (antes da pandemia) _(por Fernanda Credidio Agencia, 2022-03-17)_

### Scenic (cruzeiro fluvial) (1 review)
- ⚠️ preço mais alto entre as opções (~5 mil e tanto) — fez e adorou, bem sofisticado _(por Elaine Scanavacca Agencia, 2025-10-03)_

### Scorpios Bodrum (1 review)
- ⚠️ clientes ficaram no METT e gostaram, mas acreditam que gostariam mais do Scorpios; estará fechado no fim da temporada — clientes disseram ser de longe o beach club mais bacana e com melhor estrutura em Bodrum _(por Vivi Yuri Agencia, 2025-08-29)_

### Senac Campos do Jordao (1 review)
- ⚠️ Non-commissioned promotional rates; refused agent requests that were later granted directly to the same client. — Nice facility _(por Humberto Murakami, 2021-05-31)_

### Serena Hotel (1 review)
- ⚠️ estava lotado — amou _(por Laryssa Siqueira Trivia, 2025-09-15)_

### Seven Pines (1 review)
- ⚠️ Visitou pessoalmente e odiou; achou surpreendente que um hotel com tanta reputação fosse ruim. _(por Marcus Carneiro, 2023-01-14)_

### SEZZ St Tropez (1 review)
- ⚠️ Cliente relatou serviço fraco logo na chegada; hotel avaliado como mediano. _(por Luis Sassi Flaptur, 2023-06-07)_

### Shamwari Game Reserve - Explorer Camp Tent (1 review)
- ⚠️ chuveiro do Explorer Tent é bem rústico, tipo bacia/balde — categoria (não-Explorer) vendida para família que amou _(por Tati Assad, 2023-09-02)_

### Shangri-La Vancouver (1 review)
- ⚠️ Quartos um pouco cansados. — Otima localizacao, Restaurante maravilhoso _(por Maria Amelia Agencia, 2025-01-31)_

### Shinta Mani Angkor (1 review)
- ⚠️ nada top luxo, categorias mais baixas com quartos bem pequenos; serviço ok, nada impecável _(por Marcia Polacow, 2023-06-13)_

### Sina Bernini Bristol (1 review)
- custo-benefício _(por Humberto Murakami, 2024-02-14)_

### Sir Victor (4 reviews) _(mescladas de: Sr Victor Hotel)_
- ⚠️ Gostou mas nao tem certeza se atende nivel de cliente mais exigente comparado a Claris/Neri. _(por Beto Nascimento Flaptur / Flaptur, 2025-03-13)_
- Mãe e filha adolescente adoraram, Filha voltaria pedindo o mesmo hotel _(por Fernanda Helou, 2026-06-15)_
- ⚠️ Quarto pequeno — Gostaram do serviço e do café da manhã, Transfers feitos com o concierge foram ótimos _(por Fernando Nishi Travel&Soul, 2026-06-15)_
- Funcionou muito bem, Ótimo rooftop _(por Beto Nascimento Flaptur, 2026-06-15)_

### Six Senses Botanique (4 reviews)
- ⚠️ Reservations Manager unprofessionally requested client's bank account details, causing confusion; client's 10th-anniversary trip fell through _(por Fernanda Balestra, 2021-04-22)_
- ⚠️ rude staff every time she calls; Six Senses rebrand did not improve service _(por Giovana Polotto, 2021-04-22)_
- ⚠️ refused to let agency/operator rebook a promo rate that a client had booked directly before; 'sempre foi terrível, não vai mudar' _(por Elaine Scanavacca Agencia, 2021-04-22)_
- ⚠️ Hotel precisando de manutenção; quem repara em detalhes vai se incomodar. Não vale o valor cobrado. _(por Patricia Mil Homens / Ritz Brasil, 2021-10-26)_

### Six Senses Courchevel (1 review)
- ⚠️ Cliente relatou falta de água quente, quarto sujo, precisou trocar de apartamento 3 vezes. Segundo Humberto Murakami, cada apartamento tem cerca de 2 caixas de água, então acaba a água quente se o hóspede toma banhos longos; funciona melhor para clientes europeus que tomam banho rápido _(por Luis Sassi Flaptur, 2022-01-14)_

### Six Senses Zil Pasyon (3 reviews)
- stunning property _(por Elaine Scanavacca Agencia, 2021-03-17)_
- Agente amou a experiência em Seychelles, preferiu a Maldivas (onde ficou no Velaa) _(por Elaine Scanavacca Agencia, 2022-12-20)_
- Já vendido pela agência com sucesso _(por Fernanda Helou, 2022-12-20)_

### Sixty SoHo (2 reviews)
- ⚠️ Evitar a 1ª categoria de quarto (pequeno, cama queen). Feedback repassado por Patricia Lumy, citando fonte externa. — Bom valor comparado a outros hotéis, Clientes adoraram _(por None, 2023-02-24)_
- ⚠️ Perdeu uma venda de 7 noites para o Booking.com por diferença de preço. _(por Fernando Nishi Travel&Soul, 2023-04-28)_

### SLS South Beach (6 reviews)
- ⚠️ Estilo provocante/adulto (espelho no teto, camisinha entre amenities); não indicado para família com criança pequena. _(por Luis Sassi Flaptur, 2023-01-21)_
- ⚠️ Muito voltado para festa, complicado vender para família. _(por Marcus Carneiro, 2023-01-21)_
- ⚠️ Se hospedou: hotel super informal, serviço bem fraco, tem pool party, quartos pequenos, banheiros minúsculos; só ganha em localização. _(por Fernanda Credidio Agencia, 2023-04-03)_
- ⚠️ Pax hospedado relatou ser 'o pior serviço que já viu na vida' e pediu para trocar de hotel; itens pedidos na piscina nunca chegaram. _(por Fernanda Helou, 2023-04-03)_
- ⚠️ Se hospedou: pediu um balde de cerveja na piscina que nunca chegou, mesmo depois de ligar perguntando; hotel de 'pegação' com pouco serviço, não indicado para família ou quem quer ser bem atendido. _(por Luis Sassi Flaptur, 2023-04-03)_
- ⚠️ Serviço está ruim; hóspedes recentes não gostaram. _(por Tuca Socia Fernanda Helou, 2024-07-26)_

### Sofitel Barú (3 reviews)
- ✅ Recomendado ficar 2 noites lá após alguns dias em Cartagena — Já vendeu 2 vezes e os clientes amaram _(por Danielle Coltro, 2022-04-05)_
- clientes gostaram muito _(por Guilherme Polacow Team Travel, 2025-10-22)_
- clientes sempre gostam _(por Danielle Coltro, 2025-10-22)_

### Sofitel Cairo (El Gezirah) (1 review)
- ✅ Jantar no restaurante árabe com vista para o Nilo — Restaurante árabe (El Kebabgy) com vista para o Nilo e comida maravilhosa _(por Fernanda Balestra, 2022-11-04)_

### Sofitel Frankfurt Opera (2 reviews)
- Cliente se hospedou e gostou _(por Patricia Lumy, 2026-06-12)_
- Vendeu com urgência, 'adorei o hotel' _(por Dani Filippozzi, 2026-06-18)_

### Sofitel Le Scribe Paris (1 review)
- ótima localização, cheio de lojas por perto, decoração elegante, recebeu suíte enorme (upgrade) _(por Humberto Murakami, 2025-09-12)_

### Sofitel Legend The Grand Amsterdam (1 review)
- ficou com filha de 3 anos e adorou _(por Patricia Lumy, 2023-07-19)_

### Sofitel Lyon Bellecour (1 review)
- ⚠️ feedback antigo de pax foi que estava 'cansado' (datado); pode ter melhorado desde então _(por Fernanda Helou, 2023-12-05)_

### Sofitel Marrakech (2 reviews)
- ⚠️ tem algum charme mas não é dos hotéis "top"; é um hotel grande, não muito boutique; visitou em fevereiro de 2024 e ficaria novamente — excelente custo-benefício, localização ao lado da Medina, perto do Nobu _(por Beto Nascimento Flaptur, 2025-10-02)_
- ⚠️ perfil mais boutique não é o forte, mas tinha bom preço na época — clientes gostaram _(por Tuca Socia Fernanda Helou, 2025-10-02)_

### Sofitel Panama City (Casco Viejo) (1 review)
- ✅ Aproveitar a região do Casco Viejo (lojas, igreja, bares, restaurantes). — ⚠️ Não tem praia; região fica ruim/deserta na baixa estação. — adorei, se arrependeu de não ficar 2 noites _(por Humberto Murakami, 2024-05-02)_

### Sofitel Santa Clara Cartagena (2 reviews)
- ⚠️ Cartagena não tem praia boa nas proximidades — Hotel lindo, Hotelaria de Cartagena em geral ótima _(por Elaine Scanavacca Agencia, 2022-04-05)_
- Unico hotel fora do "fervo" turistico de Cartagena _(por Elaine Scanavacca Agencia, 2025-02-18)_

### Solage Auberge (1 review)
- ⚠️ Agente não sabe como está atualmente o padrão do hotel. — Mais luxuoso e com mais estrutura (era um belo hotel quando vendido) _(por Fernanda Credidio Agencia, 2022-08-23)_

### Solé Miami (1 review)
- ⚠️ Piscina fraca; serviço só mediante solicitação (relato de época em que era apenas aluguel privado, antes de virar hotel). — Apartamento bacana com cozinha americana e sala _(por Claudia Bernardo Six Viagens, 2023-01-08)_

### Sonesta ES Suites Lake Buena Vista (Orlando) (1 review)
- ⚠️ Sem serviço de luxo (zero 'top'), mas funciona bem para quem passa o dia fora nos parques — Quarto bom e limpo, 2 quartos com 2 banheiros e sala, bem americano, Café da manhã incluído (estilo bandejão, mas válido pelo preço) _(por Tuca Socia Fernanda Helou, 2022-03-23)_

### Sonesta St. George (1 review)
- ⚠️ client found it merely 'ok', not for very demanding guests _(por Patricia Mil Homens Agencia, 2021-04-22)_

### Soneva Fushi (1 review)
- dream kids club _(por Giovana Polotto, 2021-03-23)_

### Sorell Hotel St. Peter (1 review)
- 'Uma graça', bem localizado _(por Vivi Yuri Agencia, 2023-02-16)_

### Spa do Vinho (1 review)
- ✅ sunset over the vineyard — ⚠️ rooms are simple; not couples-only, receives families too — good location, good food _(por Patricia Lumy, 2021-05-07)_

### Sri Lanka (2 Amans) (1 review)
- ⚠️ Achou o destino apenas mais ou menos; considera qualquer outro destino da Ásia mais interessante que Sri Lanka; só vale como parada para baratear aéreo de Maldivas. _(por Elaine Scanavacca Agencia, 2024-04-17)_

### St Regis Bora Bora (1 review)
- ⚠️ Segundo um terceiro citado ('Thiago'): considerado datado, mas mais original/fiel ao estilo da Polinésia que o Four Seasons. _(por Tuca Socia Fernanda Helou, 2023-02-08)_

### St Regis Venezia (1 review)
- Considerado o melhor hotel de Veneza no periodo _(por Caroline Assad Audi TA Travel, 2025-02-04)_

### St. Regis Bal Harbour Miami (3 reviews) _(mescladas de: St. Regis Bal Harbour)_
- ⚠️ reviews recentes no Booking mencionam falta de limpeza (banheira não higienizada durante toda a estadia) — 'eu amo esse hotel' (Fernanda Balestra, hóspede) _(por Elaine Scanavacca / Fernanda Balestra, 2023-08-23)_
- ⚠️ Achou o hotel cansado, ambiente frio; ha pax que ainda gosta. _(por Fernanda Helou, 2025-01-30)_
- ⚠️ cliente chegou 7h sem pagar noite anterior e não teve acesso a spa/academia/piscina até 9h-10h (precisa da chave do quarto); quarto relatado como sujo; staff pouco solícito, mas o próprio hóspede foi malcriado com a recepção, o que pode ter piorado o atendimento; alta temporada (Art Basel) _(por Luis Sassi / Humberto Murakami / Elaine Scanavacca / Flaptur, 2023-12-07)_

### St. Regis Cairo (1 review)
- Possui restaurante italiano e um japonês, Hotel muito bonito _(por Fernanda Balestra, 2022-11-04)_

### Starhotels Rosa Grand Milano (1 review)
- ficou nos residences: enormes, sala com cozinha completa, moderno, café da manhã em local separado, só com chave, club lounge, ótima localização _(por Elaine Scanavacca Agencia, 2025-10-07)_

### Starhotels Splendid Venice (1 review)
- Super charmoso, gostoso, cheiroso, Bem localizado _(por Danielle Coltro, 2023-06-07)_

### Sublime Comporta (3 reviews)
- ⚠️ never liked working with agencies; refused commission when it first opened _(por Giovana Polotto, 2021-05-11)_
- ⚠️ refused to negotiate a 70%-buyout group booking, said they don't like working with groups; lost the sale _(por Maria Amelia Agencia, 2021-05-11)_
- top, melhorou bastante recentemente _(por Luis Sassi Flaptur, 2024-05-20)_

### Sublime Lisboa (1 review)
- Hotel pequeno boutique com lobby pequeno mas agradável (restaurante Davvero) _(por Marcia Polacow Agencia, 2026-07-16)_

### Suvretta House (1 review)
- ⚠️ GM do hotel se recusou a transferir venda de cliente de volta para a agência mesmo com pedido formal por escrito da cliente; prática de 'roubar' clientes de agências no checkout é conhecida e recorrente no hotel _(por Luis Sassi Flaptur / Flaptur, 2025-01-24)_

### São Lourenço do Barrocal (2 reviews)
- Ama o hotel _(por Giovana Polotto Agencia, 2022-04-25)_
- É único, sem dúvida _(por Danielle Coltro, 2022-04-25)_

### Taiba (4 reviews) _(mescladas de: Taíba)_
- ⚠️ Serviço não é do nível do Kenoa; feedback inicial ruim, porém a rede fez ajustes depois. _(por Fernanda Credidio Agencia, 2022-08-19)_
- ⚠️ Três casais de clientes reclamaram do serviço. _(por Vivi Yuri Agencia, 2022-08-19)_
- ⚠️ praia mais ou menos — hotel bom _(por Laryssa Siqueira Trivia, 2025-09-13)_
- ⚠️ Praia em frente ao hotel tem pedras - é preciso desviar delas para chegar à água. — Clientes adoraram _(por Humberto Murakami, 2023-03-20)_

### Taj Dubai (2 reviews)
- Pax adoraram _(por Fernanda Helou, 2022-02-17)_
- Excelente custo-benefício, Hotel muito bom, Café da manhã excelente _(por Vivi Yuri Agencia, 2022-02-17)_

### Tambo del Inka (1 review)
- Spa lindo, Funciona super bem _(por Marcia Polacow Agencia, 2025-02-20)_

### Tangara Trancoso (1 review)
- ⚠️ cute but ordinary/basic _(por Giovana Polotto, 2021-05-06)_

### The Athenaeum Hotel (1 review)
- Localização preferida em relação ao Landmark, Preço muito bom _(por Elaine Scanavacca Agencia, 2023-01-09)_

### The Balmoral (1 review)
- Gostou da reunião/hotel _(por Fernanda Helou, 2023-05-30)_

### The Bank (Design Hotels) (1 review)
- Gostou bastante _(por Carol Cordeiro / Carol Cordeiro Agencia, 2026-02-03)_

### The Bank Hotel Istanbul (Design Hotels) (1 review)
- ótimo custo-benefício _(por Carol Cordeiro, 2023-11-06)_

### The Biltmore Mayfair (1 review)
- ⚠️ Decoração poderia ser mais 'cool', falta um pouco de vibe (feedback de pax) — Tudo novinho, Serviço ótimo, Localização perfeita em Mayfair, Bom café da manhã _(por Elaine Scanavacca Agencia, 2026-07-16)_

### The Brando (1 review)
- ⚠️ Cliente antiga fechou por conta própria pela internet após a agência ter cotado tudo; hotel aceitou honrar a venda pela agência, mas reduziu a comissão para 6%. _(por Fernanda Helou, 2023-02-08)_

### The Breakers Palm Beach (1 review)
- ⚠️ considerado cafona por um agente; episódio grave - cancelaram unilateralmente contrato de 50 quartos para casamento no dia do pagamento, recusando honrar reservas de grupo. 'Nojo!!!' _(por Elaine Scanavacca / Humberto Murakami, 2023-08-21)_

### The Chesterfield Mayfair (1 review)
- ⚠️ Vendeu e cliente achou o hotel ruim _(por Fernanda Credidio Agencia, 2026-07-20)_

### The David Kempinski Tel Aviv (2 reviews) _(mescladas de: Kempinski Tel Aviv)_
- ⚠️ cliente reclamou de serviço e tamanho dos quartos; mais voltado para famílias, pode não ser a proposta certa para casais; hotelaria de alto nível não é o forte local em Israel, staff tem muitos estrangeiros — hotel novo, frente-mar, andar com acesso ao Horizon Lounge vale a pena _(por Daniela Marota / Mafe Caramella / Fernanda Balestra / Trivia, 2023-08-07)_
- novo, frente mar, tem piscina, perfeito _(por Fernanda Balestra, 2023-07-06)_

### The Drisco Tel Aviv (1 review)
- prédio histórico restaurado, cheio de história, restaurante premiado (George and John) _(por Fernanda Balestra, 2023-08-07)_

### The Dylan Amsterdam (1 review)
- ⚠️ Perfil masculino. — muito intimista, parece uma casa, muito bem localizado _(por Marcus Carneiro, 2021-10-13)_

### The Edition Reykjavik (1 review)
- Adorou _(por Elaine Scanavacca Agencia, 2026-07-13)_

### The Elser Miami (1 review)
- ⚠️ não é luxo, móveis bonitinhos mas ordinários; vale enquanto estiver novo, opção budget; tem studio (cozinha mas quarto integrado - não recomendado para quem quer cozinhar de verdade) e apartamento de 2 quartos; diária de USD 270 no apto com cozinha completa — ótimo custo-benefício em Downtown Miami, na frente do Bayside, cozinha completa, sala separada, academia grande, moderno _(por Beto Nascimento Flaptur, 2025-11-21)_

### The Emblem Hotel (Praga) (1 review)
- ⚠️ Visitou em 2020. — Bem localizado, Estilo boutique _(por Giovana Polotto Agencia, 2022-02-22)_

### The Florentin by Althoff Collection (1 review)
- Lindo por dentro, Dá pra ir a pé até os museus _(por Dani Filippozzi, 2026-06-18)_

### The Fullerton Bay Hotel Singapore (1 review)
- ⚠️ cliente não achou nada de mais no hotel _(por Luis Sassi / Flaptur, 2023-06-20)_

### The Fullerton Hotel Singapore / Mandarin Oriental Singapore (1 review)
- ⚠️ cliente não gostou do estilo do Fullerton; Mandarin Oriental estava fechado na época _(por Luis Sassi / Flaptur, 2023-06-30)_

### The Ivens (1 review)
- ⚠️ Não recomenda o quarto de entrada (pequeno, menos de 24-22m2). — Clientes amaram o estilo do hotel, Ótima localização _(por Vivi Yuri Agencia, 2023-06-06)_

### The Ivens Lisboa (1 review)
- já fiz e foi sucesso, fica no Chiado numa rua calma _(por Marcia Polacow Agencia, 2024-07-04)_

### The Landmark London (1 review)
- Vendido pela agência com tarifa VITA disponível via Leading _(por Elaine Scanavacca Agencia, 2023-01-09)_

### The Langham Jakarta (1 review)
- já vendeu, hóspedes gostaram super _(por Vivi Yuri, 2023-08-24)_

### The Lumiares Hotel & Spa (2 reviews) _(mescladas de: The Lumiares)_
- ⚠️ Nada de excepcional, mas atende bem; perfil mais jovem. — localizacao, boutique, moderninho, atende bem clientes exigentes _(por Mafe Caramella / High End Travels, 2021-09-07)_
- Ótimo para família, Tem quarto conjugado para família, Cliente adorou _(por Ana Roberta Haus 22, 2022-04-11)_

### The Mandala Hotel Berlin (1 review)
- ⚠️ Nada de charme; não sabe como está atualmente. — 4* bom bem localizado, super serviço, bom custo-benefício _(por Fernanda Credidio Agencia, 2024-05-14)_

### The Norman Tel Aviv (1 review)
- boutique e chique, serviço bom, comparável ao Fasano/Emiliano _(por Fernanda Balestra, 2023-08-07)_

### The Oberoi Marrakech (1 review)
- ⚠️ Jantar com experiência imersiva de quadros: legal mas não incrível; não recomenda para casal. _(por Patricia Lumy, 2024-02-07)_

### The One Palácio da Anunciada (1 review)
- visitou e gostou _(por Laryssa Siqueira Trivia, 2025-09-12)_

### The Palace Madrid (3 reviews) _(mescladas de: Hotel Palace Madrid)_
- Suíte enorme, Funcionário extremamente gentil _(por Elaine Scanavacca / Elaine Scanavacca Agencia, 2026-02-25)_
- ⚠️ ficou nos dois hotéis (Palace e Mandarin) no mês anterior e considera o Mandarin muito superior _(por Elaine Scanavacca Agencia, 2025-10-13)_
- preço mais em conta do que o Room Mate Collection Alba _(por Vivi Yuri Agencia, 2025-10-13)_

### The Palace of the Lost City (1 review)
- ⚠️ Não é para quem busca experiência de safari; atração do 'hospital do leãozinho' não existe mais. — Reformado por completo, Decoração menos carregada _(por Elaine Scanavacca Agencia, 2023-05-29)_

### The Pierre (NYC) (1 review)
- ⚠️ Cliente ficou no hotel e sentiu uma grande diferença para pior (piora na qualidade) _(por Humberto Murakami, 2022-01-13)_

### The Plaza (1 review)
- Tarifa ótima conseguida via cartão JP Morgan, Ambiente agradável _(por Dani Filippozzi (relato de cliente), 2026-03-05)_

### The Residence Zanzibar (2 reviews)
- ⚠️ Client complained about the beach. _(por Danielle Coltro, 2021-06-05)_
- ⚠️ Beach is very poor. _(por Fabiana Ferrari Agencia, 2021-06-05)_

### The Retreat at Blue Lagoon (3 reviews)
- ✅ Ficar aqui na chegada e terminar a viagem hospedado em Reykjavik para curtir a cidade. — ⚠️ Fica distante da cidade, mais indicado para quem busca puro relax. — amei ficar _(por Vivi Yuri Agencia, 2024-05-14)_
- Caríssimo mas vale a pena, Spa maravilhoso _(por Elaine Scanavacca Agencia, 2026-07-13)_
- Amei _(por Vivi Yuri Agencia, 2026-07-13)_

### The Ritz-Carlton Millenia Singapore (1 review)
- ⚠️ quarto com cheiro de mofo apesar de reforma alegada; recepção despreparada; sem opções de comida no horário pedido; hotel demorou dias para se pronunciar sobre a reclamação _(por Luis Sassi / Flaptur, 2023-07-14)_

### The Ritz-Carlton South Beach (1 review)
- ⚠️ Clients found the price over the top; recently renovated with fresh rooms. — Clients liked it a lot _(por Humberto Murakami, 2021-06-08)_

### The Setai Miami Beach (1 review)
- família que ficou nos dois hotéis gostou muito mais do Setai que do Ritz Bal Harbour _(por Vivi Yuri Agencia, 2024-06-19)_

### The St. Regis Venice (1 review)
- Agente gosta bastante do hotel _(por Humberto Murakami, 2022-03-02)_

### The Surf Lodge (1 review)
- Quartos bonitos e mais descontraídos que o Fasano Boa Vista _(por Fernanda Helou, 2026-04-26)_

### Thompson Madrid (1 review)
- Alternativa moderna, Hotel super parceiro _(por Vivi Yuri Agencia, 2026-06-30)_

### Tiberio Palace (1 review)
- serviço muito bom segundo feedback recebido, tem vista _(por Fernanda Helou, 2024-06-10)_

### Tignes (Club Med) (2 reviews)
- ✅ Folie Douce; esqui direto do hotel. — ⚠️ Domínio esquiável é majoritariamente pista vermelha (difícil). — neve garantida, ski-in/out, 300km de pistas, hotel reformado _(por Laryssa Siqueira Trivia, 2024-02-26)_
- pessoal fresco, primeira vez no Med, adoraram _(por Fernando Nishi Travel&Soul, 2024-02-26)_

### Tivoli (2 reviews)
- ⚠️ large hole in wall plaster reported by a client — some current guests were loving it _(por Ana Maria Junqueira, 2021-01-20)_
- ⚠️ client sent video of a terrible, soggy room-service pizza _(por Carol Cordeiro Agencia, 2021-01-20)_

### Tivoli Avenida Liberdade (Lisboa) (2 reviews)
- ⚠️ Fica na Av. Liberdade, não dá para fazer tudo a pé como no Bairro Alto — Mais serviço, mais clássico _(por Giovana Polotto Agencia, 2022-02-21)_
- Casal na primeira vez em Lisboa está adorando _(por Marcia Polacow Agencia, 2022-02-21)_

### Tivoli Carvoeiro / Anantara Vilamoura (1 review)
- ⚠️ Tivoli Carvoeiro é em falésia, perrengue para acessar a praia; Anantara Vilamoura ficou 'longe e sem vista mar' no relato da cliente — Tivoli Carvoeiro: vista bonita, mais perto do mar _(por Elaine Scanavacca, 2023-11-22)_

### Tivoli Ecoresort (1 review)
- ⚠️ Risco de clima chuvoso em julho; no ano anterior os clientes pegaram só alguns dias nublados. — Já vendeu no passado, tem reservas para julho _(por Vivi Yuri Agencia, 2023-03-22)_

### Tivoli Ecoresort Praia do Forte (1 review)
- ⚠️ Segundo Ana Maria Junqueira, não é a melhor opção para bebês de 1 ano pois tem muita atividade voltada a crianças maiores; ela não amou com o filho de quase 2 anos — Toda a agência vende e todo mundo ama, Ótima estrutura para receber crianças: cadeirinha para alimentação, banheira, copa baby, babás com valor bem bom _(por Marcus Carneiro, 2022-01-27)_

### Tivoli Praia do Forte (1 review)
- ⚠️ precisa de reforma urgente, quartos muito cansados/desatualizados mesmo na categoria Master Club Plus _(por Humberto Murakami, 2025-12-09)_

### TomTom Suites (Bodrum) (1 review)
- Bem localizado, Tarifas melhores que os hotéis top da região _(por Giovana Polotto Agencia, 2022-03-07)_

### Torel Quinta da Vacaria (1 review)
- vendeu e os pax adoraram, hotel novo _(por Fernanda Credidio Agencia, 2025-09-17)_

### Toriba Chalés (1 review)
- ⚠️ Fica cerca de 20 minutos do centro (bairro do Horto). — Amou a experiência _(por Bia Parra, 2023-04-08)_

### Toriba Hotel (Campos do Jordão) (2 reviews)
- Hotel charmoso, Restaurante excelente, Novos quartos estilo 'casa na árvore', muito legais _(por Fernanda Helou, 2022-02-10)_
- Chalés muito legais, Comida muito boa, Bom serviço _(por Ucha Verissimo Agencia, 2022-02-10)_

### TOTEM Hotel Madrid (1 review)
- Cliente adorou o hotel e a localização _(por Patricia Lumy, 2026-06-15)_

### Trails of Indochina (1 review)
- Replied to a quote request within 3 hours with a full itinerary and flight suggestions despite reduced pandemic staffing _(por Humberto Murakami, 2021-06-09)_

### Transamerica Comandatuba (8 reviews)
- ⚠️ Fazer reserva direto com o hotel é chato pois o atendimento deles é ruim; melhor via operador (ex.: Sete Mares tem boa parceria) _(por Carol Cordeiro Agencia, 2022-02-17)_
- ⚠️ Recebeu fotos/mensagens de família hospedada e achou muito ruim, comparando a 'um navio da CVC'. _(por Fernanda Balestra, 2023-03-22)_
- ⚠️ Esteve no Carnaval e teve feedback diferente (mais positivo) da experiência relatada por outra colega. _(por Ana Roberta Haus 22, 2023-03-22)_
- Conhecida (Debora Santos) achou maravilhoso _(por Fernanda Helou, 2023-03-22)_
- ⚠️ Quartos 'Alto Luxo' já foram reformados. — Nunca teve reclamação _(por Juliana Haus 22, 2023-03-22)_
- ⚠️ Quartos em geral estão antigos. — Hóspedes sempre gostaram muito _(por Tuca Socia Fernanda Helou, 2023-03-22)_
- ⚠️ clientes reclamaram que 'parecia navio da CVC'; quartos antigos; fica lotado em temporada de férias; sempre tem hóspedes que monopolizam o bar da piscina — comida considerada boa em feedback recente _(por Fernanda Balestra / Fernanda Helou / Humberto Murakami / Carol Cordeiro, 2023-07-06)_
- pax adoraram, disseram que teve melhorias _(por Tuca / Fernanda Helou, 2023-07-26)_

### Trilussa (restaurante) (1 review)
- ⚠️ Perdeu o clima, virou turistada geral, clientes recentes odiaram - remover das recomendações _(por Fernanda Balestra / FB Travel, 2024-12-27)_

### TRS Yucatán Hotel (1 review)
- ⚠️ refused a partner joining mid-stay without repeatedly-changing extra fees; slow service on a simple request _(por Fernanda Balestra, 2021-04-24)_

### Tutabél (Tatubel) (2 reviews)
- ⚠️ some reservations, isolated location, requires a car — excellent service, excellent food, beautiful garden _(por Fernanda Balestra, 2021-05-06)_
- ⚠️ pousada feeling dated, needs an upgrade; bad access road; only for guests wanting isolation — good service _(por Carol Cordeiro Agencia, 2021-05-06)_

### TW Guaiambê (1 review)
- ⚠️ clientela/frequência do hotel considerada estranha; serviço mediano, comida ok — quartos bons, piscina ótima _(por Fernanda Helou, 2023-12-20)_

### Txai Itacaré (2 reviews)
- ⚠️ estilo rústico-chique; academia pequena; recomendado a partir da categoria bangalô luxo para clientes mais exigentes — bangalôs gostosos e confortáveis, piscina ótima, comida gostosa, spa ótimo _(por Fernanda Credidio Agencia, 2025-12-09)_
- ⚠️ precisa ser no mínimo bangalô luxo; cliente precisa gostar de vibe de praia e não se importar com infraestrutura reduzida — hotel com alma _(por Maria Amelia Agencia, 2025-12-09)_

### Txai Resorts (12 reviews) _(mescladas de: Txai, Txai Resort)_
- ⚠️ Cliente reclamou que estava parecendo Iberostar de tanta bagunça e muvuca de famílias com crianças durante o Réveillon; não é opção para quem busca tranquilidade nesse período _(por Vivi Yuri Agencia, 2021-12-29)_
- ⚠️ Ouviu relato de que o hotel estava 'meio derrubado' em comida/serviço; na visita própria achou legal mas sem praia em frente (só rio); quarto pequeno se não for de frente, banheiro grande. _(por Luis Sassi Flaptur, 2022-08-19)_
- ⚠️ Serviço geral considerado meio fraco e comida mediana pelo preço; serviço dos restaurantes avaliado como ruim. — Praia muito linda, Quartos muito bons na visita de 2021, Bungalows ótimos, Spa com vista maravilhosa, Serviço de praia muito bom _(por Fernanda Helou, 2022-08-19)_
- ⚠️ Primeira categoria de bangalô não venderia; segunda categoria dá para vender mas é perto da piscina e pode ter barulho. Serviço lerdo nos restaurantes, serviço bom na praia. — praia perfeita, bangalo luxo otimo _(por Fernanda Helou, 2021-09-10)_
- ⚠️ Serviço do restaurante é lento mesmo — relatou que o ketchup chegou quando as batatas fritas já tinham acabado. — bangalo luxo com chuveiro interno e externo _(por Elaine Scanavacca / ES Turismo, 2021-09-10)_
- Delícia para bebês, Praia muito boa _(por Fernanda Helou, 2022-01-27)_
- ⚠️ Serviço médio em alta temporada (quarto não arrumado um dia, demora no room service); pagou com 30% de desconto. — Hotel 'delícia', clima ótimo, Quartos confortáveis mas não atuais, bem conservados, Spa excelente, Piscinas ótimas, Rústico-chique, não é moderno _(por Fernanda Credidio Agencia, 2023-01-25)_
- ⚠️ Hotel honrou a tarifa cotada pela agência mesmo com preço menor disponível via Booking.com Genius. _(por Fernanda Balestra, 2023-02-08)_
- ⚠️ Feedback do sobrinho (relatado como não sendo cliente exigente): serviço está 'bem meia boca'. — Hotel impecável estruturalmente _(por Luis Sassi Flaptur, 2023-04-16)_
- ⚠️ Confirmou ter sentido o mesmo problema de serviço em visita própria em fevereiro/2023; vai conversar com a representante (Bruna) para repassar o feedback. _(por Humberto Murakami, 2023-04-16)_
- ⚠️ Recebeu reclamações de serviço 'atrapalhado' em outubro e dezembro de 2022; repassou o feedback ao hotel. _(por Vivi Yuri Agencia, 2023-04-16)_
- ⚠️ bangalôs de primeira categoria perto da piscina são muito ruins; bangalôs de luxo em cima são melhores mas mais distantes/mais altos — bangalô de investidor com 2 quartos, muito espaço, 'amei' _(por Humberto Murakami / Fernanda Helou, 2023-07-10)_

### Umiltà 36 (1 review)
- ⚠️ Estilo mais executivo, cores mais escuras. — Localização excelente _(por Franciele Nascimento Condor Turismo, 2023-03-23)_

### Unico 20°87° Hotel Riviera Maya (1 review)
- ⚠️ Cliente reclamou de musica alta na piscina, disputa por espreguicadeiras e dificuldade de reservar restaurante quando o hotel esta cheio; grupo achou o hotel "farofa". _(por Vivi Yuri Agencia, 2025-01-28)_

### Unique Garden (1 review)
- Clientes amaram _(por Humberto Murakami, 2022-04-29)_

### Uxua Casa Hotel & Spa (1 review)
- out of this world _(por Maria Amelia Agencia, 2021-04-29)_

### Vakkaru Maldives (2 reviews)
- ⚠️ not super top-tier but very good — client liked it a lot _(por Marcia Polacow Agencia, 2021-04-27)_
- demanding clients loved everything: food, service, spa, room _(por Fernanda Helou, 2021-05-05)_

### Val d'Isère (Club Med) (1 review)
- ⚠️ Pistas não são tão fáceis. — um dos melhores villages em estrutura, mais novo _(por Carol Cordeiro Agencia, 2024-02-26)_

### Valle Nevado (1 review)
- ⚠️ grupo comprou pacote em 2020, pandemia impediu viagem, prometeram reembolso/crédito e nunca mais responderam; reportagem recente também traz reclamações de mau atendimento a turistas brasileiros _(por Fernanda Helou, 2023-09-06)_

### Vallon de Valrugues (1 review)
- ⚠️ Entrada do hotel tem escada; family room fica fora do corpo do hotel, atravessando jardim com degraus. — Relativamente plano por dentro, com elevador _(por Fernanda Credidio / Fernanda Credidio Agencia, 2026-03-31)_

### Valverde Lisboa (2 reviews)
- ⚠️ achou que pode ser escuro para o gosto de alguns clientes — gostou _(por Vivi Yuri Agencia, 2025-09-12)_
- ficou hospedada _(por Laryssa Siqueira Trivia, 2025-09-12)_

### Veela (1 review)
- ⚠️ Esteve pessoalmente e não achou que valha o quanto custa. _(por Elaine Scanavacca Agencia, 2023-05-13)_

### Velaa Private Island (4 reviews)
- beautiful kids club _(por Elaine Scanavacca Agencia, 2021-03-23)_
- marvelous, kids club is a dream _(por Tati Assad, 2021-03-23)_
- ⚠️ Agente se hospedou lá, mas relatou ter gostado mais de uma viagem a Seychelles do que desta estadia nas Maldivas. _(por Elaine Scanavacca Agencia, 2022-12-20)_
- mais low profile, mais local _(por Tati Assad, 2024-04-26)_

### Verdura Resort (3 reviews)
- Ela e a filha amaram, Suíte com piscina já reformada _(por Patricia Lumy, 2026-07-14)_
- Pax adoraram _(por Fernanda Helou, 2026-07-14)_
- ⚠️ Vendeu antes da pandemia; na época não havia hotelaria top na região, clientes ficaram em um Best Western (melhor opção disponível então) _(por Humberto Murakami, 2026-07-14)_

### Viceroy Snowmass (1 review)
- Lembrança positiva de villa de 2 quartos _(por Humberto Murakami, 2023-01-24)_

### Victoria & Alfred Hotel (1 review)
- já vendi e já fiquei. Hotel boutique maravilhoso _(por Humberto Murakami, 2023-09-08)_

### Victoria Jungfrau (1 review)
- Lindo; considerado o único motivo para ficar em Interlaken _(por Humberto Murakami, 2023-02-22)_

### Vida Downtown Dubai (1 review)
- ⚠️ Pax reclamaram do barulho de uma balada dentro do hotel (por volta do 4º andar); ao reservar, pedir quarto distante desse andar _(por Fernanda Helou, 2022-02-17)_

### Vila da Santa (1 review)
- gosta muito, já se hospedou 2 vezes _(por Dani Filippozzi, 2025-10-13)_

### Vila Joya (1 review)
- ✅ the restaurant — marvelous, 2-Michelin-star restaurant on-site _(por Fernanda Balestra, 2021-05-08)_

### Vila Kalango (1 review)
- consistently good feedback _(por Fernanda Balestra, 2021-05-17)_

### Vila Lara Resort (1 review)
- Donos muito queridos, Aeroporto a cerca de 7 minutos de carro _(por Bia Parra, 2023-04-03)_

### Vila Monte (1 review)
- Se hospedou e amou _(por Fernanda Balestra, 2023-05-24)_

### Vila Selvagem (1 review)
- ✅ Ir até o vilarejo comer nos restaurantes simples de lá. — ⚠️ Dois restaurantes com o mesmo menu podem enjoar em estadias mais longas; não indicado para quem quer kids club estruturado. — bangalos confortaveis e grandes, familias com criancas se divertem juntas, vilarejo local calmo _(por Fernanda Credidio / Travel&Soul, 2021-09-13)_

### Vila Vita Parc (5 reviews)
- mother loved the stay _(por Marcus Carneiro, 2021-05-06)_
- Só ouviu coisas boas até hoje _(por Mafe Caramella, 2022-05-05)_
- Todo mundo adora _(por Ana Roberta Haus 22, 2022-05-05)_
- ⚠️ Considera que o hotel não tem parceria com agências ('zero parceiros'); além de ter pouca disponibilidade, os preços no Booking.com ficam mais baratos que os oferecidos à agência. _(por Fernanda Balestra, 2023-04-29)_
- Hotel enorme com várias atividades, boa opção para adolescentes que gostam de ação _(por Claudia Bernardo Six Viagens, 2023-05-04)_

### Villa Beluno (1 review)
- Cliente super exigente amou _(por Laryssa Siqueira Trivia, 2025-03-31)_

### Villa d'Este (Lago di Como) (1 review)
- ⚠️ Segundo Maria Amelia Agencia, os quartos precisavam de uma reforma/refresh — Estilo clássico _(por Marcus Carneiro, 2022-03-05)_

### Villa Dubrovnik (1 review)
- Um dos melhores hotéis de Dubrovnik _(por Fernanda Credidio Agencia, 2022-05-16)_

### Villa Franca Positano (1 review)
- ⚠️ hospedou-se pessoalmente e 'não amei'; recomenda pesquisar e reservar hotéis da Costa Amalfitana com antecedência pois os preços variam muito por data _(por Patricia Lumy, 2024-01-08)_

### Villa Gallici (2 reviews)
- ⚠️ Não tem nada plano; para chegar ao hotel tem uma rampa. 2-3 quartos no térreo sem escada até restaurante/quarto; demais precisam de escada. _(por Ana Roberta / Haus 22, 2026-03-31)_
- ⚠️ Esteve em novembro; não é plano, mas pode-se solicitar quarto no térreo (ela ficou no 1º andar, só com escada). _(por Renata Levorin / Renata Levorin Agencia, 2026-03-31)_

### Villa Igiea (Rocco Forte) (2 reviews)
- ⚠️ Antes da reforma/rebranding estava desgastado — Quando vendia (antes de virar Rocco Forte) já era o melhor hotel de Palermo, Agora sob a Rocco Forte, deve estar excelente; ofereceria de olhos fechados _(por Ana Roberta Haus 22, 2022-05-17)_
- ⚠️ Antes de virar Rocco Forte era 'meio jeca' — Era a melhor opção em Palermo mesmo antes de ser Rocco Forte _(por Elaine Scanavacca Agencia, 2022-05-17)_

### Villa Le Blanc Gran Meliá (1 review)
- ⚠️ mais distante de Ciutadella — mais luxuoso e bacana _(por Fernanda Credidio, 2023-07-13)_

### Villa Magna (2 reviews)
- ⚠️ Não tem piscina — Lobby chique, Lugar maravilhoso _(por Elaine Scanavacca Agencia, 2026-07-02)_
- ⚠️ Não tem piscina — Hotel maravilhoso, Quartos enormes e novos, Serviço muito bom _(por Fernanda Credidio Agencia, 2026-07-02)_

### Villa Rossa (3 reviews)
- ✅ Functional for families with small children. — ⚠️ Only 'ok' — not very charming, apartments were somewhat dark. _(por Bia Parra, 2021-06-11)_
- Good lofts, good private pool _(por Guilherme Polacow Team Travel, 2021-06-11)_
- ⚠️ grande parte da piscina estava fechada; restaurante em buffet com fila enorme e cheiro forte de comida; experiência geral não foi boa _(por Fernanda Balestra, 2025-09-15)_

### Villa Sapê (Ubatuba) (1 review)
- ⚠️ Ainda não tem estrutura de praia; não recomenda o apartamento standard, achou muito simples — Vista linda para Ilhabela, Restaurante ótimo _(por Patricia Mil Homens Agencia, 2022-02-08)_

### Villa Tanah (1 review)
- ⚠️ Cardápio limitado (2 opções por refeição) e spa pequeno; não indicado para quem quer 'ser visto'. — natureza, bem-estar, privacidade _(por Ucha Verissimo Agencia, 2024-02-21)_

### Villa/Hotel Donna Carmela (1 review)
- ⚠️ preços da região ficaram inviáveis — adorei _(por Elaine Scanavacca, 2023-07-17)_

### Villas de Trancoso (3 reviews)
- perfectly incredible _(por Fernanda Balestra, 2021-04-29)_
- Client loved it _(por Luis Sassi Flaptur, 2021-08-25)_
- ⚠️ mais rústico que o Tutabel; café da manhã servido em um quiosque perto da piscina _(por Luis Sassi Flaptur, 2025-08-19)_

### Vintage House (1 review)
- Bem localizado e charmoso _(por Fernanda Credidio Agencia, 2023-04-03)_

### Virgin Hotels Edinburgh (1 review)
- Clientes gostaram _(por Marcia Polacow Agencia, 2023-05-30)_

### W (Miami Beach) (1 review)
- ⚠️ Relato de amiga hóspede de que a frequência (público) melhorou em relação a antes. — Quartos novos, confortáveis e grandes, Vibe boa _(por Fernanda Credidio Agencia, 2022-08-02)_

### W Fort Lauderdale (1 review)
- ⚠️ muitas reclamações relatadas sobre o hotel — hotel bom _(por Elaine Scanavacca, 2023-12-08)_

### W Miami (1 review)
- ⚠️ Site inspection revelou que o hotel vai fechar _(por Vivi Yuri Agencia, 2026-06-29)_

### Waldorf (Edimburgo) (1 review)
- Gostou muito _(por Ana Terra, 2023-05-30)_

### Waldorf (Maldivas) (2 reviews)
- Restaurantes surreais, Água linda _(por Fernanda Balestra, 2023-05-13)_
- Feedbacks muito bons dos clientes _(por Fernanda Helou, 2023-05-13)_

### Waldorf Astoria Maldives (2 reviews)
- ⚠️ Preço muito alto para a percepção do mercado brasileiro; hotel precisa investir mais na marca no Brasil, pois preço está na faixa do Soneva Jani (mais 'querido' no Brasil). _(por Humberto Murakami / Get Out N About Travel, 2021-09-27)_
- mais sofisticado, melhor opção gastronômica _(por Fernanda Balestra / Laryssa Siqueira / Trivia, 2023-06-20)_

### Warwick Champs-Élysées Paris (2 reviews)
- ⚠️ Reservado para cliente 5 estrelas que queria economizar num 4 estrelas; reclamou os 4 dias (cheiro de cigarro, sem cabo USB, mesa de cabeceira pequena) - agência perdeu o cliente _(por Elaine Scanavacca Agencia, 2026-06-15)_
- ⚠️ Não sabe se o hotel foi reformado — Cliente fiel voltou várias vezes ao hotel _(por Marcia Polacow Agencia, 2026-06-15)_

### White Coast (1 review)
- Cliente gostou muito de Milos e do hotel _(por Juliana Haus 22, 2023-02-08)_

### Widder Hotel (1 review)
- Pequeno, boutique, Clientes adoraram quando ficaram _(por Fernanda Credidio Agencia, 2023-03-17)_

### Wymara Resort and Villas (1 review)
- Villa de 4 quartos impressionante, Não queria sair da villa _(por Humberto Murakami, 2023-06-07)_

### XCaret Hotel (2 reviews)
- ⚠️ personally didn't like it; pricing not compatible with quality — kids (7, 9) loved the pools/green areas _(por Vivi Yuri Agencia, 2021-04-23)_
- ⚠️ client had a breakdown and left after 3 days _(por Marcus Carneiro, 2021-04-23)_

### Yotel Istanbul Airport (1 review)
- liked it during a layover _(por Fabiana Ferrari Agencia, 2021-04-22)_

### Yountville Hotel (1 review)
- ⚠️ Agente não sabe como está atualmente o padrão do hotel. — Boutique bem charmoso, Muito bem localizado em Yountville, Região ótima, indicado para casal _(por Fernanda Credidio Agencia, 2022-08-23)_

### Zemi Beach House (Anguilla) (1 review)
- Clientes amaram: serviço, estrutura, tudo, Mar maravilhoso _(por Mafe Caramella, 2022-02-01)_

### Zorah Beach (Trairi) (2 reviews)
- Ótimos feedbacks recebidos, bom para kite _(por Fernanda Helou, 2022-02-04)_
- ⚠️ Havia uma obra ao lado do hotel que começava às 7h da manhã (construção de um condomínio vizinho) — Clientes que ficaram no Réveillon adoraram o hotel _(por Carol Cordeiro Agencia, 2022-02-04)_

### Zuri Zanzibar (2 reviews)
- ⚠️ Sits along the path locals use to get to town/work, so the beach has a lot of foot traffic; only found it 'so-so'. — Considered the best option available in Zanzibar overall _(por Humberto Murakami, 2021-06-05)_
- Rustic-chic style _(por Danielle Coltro, 2021-06-05)_

### Zurich Marriott (1 review)
- Bem arrumado, Pax gostaram, 5 estrelas padrão Marriott _(por Patricia Mil Homens Agencia, 2022-02-09)_
