ALTER TABLE t_p17532248_concert_platform_mvp.users
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;
