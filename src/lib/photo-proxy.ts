/* Foto de destaque recortada pro e-mail e a arte (19/10/2026): foto de
   celular em pé ocupava meio e-mail. Só aceita fotos do nosso Blob — o
   proxy nunca busca endereço arbitrário. */
export function allowedPhotoUrl(u: string | null): URL | null {
  if (!u) return null
  try {
    const url = new URL(u)
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') ? url : null
  } catch { return null }
}

export function croppedPhotoUrl(appUrl: string, src: string): string {
  return `${appUrl}/api/wrapup/photo?u=${encodeURIComponent(src)}`
}
