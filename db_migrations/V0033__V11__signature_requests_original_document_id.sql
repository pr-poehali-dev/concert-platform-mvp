-- Добавляем original_document_id в signature_requests
-- Это ID документа у ОТПРАВИТЕЛЯ — связывает оригинал с копией получателя
ALTER TABLE t_p17532248_concert_platform_mvp.signature_requests
    ADD COLUMN IF NOT EXISTS original_document_id uuid;

-- Для существующих записей: original = document_id (приблизительно, точнее нельзя восстановить)
UPDATE t_p17532248_concert_platform_mvp.signature_requests
    SET original_document_id = document_id
    WHERE original_document_id IS NULL;
