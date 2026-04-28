-- Добавляем числовой публичный ID для пользователей
ALTER TABLE t_p17532248_concert_platform_mvp.users
  ADD COLUMN IF NOT EXISTS display_id bigint;

-- Создаём последовательность начиная с 10001
CREATE SEQUENCE IF NOT EXISTS t_p17532248_concert_platform_mvp.users_display_id_seq
  START WITH 10001 INCREMENT BY 1;

-- Присваиваем всем существующим пользователям display_id
UPDATE t_p17532248_concert_platform_mvp.users
SET display_id = nextval('t_p17532248_concert_platform_mvp.users_display_id_seq')
WHERE display_id IS NULL;

-- Делаем колонку обязательной и уникальной
ALTER TABLE t_p17532248_concert_platform_mvp.users
  ALTER COLUMN display_id SET NOT NULL,
  ALTER COLUMN display_id SET DEFAULT nextval('t_p17532248_concert_platform_mvp.users_display_id_seq');

CREATE UNIQUE INDEX IF NOT EXISTS users_display_id_idx
  ON t_p17532248_concert_platform_mvp.users(display_id);
