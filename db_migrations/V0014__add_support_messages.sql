CREATE TABLE t_p17532248_concert_platform_mvp.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sender TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
    text TEXT NOT NULL,
    is_read_by_admin BOOLEAN NOT NULL DEFAULT false,
    is_read_by_user  BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_user ON t_p17532248_concert_platform_mvp.support_messages(user_id, created_at);
