-- Segaloka migration 0004
-- Refresh token rotation history and replay detection foundation.

CREATE TABLE public.auth_refresh_token_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id uuid NOT NULL
        REFERENCES public.auth_sessions(id)
        ON DELETE CASCADE,

    user_id uuid NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    token_hash text NOT NULL UNIQUE,

    rotated_at timestamptz NOT NULL DEFAULT now(),

    expires_at timestamptz NOT NULL,

    replay_detected_at timestamptz,

    CONSTRAINT auth_refresh_history_hash_check
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT auth_refresh_history_expiry_check
        CHECK (expires_at > rotated_at)
);

CREATE INDEX auth_refresh_history_session_idx
    ON public.auth_refresh_token_history (session_id);

CREATE INDEX auth_refresh_history_user_idx
    ON public.auth_refresh_token_history (user_id);

CREATE INDEX auth_refresh_history_expiry_idx
    ON public.auth_refresh_token_history (expires_at);

CREATE INDEX auth_refresh_history_replay_idx
    ON public.auth_refresh_token_history (replay_detected_at)
    WHERE replay_detected_at IS NOT NULL;