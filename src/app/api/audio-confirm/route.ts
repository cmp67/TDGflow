import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { id, audio_shared, summary } = await req.json()

  const { rows } = await sql`
    UPDATE tdg_audio_inputs
    SET audio_shared = ${audio_shared},
        summary = ${JSON.stringify(summary)},
        confirmed_at = NOW()
    WHERE id = ${id}
    RETURNING *`

  return NextResponse.json({ success: true, input: rows[0] })
}
