-- Foto real anexada por quem confirmou a visita (Vercel Blob). Nunca existe
-- em lead de reunião comercial — ninguém foi lá pessoalmente ainda, então
-- não há o que fotografar. Ausência de foto num review publicado é normal
-- (nem todo mundo tira foto) — a UI cai pro traço dourado nesse caso.
ALTER TABLE tdg_hotel_reviews
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
