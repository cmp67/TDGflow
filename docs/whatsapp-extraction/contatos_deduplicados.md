# Deduplicação de Contatos Comerciais — Extração WhatsApp TDG (2020-2026)
**Data:** 30/07/2026 · **Origem:** `TDG_Flow_Extracao_WhatsApp_2020-2026.md` (seção Contatos comerciais)
Consolidação dos 611 registros extraídos, agrupando pela mesma pessoa/contato real — aqui a dedup é mais confiável que a de hotéis, porque e-mail e WhatsApp são identificadores reais, não fuzzy matching de nome.

**Status:** documentação/análise apenas — nenhum dado deste arquivo foi inserido no banco ou publicado no TDG Flow.
## Método
1. **Agrupamento por e-mail idêntico** (case-insensitive) — mesmo e-mail = mesma pessoa/contato, alta confiança.
2. **Agrupamento por WhatsApp idêntico** (normalizado, só dígitos) — mesmo critério.
3. Grupos que batem em e-mail OU WhatsApp foram unidos (union-find) — evita duplicar quando os dois critérios apontam pra mesma pessoa.
4. **4 grupos ficaram de fora da consolidação de propósito** (ver seção própria abaixo) — hotéis/marcas genuinamente diferentes no mesmo e-mail, decisão de mesclar ou não fica pra Carla. Continuam como registros separados, não reduzidos, até ela decidir.

## Resultado
- **Antes:** 611 registros
- **Grupos consolidados:** 30 (por e-mail ou WhatsApp idêntico, sem ambiguidade)
- **Depois:** 578 contatos — sendo 30 consolidados de verdade + os 8 registros dos 4 casos abaixo, que **continuam separados, não reduzidos**, aguardando decisão
- **4 grupos excluídos desta consolidação** — ver motivo abaixo

## ⚠️ Excluídos desta consolidação — aguardando sua decisão
Esses 4 casos **não foram mesclados**. As menções abaixo continuam como registros distintos no total, exatamente como vieram da extração original — nada foi consolidado nem descartado, só sinalizado.

### Katherine Lima
**Por que não mesclei:** Hotel Unique vs. Unique Garden — a própria extração original já marcou isso como incerto ("(or Hotel Unique?)"). Herdado, não resolvido por mim.

| Hotel/Empresa | Cargo | E-mail | WhatsApp | Fontes |
|---|---|---|---|---|
| Hotel Unique / Unique Garden | Unique Garden (or Hotel Unique?) / Sales Executive | klima@hotelunique.com | — | Fernando Nishi Travel&Soul, 2021-04-22; Humberto Murakami, 2021-05-24 |

### Roberto Pedrosa
**Por que não mesclei:** Andaz vs. Grand Hyatt Baha Mar — marcas/propriedades diferentes dentro do grupo Hyatt, mesmo e-mail @andaz.com. Pode ser mudança de propriedade.

| Hotel/Empresa | Cargo | E-mail | WhatsApp | Fontes |
|---|---|---|---|---|
| Andaz / Grand Hyatt Baha Mar | Regional Senior Sales Manager – Miami Based | roberto.pedrosa@andaz.com | — | Ana Maria Junqueira, 2022-12-14; Ana Maria Junqueira, 2023-02-08 |

### Elif Kochan
**Por que não mesclei:** Mandarin Oriental Bodrum vs. Mandarin Oriental Mayfair (London) — cidades/propriedades diferentes, mesmo e-mail @mohg.com (domínio do grupo). Pode ser troca de propriedade da profissional, ou atribuição errada numa das duas menções.

| Hotel/Empresa | Cargo | E-mail | WhatsApp | Fontes |
|---|---|---|---|---|
| Mandarin Oriental Bodrum / Mandarin Oriental Mayfair, London | Assistant Director of Sales / Senior Sales Manager | ekochan@mohg.com | +41 0 77 7178 2018 | Vivi Yuri Agencia, 2025-07-17; Tuca Socia Fernanda Helou, 2025-09-19 |

### Karina Alves
**Por que não mesclei:** Grand Powers Hotel (Paris) vs. Rosewood Courchevel Le Jardin Alpin — marcas e cidades completamente diferentes, mesmo e-mail. Provável troca de emprego da profissional (datas das fontes ajudam a confirmar).

| Hotel/Empresa | Cargo | E-mail | WhatsApp | Fontes |
|---|---|---|---|---|
| Grand Powers Hotel (Paris) / Rosewood Courchevel Le Jardin Alpin | Communications / Communication | karina@domcollection.com.br | — | Luis Sassi Flaptur, 2025-10-23; Luis Sassi Flaptur, 2026-03-25 |


