BEGIN;

ALTER TABLE public.auth_login_otp
  ADD COLUMN delivery_status text;


ALTER TABLE public.auth_login_otp
  ALTER COLUMN delivery_status SET DEFAULT 'pending',
  ALTER COLUMN delivery_status SET NOT NULL;

ALTER TABLE public.auth_login_otp
  ADD CONSTRAINT auth_login_otp_delivery_status_check
  CHECK (
    delivery_status IN (
      'pending',
      'sent',
      'failed',
      'unknown'
    )
  );

COMMIT;