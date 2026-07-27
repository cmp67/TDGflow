// Regras de negócio pra upload de vídeo em tdg_knowledge — extraídas em
// função pura testável (mesmo padrão de src/lib/review-questions.ts),
// usadas tanto pelo servidor (POST /api/knowledge) quanto documentadas aqui
// pro client seguir a mesma checagem antes de subir o arquivo.

export const MAX_VIDEO_DURATION_SECONDS = 30
export const MAX_VIDEO_FILE_BYTES = 25 * 1024 * 1024 // 25MB — clipe de 30s sem transcoding cabe fácil

export interface VideoUploadInput {
  durationSeconds: number | null | undefined
  fileSize: number
  agreedWithHotel: boolean
  filmedAt: string | null | undefined // YYYY-MM-DD
}

export type VideoUploadValidation =
  | { ok: true }
  | { ok: false; error: string }

// Nunca aceita vídeo sem duração conhecida — é o dado que garante o limite
// de 30s. Também nunca aceita sem confirmação de que o hotel autorizou
// esse conteúdo a circular além da rede interna (vai aparecer pro cliente
// final), e sem a data em que foi filmado (staleness importa mais em
// vídeo — o quarto pode ter sido reformado desde então).
export function validateVideoUpload(input: VideoUploadInput): VideoUploadValidation {
  if (input.durationSeconds == null) {
    return { ok: false, error: 'Não foi possível ler a duração do vídeo — tente outro arquivo.' }
  }
  if (input.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return { ok: false, error: `Vídeo muito longo (${Math.round(input.durationSeconds)}s) — o limite é ${MAX_VIDEO_DURATION_SECONDS}s por clipe.` }
  }
  if (input.fileSize > MAX_VIDEO_FILE_BYTES) {
    return { ok: false, error: 'Arquivo muito grande — o limite é 25MB por clipe.' }
  }
  if (!input.agreedWithHotel) {
    return { ok: false, error: 'Confirme que o hotel autorizou esse vídeo antes de publicar.' }
  }
  if (!input.filmedAt) {
    return { ok: false, error: 'Informe a data em que o vídeo foi filmado.' }
  }
  return { ok: true }
}

// Lê a duração de um arquivo de vídeo no navegador antes do upload — usa a
// própria API nativa de <video>, sem biblioteca extra. Só roda no client
// (precisa de document/URL.createObjectURL).
export function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Não foi possível ler o vídeo'))
    }
    video.src = URL.createObjectURL(file)
  })
}
