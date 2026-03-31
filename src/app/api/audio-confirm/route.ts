import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { id, audio_shared, summary } = await req.json()

  const { data, error } = await supabase
    .from('tdg_audio_inputs')
    .update({
      audio_shared,
      summary,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Se audio não deve ser partilhado, remover do storage público
  if (!audio_shared && data.audio_url) {
    const path = data.audio_url.split('/tdg-audio/')[1]
    if (path) {
      await supabase.storage.from('tdg-audio').move(path, `private/${path}`)
    }
  }

  return NextResponse.json({ success: true, input: data })
}
