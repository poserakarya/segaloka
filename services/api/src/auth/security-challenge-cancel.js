const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PURPOSES = new Set([
  'enable_2fa',
  'disable_2fa'
]);

export async function cancelSecurityChallenge(pool, {
  challengeId,
  userId,
  sessionId,
  purpose
}) {
  if (
    !UUID_PATTERN.test(challengeId) ||
    !UUID_PATTERN.test(userId) ||
    !UUID_PATTERN.test(sessionId) ||
    !PURPOSES.has(purpose)
  ) {
    return { cancelled: false, code: 'INVALID_REQUEST' };
  }

  const result = await pool.query(
    `UPDATE public.auth_security_challenges
     SET consumed_at = now()
     WHERE id = $1
       AND user_id = $2
       AND session_id = $3
       AND purpose = $4
       AND consumed_at IS NULL
     RETURNING id`,
    [challengeId, userId, sessionId, purpose]
  );

  return {
    cancelled: result.rowCount === 1
  };
}
