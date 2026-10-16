import { sql } from '@vercel/postgres'

export type MaxTurn = { role: 'user' | 'assistant'; content: string }

/* Idempotência: webhook da uazapi pode reentregar. Devolve false se já vimos. */
export async function rememberInbound(m: { messageId: string; chatId: string; isGroup: boolean; senderPhone: string; userId: string | null; content: string }): Promise<boolean> {
  const { rowCount } = await sql`
    INSERT INTO tdg_max_messages (message_id, chat_id, is_group, direction, sender_phone, user_id, content)
    VALUES (${m.messageId}, ${m.chatId}, ${m.isGroup}, 'in', ${m.senderPhone}, ${m.userId}, ${m.content})
    ON CONFLICT (message_id) DO NOTHING`
  return (rowCount ?? 0) > 0
}

export async function rememberOutbound(m: { messageId: string; chatId: string; isGroup: boolean; userId: string | null; content: string; tokensIn: number; tokensOut: number }): Promise<void> {
  await sql`
    INSERT INTO tdg_max_messages (message_id, chat_id, is_group, direction, user_id, content, tokens_in, tokens_out)
    VALUES (${m.messageId}, ${m.chatId}, ${m.isGroup}, 'out', ${m.userId}, ${m.content}, ${m.tokensIn}, ${m.tokensOut})
    ON CONFLICT (message_id) DO NOTHING`
}

/* Últimas trocas do chat, em ordem cronológica, pra dar continuidade
   ("sim" depois de "Registro assim?"). Em grupo, só o que é da mesma pessoa
   com o Max — nunca a conversa dos outros. */
export async function recentTurns(chatId: string, senderPhone: string, isGroup: boolean, limit = 12, hours = 48): Promise<MaxTurn[]> {
  const { rows } = await sql.query(
    `SELECT direction, content FROM tdg_max_messages
      WHERE chat_id = $1 AND created_at > now() - ($3 || ' hours')::interval
        AND ($4::boolean = false OR direction = 'out' OR sender_phone = $2)
      ORDER BY created_at DESC LIMIT $5`,
    [chatId, senderPhone, String(hours), isGroup, limit],
  )
  return rows.reverse().map(r => ({ role: r.direction === 'in' ? 'user' : 'assistant', content: r.content as string }))
}
