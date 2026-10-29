(() => {
  'use strict';

  const items = Object.freeze([
    Object.freeze({ key:'home',      label:'Beranda',       legacyPath:'/p/traveler' }),
    Object.freeze({ key:'segadeals', label:'SegaDeals',     legacyPath:'/p/traveler/segadeals' }),
    Object.freeze({ key:'bookings',  label:'Booking Saya',  legacyPath:'/p/traveler/bookings' }),
    Object.freeze({ key:'chat',      label:'Chat',           legacyPath:'/p/traveler/chat' }),
    Object.freeze({ key:'profile',   label:'Profil',         legacyPath:'/p/traveler/profile' })
  ]);

  const contract = Object.freeze({
    source: 'V7 Traveler PNAV + SegaDeals',
    redesignAllowed: false,
    legacyRemovalAllowed: false,
    items
  });

  window.SegalokaTravelerContracts =
    window.SegalokaTravelerContracts || {};

  window.SegalokaTravelerContracts.navigation = contract;
})();
