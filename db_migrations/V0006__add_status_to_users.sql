ALTER TABLE t_p17532248_concert_platform_mvp.users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Уже существующие верифицированные пользователи — approved
UPDATE t_p17532248_concert_platform_mvp.users SET status = 'approved' WHERE verified = TRUE;
-- Остальные существующие (зарегистрированные до фичи) — тоже approved, чтобы не блокировать
UPDATE t_p17532248_concert_platform_mvp.users SET status = 'approved' WHERE status = 'pending';