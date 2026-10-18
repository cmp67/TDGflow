import { sql } from '@vercel/postgres'

export type MaxTurn = { role: 'user' | 'assistant'; content: string }

/* Idempotência: webhook da uazapi pode reentregar. Devolve false se já vimos. */
export async function rememberInbound(m: { messageId: string; chatId: string; isGroup: boolean; senderPhone: string | null; senderJid: string; userId: string | null; content: string }): Promise<boolean> {
  const { rowCount } = await sql`
    INSERT INTO tdg_max_messages (message_id, chat_id, is_group, direction, sender_phone, sender_jid, user_id, content)
    VALUES (${m.messageId}, ${m.chatId}, ${m.isGroup}, 'in', ${m.senderPhone}, ${m.senderJid}, ${m.userId}, ${m.content})
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
   com o Max — nunca a conversa dos outros. A pessoa é identificada pelo JID
   (funciona com LID, sem telefone). */
export async function recentTurns(chatId: string, senderJid: string, isGroup: boolean, limit = 12, hours = 48): Promise<MaxTurn[]> {
  const { rows } = await sql.query(
    `SELECT direction, content FROM tdg_max_messages
      WHERE chat_id = $1 AND created_at > now() - ($3 || ' hours')::interval
        AND ($4::boolean = false OR direction = 'out' OR sender_jid = $2 OR sender_phone = $2)
      ORDER BY created_at DESC LIMIT $5`,
    [chatId, senderJid, String(hours), isGroup, limit],
  )
  return rows.reverse().map(r => ({ role: r.direction === 'in' ? 'user' : 'assistant', content: r.content as string }))
}

/* LID da instância: env manual vence; senão o aprendido das mensagens fromMe. */
export async function knownInstanceLid(env: Record<string, string | undefined> = process.env): Promise<string | null> {
  const manual = (env.UAZAPI_INSTANCE_LID ?? '').replace(/\D/g, '')
  if (manual) return manual
  const { rows } = await sql`SELECT value FROM tdg_max_state WHERE key = 'instance_lid'`
  return (rows[0]?.value as string | undefined) ?? null
}

export async function rememberInstanceLid(lid: string): Promise<void> {
  await sql`INSERT INTO tdg_max_state (key, value) VALUES ('instance_lid', ${lid})
            ON CONFLICT (key) DO UPDATE SET value = ${lid}, updated_at = now()`
}

/* A mensagem citada num reply foi enviada pelo Max? */
export async function isMaxOutbound(messageId: string): Promise<boolean> {
  const { rows } = await sql`SELECT 1 FROM tdg_max_messages WHERE message_id = ${messageId} AND direction = 'out' LIMIT 1`
  return rows.length > 0
}
