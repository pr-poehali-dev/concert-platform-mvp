-- Добавляем полный шаблон договора к площадке (если его ещё нет)
ALTER TABLE t_p17532248_concert_platform_mvp.venues 
  ADD COLUMN IF NOT EXISTS contract_template TEXT NOT NULL DEFAULT '';
