-- Поле last_seen для сотрудников: когда employee последний раз был в сети
ALTER TABLE t_p17532248_concert_platform_mvp.employees
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employees_last_seen
ON t_p17532248_concert_platform_mvp.employees(last_seen DESC);