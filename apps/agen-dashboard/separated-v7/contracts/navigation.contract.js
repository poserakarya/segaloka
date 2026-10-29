(() => {
  'use strict';

  const items = Object.freeze([
    Object.freeze({ key:'home',       label:'Beranda',               legacyPath:'/p/agen' }),
    Object.freeze({ key:'packages',   label:'Paket & Daftar Jamaah', legacyPath:'/p/agen/packages' }),
    Object.freeze({ key:'bookings',   label:'Booking',               legacyPath:'/p/agen/bookings' }),
    Object.freeze({ key:'commission', label:'Komisi',                legacyPath:'/p/agen/commission' })
  ]);

  const contract = Object.freeze({
    source: 'V7 Agen PNAV',
    redesignAllowed: false,
    legacyRemovalAllowed: false,
    items
  });

  window.SegalokaAgenContracts =
    window.SegalokaAgenContracts || {};

  window.SegalokaAgenContracts.navigation = contract;
})();
