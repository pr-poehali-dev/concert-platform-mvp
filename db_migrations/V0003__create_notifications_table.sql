CREATE TABLE t_p17532248_concert_platform_mvp.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link_page TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON t_p17532248_concert_platform_mvp.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON t_p17532248_concert_platform_mvp.notifications(created_at DESC);