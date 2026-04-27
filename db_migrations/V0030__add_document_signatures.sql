CREATE TABLE t_p17532248_concert_platform_mvp.document_signatures (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES t_p17532248_concert_platform_mvp.user_documents(id),
    signer_user_id  uuid NOT NULL REFERENCES t_p17532248_concert_platform_mvp.users(id),
    signer_name     text NOT NULL,
    signer_email    text NOT NULL,
    sign_type       text NOT NULL DEFAULT 'pep' CHECK (sign_type IN ('pep', 'kep')),
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    signed_at       timestamptz,
    ip_address      text NOT NULL DEFAULT '',
    user_agent      text NOT NULL DEFAULT '',
    hash            text NOT NULL DEFAULT '',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t_p17532248_concert_platform_mvp.signature_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_id    uuid NOT NULL REFERENCES t_p17532248_concert_platform_mvp.document_signatures(id),
    code            text NOT NULL,
    expires_at      timestamptz NOT NULL DEFAULT now() + INTERVAL '15 minutes',
    used            boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t_p17532248_concert_platform_mvp.signature_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES t_p17532248_concert_platform_mvp.user_documents(id),
    sender_user_id  uuid NOT NULL REFERENCES t_p17532248_concert_platform_mvp.users(id),
    recipient_email text NOT NULL,
    recipient_name  text NOT NULL DEFAULT '',
    message         text NOT NULL DEFAULT '',
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON t_p17532248_concert_platform_mvp.document_signatures(document_id);
CREATE INDEX ON t_p17532248_concert_platform_mvp.document_signatures(signer_user_id);
CREATE INDEX ON t_p17532248_concert_platform_mvp.signature_requests(document_id);
CREATE INDEX ON t_p17532248_concert_platform_mvp.signature_requests(sender_user_id);
