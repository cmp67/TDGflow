import { sql } from '@vercel/postgres'

export type EventType =
  | 'chat'
  | 'transcription'
  | 'travel_docs'
  | 'review_extraction'

interface LogParams {
  event_type: EventType
  user_email: string
  tokens_in?: number
  tokens_out?: number
  requests?: number
  meta?: Record<string, unknown>
}

/** Fire-and-forget — never throws, never blocks the main response */
export function logUsage(params: LogParams): void {
  sql`
    INSERT INTO tdg_usage_logs (event_type, user_email, tokens_in, tokens_out, requests, meta)
    VALUES (
      ${params.event_type},
      ${params.user_email},
      ${params.tokens_in ?? null},
      ${params.tokens_out ?? null},
      ${params.requests ?? 1},
      ${params.meta ? JSON.stringify(params.meta) : null}
    )
  `.catch(() => { /* silent — logging must never break the main flow */ })
}
