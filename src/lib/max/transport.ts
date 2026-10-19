/* Transporte WhatsApp via uazapi (docs.uazapi.com): POST /send/text com o
   token da instância no header `token`. Nunca o admintoken. */

export type UazapiConfig = { baseUrl: string; instanceToken: string }

export function readUazapiConfig(env: Record<string, string | undefined>): UazapiConfig | null {
  const baseUrl = (env.UAZAPI_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const instanceToken = (env.UAZAPI_INSTANCE_TOKEN ?? '').trim()
  if (!/^https:\/\/\S+$/.test(baseUrl) || !instanceToken) return null
  return { baseUrl, instanceToken }
}

export async function sendWhatsAppText(
  config: UazapiConfig,
  input: { chatId: string; text: string; dedupeKey: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(`${config.baseUrl}/send/text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', token: config.instanceToken },
      body: JSON.stringify({ number: input.chatId, text: input.text, track_source: 'tdg-flow-max', track_id: input.dedupeKey }),
      signal: AbortSignal.timeout(15000),
    })
    const json = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) return { ok: false, error: `uazapi ${res.status}: ${typeof json.error === 'string' ? json.error : res.statusText}` }
    const id = typeof json.messageid === 'string' ? json.messageid : ''
    return id ? { ok: true, messageId: id } : { ok: false, error: 'uazapi respondeu sem messageid' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/* Imagem com legenda (wrap-up em arte, 19/10/2026): POST /send/media. A
   uazapi baixa o arquivo pela URL — por isso a URL da arte é assinada. */
export async function sendWhatsAppImage(
  config: UazapiConfig,
  input: { chatId: string; imageUrl: string; caption: string; dedupeKey: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(`${config.baseUrl}/send/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', token: config.instanceToken },
      body: JSON.stringify({ number: input.chatId, type: 'image', file: input.imageUrl, text: input.caption, track_source: 'tdg-flow-max', track_id: input.dedupeKey }),
      signal: AbortSignal.timeout(45000),
    })
    const json = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) return { ok: false, error: `uazapi ${res.status}: ${typeof json.error === 'string' ? json.error : res.statusText}` }
    const id = typeof json.messageid === 'string' ? json.messageid : ''
    return id ? { ok: true, messageId: id } : { ok: false, error: 'uazapi respondeu sem messageid' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
