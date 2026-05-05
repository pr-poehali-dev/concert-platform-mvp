-- Исправляем venue_name в диалогах где записано имя организатора вместо имени площадки
-- Диалог 1e725f20: venue_user_id = 92579ba7, его имя в users = "BANY | MDRN", нет площадки в venues
UPDATE t_p17532248_concert_platform_mvp.conversations
SET venue_name = 'BANY | MDRN'
WHERE id = '1e725f20-6841-433c-ab76-2bf6d15d55c6'
  AND venue_name = 'Нефедьев Артем';

-- Диалог b2bc65e4: venue_user_id = ae3aa772 (Нефедьев Артем), organizer = Яковенко
-- venue_name ошибочно = 'Яковенко Александр Дмитриевич' (имя организатора)
-- У ae3aa772 нет площадки в venues, используем имя из users
UPDATE t_p17532248_concert_platform_mvp.conversations
SET venue_name = u.name
FROM t_p17532248_concert_platform_mvp.users u
WHERE t_p17532248_concert_platform_mvp.conversations.id = 'b2bc65e4-885e-421f-b96a-279efef9d0ca'
  AND u.id = t_p17532248_concert_platform_mvp.conversations.venue_user_id;

-- venue_id для диалогов где venue_id = venue_user_id (неправильно — должен быть id из venues)
-- Обновляем venue_id там, где он совпадает с venue_user_id но в таблице venues есть реальная запись
UPDATE t_p17532248_concert_platform_mvp.conversations c
SET venue_id = v.id,
    venue_name = v.name
FROM t_p17532248_concert_platform_mvp.venues v
WHERE v.user_id = c.venue_user_id
  AND c.venue_id = c.venue_user_id
  AND v.name IS NOT NULL
  AND v.name != '';
