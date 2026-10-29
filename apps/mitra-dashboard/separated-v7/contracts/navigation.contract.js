(() => {
  'use strict';

  const items = Object.freeze([
    Object.freeze({ key:'home',       label:'Beranda',               legacyPath:'/p/mitra' }),
    Object.freeze({ key:'packages',   label:'Paket & Daftar Jamaah', legacyPath:'/p/mitra/packages' }),
    Object.freeze({ key:'bookings',   label:'Booking',               legacyPath:'/p/mitra/bookings' }),
    Object.freeze({ key:'agents',     label:'Agen saya',             legacyPath:'/p/mitra/agen' }),
    Object.freeze({ key:'commission', label:'Komisi',                legacyPath:'/p/mitra/commission' })
  ]);

  const contract = Object.freeze({
    source: 'V7 Mitra PNAV',
    redesignAllowed: false,
    legacyRemovalAllowed: false,
    items
  });

  window.SegalokaMitraContracts =
    window.SegalokaMitraContracts || {};

  window.SegalokaMitraContracts.navigation = contract;
})();
