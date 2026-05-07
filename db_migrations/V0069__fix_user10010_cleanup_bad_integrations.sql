-- 1. Переподвязываем рабочую интеграцию (event 69e39a..., 133 продажи) к живому проекту
UPDATE t_p17532248_concert_platform_mvp.ticket_integrations
SET project_id = '298541eb-ae47-4fc0-89a2-c546366e9e41',
    name = '9 грамм, Whole Lotta Swag'
WHERE id = '49623c1f-85e0-4274-9397-3ba819236324';

-- 2. Переподвязываем все 133 продажи к живому проекту
UPDATE t_p17532248_concert_platform_mvp.ticket_sales
SET project_id = '298541eb-ae47-4fc0-89a2-c546366e9e41'
WHERE integration_id = '49623c1f-85e0-4274-9397-3ba819236324';

-- 3. Деактивируем 5 мусорных интеграций (неверный event_id или удалённый проект)
UPDATE t_p17532248_concert_platform_mvp.ticket_integrations
SET is_active = FALSE
WHERE id IN (
    'ee345f64-6feb-47e8-b83c-76def768795f',
    '8ff6235d-2674-4c84-aee3-7ee2564b840f',
    '5cbcda65-2578-4ef4-84c5-1ddebd996816',
    'f120dcf5-c88a-4646-b633-cda13678309e',
    '5b0dc5fc-a309-4c60-a24d-08ed7daf01c3'
);