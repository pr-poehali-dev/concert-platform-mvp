-- Тестовый пользователь со старым SHA256 хешем для проверки обратной совместимости
INSERT INTO t_p17532248_concert_platform_mvp.users
  (name, email, password_hash, role, city, avatar, avatar_color, status)
VALUES
  ('Legacy Test', 'legacy_sha256_test@example.com',
   '2388d53ca74daf193777c7e8f43b6d9c9618d732870345afec4c4a752ea12ed7',
   'organizer', 'Москва', 'LT', 'from-neon-purple to-neon-cyan', 'approved')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash;