-- Push-подписки пользователей для Web Push уведомлений
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.push_subscriptions (
    id          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL,
    endpoint    text        NOT NULL UNIQUE,
    p256dh      text        NOT NULL,
    auth        text        NOT NULL,
    user_agent  text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
    ON t_p17532248_concert_platform_mvp.push_subscriptions(user_id);
