-- Нормализуем телефон: убираем пробелы/скобки/тире для уникального поиска
-- Делаем email необязательным (для регистрации только по телефону)
ALTER TABLE t_p17532248_concert_platform_mvp.users
    ALTER COLUMN email SET DEFAULT '';

-- Уникальный частичный индекс на phone (только непустые значения)
CREATE UNIQUE INDEX idx_users_phone_unique
    ON t_p17532248_concert_platform_mvp.users (phone)
    WHERE phone != '';

-- Частичный уникальный индекс на email (только непустые)
CREATE UNIQUE INDEX idx_users_email_unique_nonempty
    ON t_p17532248_concert_platform_mvp.users (email)
    WHERE email != '';
