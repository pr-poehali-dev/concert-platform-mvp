-- Шаг 1: делаем дублирующиеся note уникальными через добавление суффикса с id
UPDATE t_p17532248_concert_platform_mvp.project_income_lines
SET note = note || '_old_' || id::text
WHERE id IN (
  '4b1bc1ff-01df-4c61-b804-c1bdf6bc8bc8',
  '5aa1f5a5-b3e3-4087-acf1-a05efcf0a7ed',
  'b4c47942-3e76-43e0-91b4-a62e0d726612'
);

-- Шаг 2: создаём уникальный индекс на (project_id, note) для батчевого UPSERT
CREATE UNIQUE INDEX idx_income_lines_note
  ON t_p17532248_concert_platform_mvp.project_income_lines (project_id, note)
  WHERE note IS NOT NULL AND note != '';