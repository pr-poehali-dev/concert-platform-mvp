ALTER TABLE t_p17532248_concert_platform_mvp.project_tasks
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ DEFAULT NULL;