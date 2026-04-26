CREATE TABLE t_p17532248_concert_platform_mvp.sessions (
    session_id  TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES t_p17532248_concert_platform_mvp.users(id),
    user_data   JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON t_p17532248_concert_platform_mvp.sessions(user_id);
CREATE INDEX idx_sessions_last_seen ON t_p17532248_concert_platform_mvp.sessions(last_seen);
