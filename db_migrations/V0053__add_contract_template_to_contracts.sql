ALTER TABLE t_p17532248_concert_platform_mvp.contracts
  ADD COLUMN IF NOT EXISTS contract_template TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contract_subject  TEXT NOT NULL DEFAULT '';
