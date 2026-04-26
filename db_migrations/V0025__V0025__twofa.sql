-- Флаг 2FA на пользователях
ALTER TABLE t_p17532248_concert_platform_mvp.users
    ADD COLUMN twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Временные коды 2FA
CREATE TABLE t_p17532248_concert_platform_mvp.twofa_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_session_id TEXT NOT NULL UNIQUE,
    user_id     UUID NOT NULL REFERENCES t_p17532248_concert_platform_mvp.users(id),
    user_data   JSONB NOT NULL DEFAULT '{}',
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_twofa_codes_temp_session ON t_p17532248_concert_platform_mvp.twofa_codes(temp_session_id);
CREATE INDEX idx_twofa_codes_expires ON t_p17532248_concert_platform_mvp.twofa_codes(expires_at);
