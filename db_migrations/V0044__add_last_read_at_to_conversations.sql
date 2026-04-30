-- Время последнего прочтения диалога каждой стороной
-- Используется чтобы помечать сообщения как "прочитанные" (две галочки) vs "доставленные" (одна)
ALTER TABLE t_p17532248_concert_platform_mvp.conversations
ADD COLUMN IF NOT EXISTS organizer_last_read_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS venue_last_read_at     TIMESTAMPTZ DEFAULT NOW();