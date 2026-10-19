import { describe, it, expect } from 'vitest'
import { allowedPhotoUrl, croppedPhotoUrl } from './photo-proxy'

describe('proxy da foto de destaque', () => {
  it('só aceita https do nosso Blob', () => {
    expect(allowedPhotoUrl('https://ieshp7umrd0jcopy.public.blob.vercel-storage.com/reviews/a.jpg')).not.toBeNull()
    expect(allowedPhotoUrl('https://evil.com/a.jpg')).toBeNull()
    expect(allowedPhotoUrl('http://x.public.blob.vercel-storage.com/a.jpg')).toBeNull()
    expect(allowedPhotoUrl('https://public.blob.vercel-storage.com.evil.com/a.jpg')).toBeNull()
    expect(allowedPhotoUrl('nada')).toBeNull()
  })
  it('monta o link com a URL codificada', () => {
    expect(croppedPhotoUrl('https://app', 'https://x/a b.jpg')).toBe('https://app/api/wrapup/photo?u=https%3A%2F%2Fx%2Fa%20b.jpg')
  })
})
