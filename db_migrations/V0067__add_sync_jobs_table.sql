-- Таблица для хранения статуса фоновых задач синхронизации
CREATE TABLE t_p17532248_concert_platform_mvp.sync_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL,
  status      text NOT NULL DEFAULT 'running',  -- running | done | error
  result      jsonb,
  error       text,
  started_at  timestamptz NOT NULL DEFAULT NOW(),
  finished_at timestamptz
);
CREATE INDEX idx_sync_jobs_integration ON t_p17532248_concert_platform_mvp.sync_jobs (integration_id, started_at DESC);