ALTER TABLE t_p17532248_concert_platform_mvp.employees
  ADD COLUMN IF NOT EXISTS nav_hidden_tabs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mail_account_id uuid NULL;
