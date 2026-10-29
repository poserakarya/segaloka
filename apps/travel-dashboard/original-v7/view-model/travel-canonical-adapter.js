(function () {
  'use strict';

  /*
   * SEGALOKA TRAVEL
   * Canonical Read-Only Projection Adapter
   *
   * Phase: 2L.9
   *
   * IMPORTANT:
   * - No canonical data is owned here.
   * - No mutation API is exposed here.
   * - No fetch / Supabase / gateway / payment side effect.
   * - Canonical IDs are preserved.
   * - Tenant and permission filtering must happen before
   *   canonical collections are supplied to this adapter.
   */

  const VERSION = '2L.9';

  const COLLECTIONS = Object.freeze([
    'PACKAGES',
    'BOOKINGS',
    'PAYMENTS',
    'DEPS',
    'MITRA',
    'AGEN',
    'WITHDRAWALS',
    'WEBSITES',
    'SD_REQ',
    'SD_OFF'
  ]);

  const isObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);

  const arrayOf = (value) =>
    Array.isArray(value) ? value : [];

  const own = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  const copyRecord = (record) => {
    if (!isObject(record)) {
      return record;
    }

    return Object.freeze({
      ...record
    });
  };

  const copyCollection = (value) =>
    Object.freeze(
      arrayOf(value).map(copyRecord)
    );

  const preserveCanonicalId = (record) => {
    if (!isObject(record)) {
      return null;
    }

    /*
     * Do not invent IDs.
     * Preserve whichever canonical identifier already exists.
     */
    if (own(record, 'id')) {
      return record.id;
    }

    if (own(record, 'booking_id')) {
      return record.booking_id;
    }

    if (own(record, 'package_id')) {
      return record.package_id;
    }

    if (own(record, 'payment_id')) {
      return record.payment_id;
    }

    if (own(record, 'departure_id')) {
      return record.departure_id;
    }

    if (own(record, 'withdrawal_id')) {
      return record.withdrawal_id;
    }

    return null;
  };

  const normalizeInput = (input) => {
    const source = isObject(input) ? input : {};

    const normalized = {};

    for (const collection of COLLECTIONS) {
      normalized[collection] = copyCollection(
        source[collection]
      );
    }

    return Object.freeze(normalized);
  };

  const indexByCanonicalId = (collection) => {
    const index = Object.create(null);

    for (const record of arrayOf(collection)) {
      const id = preserveCanonicalId(record);

      if (
        id !== null &&
        id !== undefined &&
        String(id).length > 0
      ) {
        index[String(id)] = record;
      }
    }

    return Object.freeze(index);
  };

  const buildIndexes = (collections) =>
    Object.freeze({
      packages: indexByCanonicalId(
        collections.PACKAGES
      ),

      bookings: indexByCanonicalId(
        collections.BOOKINGS
      ),

      payments: indexByCanonicalId(
        collections.PAYMENTS
      ),

      departures: indexByCanonicalId(
        collections.DEPS
      ),

      mitra: indexByCanonicalId(
        collections.MITRA
      ),

      agen: indexByCanonicalId(
        collections.AGEN
      ),

      withdrawals: indexByCanonicalId(
        collections.WITHDRAWALS
      ),

      websites: indexByCanonicalId(
        collections.WEBSITES
      ),

      segadealsRequests: indexByCanonicalId(
        collections.SD_REQ
      ),

      segadealsOffers: indexByCanonicalId(
        collections.SD_OFF
      )
    });

  const createProjection = (input) => {
    const collections = normalizeInput(input);

    return Object.freeze({
      version: VERSION,

      mode: 'canonical-read-only-projection',

      readOnly: true,

      ownsCanonicalData: false,

      mutationEnabled: false,

      canonicalIdsPreserved: true,

      tenantFilteringRequiredUpstream: true,

      permissionFilteringRequiredUpstream: true,

      collections,

      indexes: buildIndexes(collections)
    });
  };

  const assertSafeInput = (input) => {
    if (!isObject(input)) {
      throw new TypeError(
        'Travel canonical adapter requires an object input.'
      );
    }

    for (const collection of COLLECTIONS) {
      if (
        own(input, collection) &&
        !Array.isArray(input[collection])
      ) {
        throw new TypeError(
          `${collection} must be an array when supplied.`
        );
      }
    }

    return true;
  };

  const project = (input) => {
    assertSafeInput(input);
    return createProjection(input);
  };

  window.SegalokaTravelCanonicalAdapter = Object.freeze({
    version: VERSION,

    role: 'travel',

    readOnly: true,

    productionReady: false,

    executableByTravelShell: false,

    ownsCanonicalData: false,

    mutationEnabled: false,

    collections: COLLECTIONS,

    preserveCanonicalId,

    assertSafeInput,

    project
  });
})();