-- LID no WhatsApp (18/10/2026): o remetente pode chegar como <15 dígitos>@lid,
-- que não é telefone. sender_phone passa a guardar só telefone real (ou NULL);
-- sender_jid guarda o JID como veio, pra escopar a memória de grupo por
-- pessoa mesmo sem telefone. Só aditiva e idempotente.
BEGIN;
ALTER TABLE tdg_max_messages ADD COLUMN IF NOT EXISTS sender_jid text;
COMMIT;
