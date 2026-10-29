(() => {
  'use strict';

  const items = Object.freeze([
    Object.freeze({ key:'home',        label:'Beranda',       legacyPath:'/p/affiliate' }),
    Object.freeze({ key:'links',       label:'Link referral', legacyPath:'/p/affiliate/links' }),
    Object.freeze({ key:'commissions', label:'Komisi',        legacyPath:'/p/affiliate/commissions' }),
    Object.freeze({ key:'payout',      label:'Payout',        legacyPath:'/p/affiliate/payout' })
  ]);

  const contract = Object.freeze({
    source: 'V7 Affiliate PNAV',
    redesignAllowed: false,
    legacyRemovalAllowed: false,
    items
  });

  window.SegalokaAffiliateContracts =
    window.SegalokaAffiliateContracts || {};

  window.SegalokaAffiliateContracts.navigation = contract;
})();
