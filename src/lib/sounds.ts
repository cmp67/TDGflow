// Web Audio API — TDG Flow Sound System
// Warm, low tones — premium acoustic UX signature

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12
) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration + 0.05)
  } catch { /* ignore — audio blocked by browser */ }
}

export const sounds = {
  // ── Gravações ──────────────────────────────────────────────────
  // Gravar iniciada — chime suave ascendente
  recordStart() {
    tone(440, 0.12, 'sine', 0.10)
    setTimeout(() => tone(660, 0.15, 'sine', 0.08), 80)
  },

  // Gravação parada — nota descendente
  recordStop() {
    tone(440, 0.10, 'sine', 0.08)
    setTimeout(() => tone(330, 0.18, 'sine', 0.07), 70)
  },

  // Transcrição completa — conclusão
  transcribed() {
    tone(392, 0.10, 'sine', 0.08)
    setTimeout(() => tone(523, 0.10, 'sine', 0.08), 100)
    setTimeout(() => tone(659, 0.22, 'sine', 0.07), 200)
  },

  // ── Navegação & UI ────────────────────────────────────────────
  // Nav click — click ultra-suave, quase subliminar
  nav() {
    tone(720, 0.07, 'sine', 0.05)
  },

  // Step do formulário para frente — nota ascendente
  stepNext() {
    tone(523, 0.08, 'sine', 0.08)
    setTimeout(() => tone(659, 0.12, 'sine', 0.07), 70)
  },

  // Step do formulário para trás — nota descendente
  stepBack() {
    tone(523, 0.10, 'sine', 0.07)
    setTimeout(() => tone(415, 0.14, 'sine', 0.06), 70)
  },

  // ── Ações ─────────────────────────────────────────────────────
  // Favorito adicionado — ping cálido com shimmer
  favoriteAdd() {
    tone(1046, 0.28, 'sine', 0.10)
    setTimeout(() => tone(1050, 0.28, 'sine', 0.04), 5)  // detune = chorus
  },

  // Favorito removido — ping mais suave, descendente
  favoriteRemove() {
    tone(880, 0.15, 'sine', 0.07)
    setTimeout(() => tone(698, 0.18, 'sine', 0.05), 80)
  },

  // Dica salva com sucesso — arpejo maior (C5 → E5 → G5)
  saved() {
    tone(523, 0.16, 'sine', 0.13)   // C5
    setTimeout(() => tone(659, 0.16, 'sine', 0.12), 120) // E5
    setTimeout(() => tone(784, 0.28, 'sine', 0.11), 240) // G5
  },

  // ── Chat ──────────────────────────────────────────────────────
  // Enviar mensagem — click suave
  send() {
    tone(660, 0.06, 'sine', 0.08)
  },

  // Resposta do assistente — warm chime
  reply() {
    tone(392, 0.08, 'sine', 0.07)
    setTimeout(() => tone(494, 0.12, 'sine', 0.06), 60)
    setTimeout(() => tone(587, 0.20, 'sine', 0.05), 130)
  },

  // ── Sentiment slider — escala diatônica Dó maior, −5 a +5 ──────
  // 11 notas consecutivas centradas no Dó central (C4 = neutro).
  // Negativo desce: Si La Sol Fá Mi | Dó | Re Mi Fá Sol La positivo sobe
  tick(value: number) {
    const freqs: Record<number, number> = {
      [-5]: 164.8,  // Mi3  (Mi)
      [-4]: 174.6,  // Fá3  (Fá)
      [-3]: 196.0,  // Sol3 (Sol)
      [-2]: 220.0,  // Lá3  (Lá)
      [-1]: 246.9,  // Si3  (Si)
        [0]: 261.6, // Dó4  (Dó) — centro neutro
        [1]: 293.7, // Ré4  (Ré)
        [2]: 329.6, // Mi4  (Mi)
        [3]: 349.2, // Fá4  (Fá)
        [4]: 392.0, // Sol4 (Sol)
        [5]: 440.0, // Lá4  (Lá)
    }
    const freq = freqs[value] ?? 261.6
    tone(freq, 0.10, 'sine', 0.10)
    setTimeout(() => tone(freq * 2, 0.06, 'sine', 0.03), 10)
  },

  // ── Erro ──────────────────────────────────────────────────────
  // Erro — nota baixa, gentil
  error() {
    tone(440, 0.10, 'sine', 0.08)
    setTimeout(() => tone(370, 0.22, 'sine', 0.07), 80)
  },
}
