/* "Fale com o Max" — bloco fixo do wrap-up (Carla, 19/10/2026): grupo,
   conversa individual e agenda. Um texto só para e-mail, arte e WhatsApp. */
export const MAX_HOW_TO: { title: string; text: string; short: string }[] = [
  {
    title: 'No grupo',
    text: 'Comece a mensagem com "Max," ou marque o @Max. Ele só responde quando é chamado.',
    short: 'No grupo: comece com "Max," ou marque o @Max',
  },
  {
    title: 'No privado',
    text: 'Mande mensagem direto pro Max, no mesmo número do grupo. A conversa fica só entre vocês: pergunte sobre hotéis, fornecedores e ofertas que a rede já registrou.',
    short: 'No privado: fale direto com o Max, só entre vocês',
  },
  {
    title: 'Na agenda',
    text: 'Escreva algo como "Max, registra na agenda o treinamento Six Senses dia 28/10 às 15h, online". Ele repete o que entendeu, você responde "sim" e o evento entra na agenda da rede. Ele também corrige ou cancela eventos que você criou e marca sua presença.',
    short: 'Na agenda: "Max, registra o treinamento dia 28/10 às 15h" e responda "sim"',
  },
]

export function maxHowToWhatsApp(): string {
  return `*Fale com o Max*\n${MAX_HOW_TO.map(i => `- ${i.short}`).join('\n')}`
}
