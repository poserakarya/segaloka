-- Segaloka migration 0016
-- Encrypted certificate verification token storage.
-- Existing verification hashes and issued certificates remain unchanged.

ALTER TABLE public.traveler_travel_certificates
ADD COLUMN IF NOT EXISTS encrypted_verification_token text;

COMMENT ON COLUMN
  public.traveler_travel_certificates.encrypted_verification_token
IS
  'AES-256-GCM encrypted verification token; plaintext is never stored.';

ALTER TABLE public.traveler_travel_certificates
ADD CONSTRAINT traveler_certificate_encrypted_token_format
CHECK (
  encrypted_verification_token IS NULL
  OR encrypted_verification_token ~
    '^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]{128}$'
);