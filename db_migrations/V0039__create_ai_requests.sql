CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.ai_requests (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    user_name   TEXT NOT NULL DEFAULT '',
    user_email  TEXT NOT NULL DEFAULT '',
    user_role   TEXT NOT NULL DEFAULT '',
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
    is_helpful  BOOLEAN,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_requests_user_id_idx   ON t_p17532248_concert_platform_mvp.ai_requests(user_id);
CREATE INDEX IF NOT EXISTS ai_requests_created_at_idx ON t_p17532248_concert_platform_mvp.ai_requests(created_at DESC);
