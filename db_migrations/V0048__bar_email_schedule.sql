
ALTER TABLE t_p17532248_concert_platform_mvp.bar_integrations
  ADD COLUMN IF NOT EXISTS email_report_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_report_to        TEXT,
  ADD COLUMN IF NOT EXISTS email_report_time      VARCHAR(5)  NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS email_report_types     TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS email_report_last_sent TIMESTAMPTZ;
