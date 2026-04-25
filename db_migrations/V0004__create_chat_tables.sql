CREATE TABLE t_p17532248_concert_platform_mvp.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  venue_id UUID NOT NULL,
  venue_user_id UUID NOT NULL,
  venue_name TEXT NOT NULL DEFAULT '',
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organizer_unread INTEGER NOT NULL DEFAULT 0,
  venue_unread INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organizer_id, venue_id)
);

CREATE TABLE t_p17532248_concert_platform_mvp.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conv_id ON t_p17532248_concert_platform_mvp.messages(conversation_id);
CREATE INDEX idx_conversations_organizer ON t_p17532248_concert_platform_mvp.conversations(organizer_id);
CREATE INDEX idx_conversations_venue_user ON t_p17532248_concert_platform_mvp.conversations(venue_user_id);