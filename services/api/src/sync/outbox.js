// Penulisan event sync_outbox. Wajib dipanggil dengan client transaksi yang
// sama dengan perubahan bisnisnya, setelah perubahan berhasil, sehingga
// ROLLBACK membatalkan perubahan dan event sekaligus.
//
// Payload hanya berisi ID. Penerima membaca ulang data lewat endpoint yang
// berotorisasi; stream SSE memfilter penerima berdasarkan state database.

export const BOOKING_ENTITY = 'travel_booking';
export const PARTICIPANT_ENTITY = 'travel_booking_participant';
export const DEPARTURE_ENTITY = 'travel_departure';
export const BRANCH_ENTITY = 'travel_branch';
export const MEMBERSHIP_PERMISSION_ENTITY = 'travel_membership_permission';

export async function recordSyncEvent(client, {
  organizationId,
  eventType,
  entityType,
  entityId,
  payload = {}
}) {
  if (
    !client || typeof client.query !== 'function' ||
    typeof organizationId !== 'string' ||
    typeof eventType !== 'string' ||
    typeof entityType !== 'string' ||
    typeof entityId !== 'string'
  ) {
    throw new Error('INVALID_SYNC_EVENT');
  }

  await client.query(
    `INSERT INTO public.sync_outbox (
       organization_id, event_type, entity_type, entity_id, payload
     )
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      organizationId,
      eventType,
      entityType,
      entityId,
      JSON.stringify({ organizationId, ...payload })
    ]
  );
}

export function recordBookingEvent(client, { organizationId, eventType, bookingId, departureId }) {
  return recordSyncEvent(client, {
    organizationId,
    eventType,
    entityType: BOOKING_ENTITY,
    entityId: bookingId,
    payload: { bookingId, departureId }
  });
}

export function recordParticipantEvent(client, { organizationId, eventType, participantId, bookingId }) {
  return recordSyncEvent(client, {
    organizationId,
    eventType,
    entityType: PARTICIPANT_ENTITY,
    entityId: participantId,
    payload: { participantId, bookingId }
  });
}
