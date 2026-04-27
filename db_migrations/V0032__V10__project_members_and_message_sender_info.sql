CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.project_members (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   uuid NOT NULL,
    user_id      uuid NOT NULL,
    role         text NOT NULL DEFAULT 'partner',
    invited_by   uuid,
    invited_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE t_p17532248_concert_platform_mvp.messages
    ADD COLUMN IF NOT EXISTS sender_name    text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sender_role    text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sender_company text NOT NULL DEFAULT '';
