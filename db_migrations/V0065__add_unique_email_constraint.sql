-- Добавить UNIQUE constraint на email в таблице users
-- для гарантии одного кабинета на один email на уровне БД
ALTER TABLE t_p17532248_concert_platform_mvp.users
  ADD CONSTRAINT users_email_unique UNIQUE (email);