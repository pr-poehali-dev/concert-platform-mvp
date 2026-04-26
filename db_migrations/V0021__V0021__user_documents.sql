CREATE TABLE t_p17532248_concert_platform_mvp.user_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES t_p17532248_concert_platform_mvp.users(id),
    user_role   TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'other',
    name        TEXT NOT NULL,
    file_url    TEXT NOT NULL,
    file_size   BIGINT NOT NULL DEFAULT 0,
    mime_type   TEXT NOT NULL DEFAULT '',
    note        TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_documents_user_id ON t_p17532248_concert_platform_mvp.user_documents(user_id);
