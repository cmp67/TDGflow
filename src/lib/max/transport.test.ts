import { describe, it, expect, vi } from 'vitest'
import { sendWhatsAppImage } from './transport'

const config = { baseUrl: 'https://u.example', instanceToken: 'tok' }

describe('sendWhatsAppImage (wrap-up em arte, 19/10/2026)', () => {
  it('posta em /send/media com a imagem por URL e a legenda', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageid: 'M1' }), { status: 200 }))
    const r = await sendWhatsAppImage(config, { chatId: 'g@g.us', imageUrl: 'https://img/x.png', caption: 'oi', dedupeKey: 'k' }, f)
    expect(r).toEqual({ ok: true, messageId: 'M1' })
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://u.example/send/media')
    expect(init.headers.token).toBe('tok')
    expect(JSON.parse(init.body)).toMatchObject({ number: 'g@g.us', type: 'image', file: 'https://img/x.png', text: 'oi' })
  })
  it('erro da uazapi vira ok:false sem lançar', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'bad' }), { status: 400 }))
    expect(await sendWhatsAppImage(config, { chatId: 'g', imageUrl: 'u', caption: '', dedupeKey: 'k' }, f)).toEqual({ ok: false, error: 'uazapi 400: bad' })
  })
})
