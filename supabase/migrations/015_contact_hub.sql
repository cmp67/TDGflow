-- Contact Hub: unifica "Fornecedores" e "Rede/Contatos" num único hub, com
-- Fornecedores e Contatos (pessoas) como duas lentes de um mesmo dado —
-- decisão do painel Tesla (designer/arquiteto/UX expert) sobre o combinado
-- na reunião com Adriano ("diferenciar hotéis parceiros e contatos em um
-- contact hub"). Pessoa deixa de exigir vínculo com um fornecedor: hotel_id
-- vira opcional, com FK de verdade (nunca existia uma antes).

ALTER TABLE tdg_hotel_contacts ALTER COLUMN hotel_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tdg_hotel_contacts_hotel_id_fkey'
  ) THEN
    ALTER TABLE tdg_hotel_contacts
      ADD CONSTRAINT tdg_hotel_contacts_hotel_id_fkey
      FOREIGN KEY (hotel_id) REFERENCES tdg_hotels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- is_network_contact não faz mais sentido: contato passa a ser pessoa por
-- padrão (com ou sem fornecedor vinculado), não um subconjunto marcado.
ALTER TABLE tdg_hotel_contacts DROP COLUMN IF EXISTS is_network_contact;

CREATE INDEX IF NOT EXISTS idx_tdg_hotel_contacts_category ON tdg_hotel_contacts (category);
CREATE INDEX IF NOT EXISTS idx_tdg_hotel_contacts_hotel_id ON tdg_hotel_contacts (hotel_id);
