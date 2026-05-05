ALTER TABLE t_p17532248_concert_platform_mvp.ticket_sales
  ADD COLUMN IF NOT EXISTS set_id text NOT NULL DEFAULT '';
