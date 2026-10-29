(function () {
  'use strict';

  const SECTION_FIELDS = Object.freeze({
    meta: Object.freeze([
      'role',
      'tenantId',
      'tenantName',
      'generatedAt'
    ]),

    home: Object.freeze([
      'kpis',
      'recentBookings',
      'upcomingDepartures',
      'paymentSummary',
      'alerts'
    ]),

    packages: Object.freeze([
      'items',
      'summary'
    ]),

    bookings: Object.freeze([
      'items',
      'summary'
    ]),

    departures: Object.freeze([
      'items',
      'summary'
    ]),

    network: Object.freeze([
      'mitra',
      'agen',
      'summary'
    ]),

    vendors: Object.freeze([
      'orders',
      'availableServices',
      'summary'
    ]),

    finance: Object.freeze([
      'payments',
      'withdrawals',
      'summary'
    ]),

    legal: Object.freeze([
      'documents',
      'status'
    ]),

    subscription: Object.freeze([
      'plan',
      'status',
      'branches',
      'billing'
    ])
  });

  const SECTION_KEYS = Object.freeze(
    Object.keys(SECTION_FIELDS)
  );

  function isPlainObject(value) {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(
      object,
      key
    );
  }

  function validateSectionShape(name, value) {
    const errors = [];

    if (!isPlainObject(value)) {
      errors.push(
        `${name} must be a plain object`
      );

      return errors;
    }

    const requiredFields =
      SECTION_FIELDS[name] || [];

    for (const field of requiredFields) {
      if (!hasOwn(value, field)) {
        errors.push(
          `${name}.${field} is required`
        );
      }
    }

    return errors;
  }

  function validate(viewModel) {
    const errors = [];

    if (!isPlainObject(viewModel)) {
      return Object.freeze({
        valid: false,
        errors: Object.freeze([
          'viewModel must be a plain object'
        ])
      });
    }

    for (const section of SECTION_KEYS) {
      if (!hasOwn(viewModel, section)) {
        errors.push(
          `${section} section is required`
        );

        continue;
      }

      errors.push(
        ...validateSectionShape(
          section,
          viewModel[section]
        )
      );
    }

    if (
      isPlainObject(viewModel.meta) &&
      viewModel.meta.role !== 'travel'
    ) {
      errors.push(
        'meta.role must equal travel'
      );
    }

    return Object.freeze({
      valid: errors.length === 0,
      errors: Object.freeze(
        errors.slice()
      )
    });
  }

  function assertValid(viewModel) {
    const result = validate(viewModel);

    if (!result.valid) {
      throw new Error(
        [
          '[Travel ViewModel Contract] Invalid projection:',
          ...result.errors
        ].join('\n- ')
      );
    }

    return true;
  }

  function emptyProjection() {
    return {
      meta: {
        role: 'travel',
        tenantId: null,
        tenantName: '',
        generatedAt: null
      },

      home: {
        kpis: [],
        recentBookings: [],
        upcomingDepartures: [],
        paymentSummary: null,
        alerts: []
      },

      packages: {
        items: [],
        summary: null
      },

      bookings: {
        items: [],
        summary: null
      },

      departures: {
        items: [],
        summary: null
      },

      network: {
        mitra: [],
        agen: [],
        summary: null
      },

      vendors: {
        orders: [],
        availableServices: [],
        summary: null
      },

      finance: {
        payments: [],
        withdrawals: [],
        summary: null
      },

      legal: {
        documents: [],
        status: null
      },

      subscription: {
        plan: null,
        status: null,
        branches: [],
        billing: null
      }
    };
  }

  window.SegalokaTravelViewModelContract =
    Object.freeze({
      version: '2L.7',
      role: 'travel',

      readOnlyProjection: true,
      canonicalIdsRequired: true,
      tenantScoped: true,
      permissionScoped: true,

      mutableBusinessStateAllowed: false,
      mutationHandlersAllowed: false,
      networkCallsAllowed: false,
      persistenceAllowed: false,

      sections: SECTION_FIELDS,

      validate,
      assertValid,
      emptyProjection
    });
})();