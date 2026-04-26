ALTER TABLE t_p17532248_concert_platform_mvp.messages
    ADD COLUMN attachment_url  TEXT NOT NULL DEFAULT '',
    ADD COLUMN attachment_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN attachment_size BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN attachment_mime TEXT NOT NULL DEFAULT '';
