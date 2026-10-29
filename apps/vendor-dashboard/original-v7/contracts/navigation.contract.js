(() => {
  'use strict';

  const items = Object.freeze([
    Object.freeze({ key:'home',      label:'Beranda',  legacyPath:'/p/vendor' }),
    Object.freeze({ key:'products',  label:'Produk',   legacyPath:'/p/vendor/products' }),
    Object.freeze({ key:'orders',    label:'Order',    legacyPath:'/p/vendor/orders' }),
    Object.freeze({ key:'finance',   label:'Keuangan', legacyPath:'/p/vendor/finance' }),
    Object.freeze({ key:'documents', label:'Dokumen',  legacyPath:'/p/vendor/documents' })
  ]);

  const contract = Object.freeze({
    source: 'V7 Vendor routes',
    redesignAllowed: false,
    legacyRemovalAllowed: false,
    items
  });

  window.SegalokaVendorContracts =
    window.SegalokaVendorContracts || {};

  window.SegalokaVendorContracts.navigation = contract;
})();
