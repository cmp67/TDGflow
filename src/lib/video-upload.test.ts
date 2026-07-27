import { describe, it, expect } from 'vitest'
import { validateVideoUpload, MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_FILE_BYTES } from './video-upload'

const VALID = { durationSeconds: 25, fileSize: 5_000_000, agreedWithHotel: true, filmedAt: '2026-07-27' }

describe('validateVideoUpload', () => {
  it('aceita um vídeo dentro de todos os limites', () => {
    expect(validateVideoUpload(VALID)).toEqual({ ok: true })
  })

  it('rejeita quando a duração é desconhecida (null/undefined) — nunca aceita sem saber o limite de 30s', () => {
    expect(validateVideoUpload({ ...VALID, durationSeconds: null }).ok).toBe(false)
    expect(validateVideoUpload({ ...VALID, durationSeconds: undefined }).ok).toBe(false)
  })

  it('rejeita vídeo acima de 30 segundos', () => {
    const result = validateVideoUpload({ ...VALID, durationSeconds: 31 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('31s')
  })

  it('aceita exatamente no limite de 30 segundos', () => {
    expect(validateVideoUpload({ ...VALID, durationSeconds: MAX_VIDEO_DURATION_SECONDS }).ok).toBe(true)
  })

  it('rejeita arquivo acima de 25MB', () => {
    expect(validateVideoUpload({ ...VALID, fileSize: MAX_VIDEO_FILE_BYTES + 1 }).ok).toBe(false)
  })

  it('rejeita sem confirmação de que o hotel autorizou', () => {
    expect(validateVideoUpload({ ...VALID, agreedWithHotel: false }).ok).toBe(false)
  })

  it('rejeita sem data de filmagem', () => {
    expect(validateVideoUpload({ ...VALID, filmedAt: null }).ok).toBe(false)
    expect(validateVideoUpload({ ...VALID, filmedAt: '' }).ok).toBe(false)
  })
})