## Contatos consolidados (sem ambiguidade — agrupados por pessoa/contato real)
| Nome | E-mail(s) | WhatsApp | Hotel(is)/Empresa | Cargo(s) | Menções | Fontes |
|---|---|---|---|---|---:|---|
| **Alida Enes** | aenes@tekser.com; incoming@tekser.com / aenes@tekser.com | +90 531 883 30 63 | — | Leisure Department, Senior Account Manager | 2 | Vivi Yuri Agencia, 2024-08-06; Vivi Yuri Agencia, 2024-09-11 |
| **Ana Gonzalez** | ana.gonzalez@magicvillage.com | +1 (407) 705-3568 | Magic Village; Magic Village Orlando | International Sales; Magic Village | 2 | Humberto Murakami, 2022-11-16; Humberto Murakami, 2023-12-11 |
| **Anel Sergazina** | anel.sergazina@fourseasons.com | +971 4 270 7923 | Four Seasons Jumeirah Beach Dubai; Four Seasons Resort Dubai at Jumeirah Beach | Sales Manager - Asia Pacific & Latin America | 2 | Humberto Murakami, 2024-06-27; Juliana Haus 22, 2025-08-26 |
| **Bruna Bloise** | bruna.bloise@marriottluxurybrands.com | +55 11 98962-0093 | West Hollywood Edition (e outras marcas Marriott Luxury) | Director, Marriott International Luxury Brands, Global Sales Organization Caribbean and Latin America; Contato comercial (Marriott Luxury Brands) | 2 | Elaine Scanavacca Agencia / Luis Sassi Flaptur, 2023-08-30; Daniela Marota Trivia, 2024-05-28 |
| **Bruna Moriconi** | bruna@latitudes.com.br | +55 11 9-8155-1942; +55 11 98155.1942 | — | Consultora de Vendas / Sales Consultant; Departamento de Agências | 2 | Luis Sassi Flaptur, 2021-10-23; Luis Sassi Flaptur, 2023-02-08 |
| **Carolina Mokshin** | cmokshin@thepalacecompany.com | — | The Palace Company | Regional Vendas Brasil; The Palace Company | 2 | Juliana Haus 22, 2025-06-26; Humberto Murakami, 2026-05-18 |
| **Claudia O. Estrada** | claudia.estrada@fairmont.com | +52 1 984 176 2439 | Fairmont Mayakoba | Leisure Sales Manager / Gerente de Ventas Individuales | 2 | Humberto Murakami, 2021-06-11; Humberto Murakami, 2021-11-16 |
| **Cristian Villavicencio** | cristian@houseofkooser.com | +54 9 1131641703; +54 911-31641703 | Freehand Hotels (portfólio House of Kooser) | South America Sales Manager; Tailored Greece | 3 | Luis Sassi Flaptur, 2021-10-25; Luis Sassi Flaptur, 2022-08-01; Luis Sassi Flaptur, 2024-09-26 |
| **Cristina Mexia** | isales@hospes.com | +34 664 52 47 38; T +34 91 436 27 66 / M +34 664 52 47 38 | Hospes Hotels (grupo); Hospes Infante Sagres | Director of International Sales Americas | 2 | Humberto Murakami, 2023-07-07; Humberto Murakami, 2024-05-22 |
| **Davide Cherubin** | davide@iditravel.com | Ph +39 041 593.6299 | I.D.I. Travel (DMC Itália) | Proprietário/representante; I.D.I. Travel srl; Contato comercial | 3 | Humberto Murakami, 2022-05-11; Vivi Yuri Agencia, 2023-07-14; Luis Sassi Flaptur, 2024-02-16 |
| **Everton Silva** | jrpass@investur.com.br | — | — | Contato comercial; Investur | 2 | Fernando Nishi Travel&Soul, 2024-04-22; Fernando Nishi Travel&Soul, 2026-06-16 |
| **Greice** | greice@gpmarketing.com.br | — | Capri Tiberio Palace; Herdade da Malhadinha Nova | GP Marketing | 2 | Luis Sassi Flaptur, 2022-06-24; Luis Sassi Flaptur, 2023-05-24 |
| **Harmony Habay** | harmony.habay@rosewoodhotels.com | — | Rosewood Villa Magna; Rosewood Villa Magna Madrid | Diretora de Vendas; Rosewood Hotels | 2 | Marcia Polacow Agencia, 2024-07-10; Laryssa Siqueira Trivia / Ana Terra, 2025-03-19 |
| **Juliana Khouri** | juliana@conecta.one | wa.me/5511951868055 | — | Diretora de DMCs | 2 | Luis Sassi Flaptur, 2025-03-13; Luis Sassi Flaptur, 2025-04-28 |
| **Lu** | vendas@uxua.com | +55 73 3668 2277 | Uxua Casa Hotel; Uxua Casa Hotel & Spa | Uxua Casa Hotel; Reservas | 2 | Fernanda Balestra, 2021-05-13; Fernando Nishi Travel&Soul / Vivi Yuri Agencia, 2022-09-29 |
| **Marisa** | marisa@xmart.com.br | +55 21 2249-0588 | Mandarin Oriental; X-Mart (representação de hotéis, ex. Wymara) | X-Mart | 2 | Humberto Murakami, 2022-12-29; Fernanda Helou, 2023-01-17 |
| **Melanie Breytenbach** | melanie.breytenbach@kapama.com | — | Kapama | Kapama (lodge safári, África do Sul); Safari Concierge Manager | 2 | Vivi Yuri Agencia, 2025-01-03; Fernanda Credidio Agencia, 2026-07-20 |
| **Melissa Lorenz** | melissa.lorenz@fourseasons.com | +312 208 8470 | Four Seasons Johannesburg | Sales Manager; Four Seasons | 3 | Humberto Murakami, 2022-09-29; Vivi Yuri Agencia, 2023-11-16; Tuca Socia Fernanda Helou, 2024-02-09 |
| **Nathalia Dominguez** | n.dominguez@designhotels.com | +55 21 96952-0342 | Design Hotels | Contato comercial (copiar em pedidos); Design Hotels Inc. | 2 | Luis Sassi Flaptur, 2022-08-15; Fernanda Balestra, 2024-07-04 |
| **Nodira Gehant Mavlyanova** | nodira.gehant@hotellutetia.com | — | Hotel Lutetia (Paris); Hôtel Lutetia | Senior Sales Manager; Hotel Lutetia | 2 | Humberto Murakami, 2022-01-31; Humberto Murakami, 2022-04-20 |
| **None** | info@babuino181.com | — | Babuino 181; Babuino 181 Luxury Suites | Babuino 181 Luxury Suites | 2 | Marcia Polacow Agencia, 2025-07-03; Caroline Assad Audi TA Travel, 2026-01-12 |
| **Pamella Marques** | pamella@xmart.com.br | +55 11 99918-9338 | X-Mart (representação de hotéis, ex. Wymara) | Sales Executive; X Mart | 2 | Humberto Murakami, 2022-12-29; Tuca Socia Fernanda Helou, 2025-07-04 |
| **Patricia Dura** | pdura@nobuhotels.com | — | Nobu Hotel Ibiza | Director of Sales & Marketing; Nobu Hotels | 2 | Fernando Nishi Travel&Soul, 2024-07-01; Fernando Nishi Travel&Soul, 2025-04-02 |
| **Paul Ciaccio** | pciaccio@mohg.com | +34 93 151 8777 | Mandarin Oriental Barcelona | Mandarin Oriental; Sales Manager | 2 | Humberto Murakami, 2025-04-15; Tuca Socia Fernanda Helou, 2025-09-19 |
| **Paula Lalin** | reservas@alvear.com.ar | +54 (11) 4808.2100 | Alvear Palace Hotel | Reservations Executive; Reservas | 2 | Ucha Verissimo Agencia, 2023-04-11; Guilherme Polacow Team Travel, 2026-05-28 |
| **Ricardo Gilber** | ricardo.gilber@fasano.com.br | 73 99818 1091 | Fasano Trancoso | Fasano | 2 | Patricia Lumy, 2025-07-04; Danielle Coltro, 2025-09-12 |
| **Ricardo Ojeda Marins** | ricardo.marins@hyatt.com | +55 11 91315-9611 | Grand Hyatt Baha Mar / Hyatt (Luxury Sales); Hyatt (rede) | Global Sales Manager – Luxury, Lifestyle & Leisure, Hyatt Sales Force; Global Sales Manager – Luxury, Lifestyle & Leisure | 2 | Luis Sassi Flaptur, 2022-12-14; Luis Sassi Flaptur, 2023-06-15 |
| **Rosemeire Martinez** | rosemeire.martinez@rcaturismo.com.br | — | RCA Turismo | RCA Turismo | 2 | Juliana Haus 22, 2021-06-07; Juliana Haus 22, 2021-06-07 |
| **Thierry Baurez** | thierry.baurez@trumphotels.com | +507 6329-1184 | Trump Hotels; Trump National Doral Miami | Director Global Sales; Trump Hotels | 2 | Luis Sassi Flaptur, 2022-05-30; Luis Sassi Flaptur, 2023-08-23 |
| **Thomas Citterio** | tcitterio@badruttspalace.com | — | Badrutt's Palace; Badrutt's Palace St Moritz | Contato comercial; Badrutt's Palace | 2 | Humberto Murakami, 2024-03-28; Tuca Socia Fernanda Helou, 2025-05-29 |
