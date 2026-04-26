ALTER TABLE t_p17532248_concert_platform_mvp.user_documents
    ADD COLUMN project_id UUID NULL REFERENCES t_p17532248_concert_platform_mvp.projects(id);

CREATE INDEX idx_user_documents_project_id ON t_p17532248_concert_platform_mvp.user_documents(project_id);
