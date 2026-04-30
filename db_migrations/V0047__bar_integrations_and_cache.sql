
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.bar_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_user_id    UUID NOT NULL,
  integration_type VARCHAR(20) NOT NULL CHECK (integration_type IN ('iiko', 'rkeeper')),
  iiko_api_login   TEXT,
  iiko_org_id      TEXT,
  rk_server_url    TEXT,
  rk_cash_id       TEXT,
  rk_license_code  TEXT,
  display_name     TEXT NOT NULL DEFAULT 'Бар',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(venue_user_id, integration_type)
);

CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.bar_report_cache (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id   UUID NOT NULL,
  report_type      VARCHAR(30) NOT NULL,
  event_id         UUID,
  date_from        TIMESTAMPTZ,
  date_to          TIMESTAMPTZ,
  payload          JSONB NOT NULL DEFAULT '{}',
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bar_integrations_venue ON t_p17532248_concert_platform_mvp.bar_integrations(venue_user_id);
CREATE INDEX IF NOT EXISTS idx_bar_report_cache_int   ON t_p17532248_concert_platform_mvp.bar_report_cache(integration_id, report_type);
