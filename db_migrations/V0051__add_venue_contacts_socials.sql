ALTER TABLE t_p17532248_concert_platform_mvp.venues
  ADD COLUMN IF NOT EXISTS email      text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram   text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vk         text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram  text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp   text NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS youtube    text NULL DEFAULT '';