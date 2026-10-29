/* =====================================================================
   NOTIFIKASI KE PIHAK TERDAMPAK (Travel, Mitra, Agen, Vendor, Affiliate, Pengguna)
   Setiap perubahan status (suspend, nonaktif, verifikasi, subscription, paket,
   booking, withdrawal, komisi, dll.) yang disimpan dari layar ini dibandingkan
   dengan versi terakhir di database, lalu dibuatkan notifikasi untuk setiap pihak
   yang terdampak. Notifikasi tersimpan di database & tampil realtime di portal
   masing-masing (lonceng + banner status).
   ===================================================================== */
const NT_LABEL = { travel: ['Travel', 'Travel', 'الشركة'], mitra: ['Mitra Travel', 'Travel Partner', 'الشريك'], agen: ['Agen', 'Agent', 'الوكيل'], vendor: ['Vendor', 'Vendor', 'المورد'], affiliate: ['Affiliate', 'Affiliate', 'المسوّق'], traveler: ['Pengguna', 'Traveler', 'المستخدم'] };
const ntKey = (ws, id) => ws + ':' + id;
const stLbl = v => STATUS[v] ? L3(STATUS[v].slice(2)) : String(v);
const stTone2 = v => { const t = STATUS[v] && STATUS[v][0]; return t === 'ok' ? 'ok' : t === 'bad' ? 'bad' : ['inactive', 'suspended', 'rejected', 'expired', 'cancelled', 'failed', 'hold'].includes(v) ? 'bad' : t === 'warn' ? 'warn' : 'info'; };
const BAD_ST = ['inactive', 'suspended', 'rejected', 'expired', 'cancelled', 'failed', 'hold', 'grace'];
function lastReason(id) { const a = AUDIT.find(x => x.reason && String(x.resource || '').includes(id)); return a ? a.reason : ''; }
function partyNotify(keys, cat, tone, title, sub, route) {
  const seen = new Set(); keys.filter(Boolean).forEach(k => { if (seen.has(k)) return; seen.add(k); const ws = k.split(':')[0];
    NOTIFS.unshift({ id: uid('NTF'), to: k, cat, tone, title, sub, route: route && route[ws] ? route[ws] : WS[ws] ? WS[ws].home : '/overview', ts: nowTs(), unread: true }); });
}
/* penerima turunan */
const mitraOfTravel = tid => MITRA.filter(m => m.travel === tid).map(m => ntKey('mitra', m.id));
const agenOfTravel = tid => AGEN.filter(a => a.travel === tid).map(a => ntKey('agen', a.id));
const affOfTravel = tid => AFFILIATES.filter(a => (a.travels || []).includes(tid)).map(a => ntKey('affiliate', a.id));
const bookingParties = b => [ntKey('traveler', b.traveler), ntKey('travel', b.travel), b.mitra && ntKey('mitra', b.mitra), b.agen && ntKey('agen', b.agen), b.aff && ntKey('affiliate', b.aff)];

/* aturan: koleksi → (sebelum, sesudah) → notifikasi */
const NT_RULES = {
  travels: (b, a) => {
    const nm = a.name; const r = lastReason(a.id); const down = [ntKey('travel', a.id), ...mitraOfTravel(a.id), ...agenOfTravel(a.id)];
    if (b.op !== a.op) partyNotify(a.op === 'inactive' ? [...down, ...affOfTravel(a.id)] : down, 'travel', stTone2(a.op), L3(['Status Travel ', 'Travel status ', 'حالة الشركة ']) + nm + ': ' + stLbl(a.op), (a.op === 'inactive' ? L3(['Ditangguhkan — paket tidak tampil & pendaftaran jamaah dihentikan sementara.', 'Suspended — packages hidden & pilgrim registration paused.', 'موقوفة مؤقتاً.']) : L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(b.op)) + (r ? ' · ' + r : ''));
    if (b.legal !== a.legal) partyNotify([ntKey('travel', a.id), ...(BAD_ST.includes(a.legal) ? mitraOfTravel(a.id) : [])], 'legal', stTone2(a.legal), L3(['Legalitas ', 'Legality ', 'الترخيص ']) + nm + ': ' + stLbl(a.legal), (r || L3(['Cek menu Legalitas', 'See Legality', 'راجع الترخيص'])), { travel: '/p/travel/legal' });
    const bs = b.sub && b.sub.state, as = a.sub && a.sub.state;
    if (bs !== as) partyNotify([ntKey('travel', a.id), ...(['suspended', 'expired', 'cancelled'].includes(as) ? [...mitraOfTravel(a.id), ...agenOfTravel(a.id)] : [])], 'subscription', stTone2(as), 'Subscription ' + nm + ': ' + stLbl(as), as === 'grace' ? L3(['Segera bayar invoice agar website & listing tidak dihentikan.', 'Pay the invoice soon so the website & listings stay live.', 'ادفع قريباً.']) : ['suspended', 'expired'].includes(as) ? L3(['Website & listing dihentikan sampai subscription aktif kembali.', 'Website & listings are stopped until the subscription is active again.', 'متوقف.']) : L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(bs), { travel: '/p/travel/subscription' });
  },
  mitra: (b, a) => { if (b.status !== a.status) partyNotify([ntKey('mitra', a.id), ...AGEN.filter(x => x.mitra === a.id).map(x => ntKey('agen', x.id)), ntKey('travel', a.travel)], 'travel', stTone2(a.status), L3(['Status Mitra ', 'Partner status ', 'حالة الشريك ']) + a.name + ': ' + stLbl(a.status), (a.status === 'inactive' ? L3(['Mitra & Agen di bawahnya tidak dapat mendaftarkan jamaah.', 'The Partner and its Agents cannot register pilgrims.', 'لا يمكن التسجيل.']) : L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(b.status)) + (lastReason(a.id) ? ' · ' + lastReason(a.id) : ''), { travel: '/p/travel/mitra' }); },
  agen: (b, a) => { if (b.status !== a.status) partyNotify([ntKey('agen', a.id), ntKey('mitra', a.mitra)], 'travel', stTone2(a.status), L3(['Status Agen ', 'Agent status ', 'حالة الوكيل ']) + a.name + ': ' + stLbl(a.status), (lastReason(a.id) || L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(b.status)), { mitra: '/p/mitra/agen' }); },
  vendors: (b, a) => {
    if (b.status !== a.status) partyNotify([ntKey('vendor', a.id)], 'marketplace', stTone2(a.status), L3(['Status Vendor ', 'Vendor status ', 'حالة المورد ']) + a.name + ': ' + stLbl(a.status), lastReason(a.id) || L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(b.status));
    if (b.verif !== a.verif) partyNotify([ntKey('vendor', a.id)], 'legal', stTone2(a.verif), L3(['Verifikasi vendor: ', 'Vendor verification: ', 'التوثيق: ']) + stLbl(a.verif), lastReason(a.id) || a.name, { vendor: '/p/vendor/documents' });
  },
  affiliates: (b, a) => { if (b.status !== a.status) partyNotify([ntKey('affiliate', a.id)], 'marketplace', stTone2(a.status), L3(['Status Affiliate ', 'Affiliate status ', 'حالة المسوّق ']) + a.name + ': ' + stLbl(a.status), lastReason(a.id) || L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(b.status)); },
  travelers: (b, a) => { if (b.passport !== a.passport) partyNotify([ntKey('traveler', a.id)], 'booking', stTone2(a.passport), L3(['Paspor: ', 'Passport: ', 'الجواز: ']) + stLbl(a.passport), a.name, { traveler: '/p/traveler/profile' }); },
  packages: (b, a) => { if (b.state !== a.state && ['published', 'unpublished', 'rejected', 'archived', 'draft'].includes(a.state) && b.state !== 'draft') { const bad = a.state !== 'published'; partyNotify([ntKey('travel', a.travel), ...(bad || a.state === 'published' ? [...mitraOfTravel(a.travel), ...agenOfTravel(a.travel)] : [])], 'marketplace', stTone2(a.state), L3(['Paket ', 'Package ', 'الباقة ']) + a.name + ': ' + stLbl(a.state), lastReason(a.id) || L3(['Sebelumnya ', 'Previously ', 'سابقاً ']) + stLbl(b.state), { travel: '/p/travel/packages', mitra: '/p/mitra/packages', agen: '/p/agen/packages' }); } },
  bookings: (b, a) => { if (b.state !== a.state) partyNotify(bookingParties(a), 'booking', stTone2(a.state), 'Booking ' + a.id + ': ' + stLbl(a.state), ((pkgById(a.pkg) || {}).name || '') + (lastReason(a.id) ? ' · ' + lastReason(a.id) : ''), { traveler: '/p/traveler/bookings/' + a.id, travel: '/p/travel/bookings/' + a.id, mitra: '/p/mitra/bookings', agen: '/p/agen/bookings' }); },
  withdrawals: (b, a) => { if (b.state !== a.state) { const ws = { Travel: 'travel', Vendor: 'vendor', Affiliate: 'affiliate' }[a.partyType]; if (ws) partyNotify([ntKey(ws, a.ref)], 'payment', stTone2(a.state), 'Withdrawal ' + money(a.amount) + ': ' + stLbl(a.state), lastReason(a.id) || a.id, { travel: '/p/travel/finance', vendor: '/p/vendor/finance', affiliate: '/p/affiliate/payout' }); } },
  vendor_products: (b, a) => { if (b.state !== a.state && b.state === 'review' || (b.state !== a.state && BAD_ST.concat(['unpublished']).includes(a.state))) partyNotify([ntKey('vendor', a.vendor)], 'marketplace', stTone2(a.state), L3(['Produk ', 'Product ', 'المنتج ']) + a.name + ': ' + stLbl(a.state), lastReason(a.id) || '', { vendor: '/p/vendor/products' }); },
  commissions: (b, a) => { if (b.state !== a.state) partyNotify([ntKey('affiliate', a.aff)], 'payment', stTone2(a.state), L3(['Komisi ', 'Commission ', 'العمولة ']) + money(a.amount) + ': ' + stLbl(a.state), a.booking || '', { affiliate: '/p/affiliate/commissions' }); },
  vendor_orders: (b, a) => { if (b.state !== a.state) partyNotify([ntKey('vendor', a.vendor), ntKey('travel', a.travel)], 'marketplace', stTone2(a.state), 'Order ' + a.id + ': ' + stLbl(a.state), a.productName || '', { vendor: '/p/vendor/orders', travel: '/p/travel/vendors' }); }
};
/* dipanggil tepat sebelum flush: bandingkan dengan snapshot terakhir di database */
function ntScan() {
  if (typeof SB === 'undefined' || !SB.on) return; SB.ntDone = SB.ntDone || new Set();
  Object.entries(NT_RULES).forEach(([name, fn]) => { const get = (typeof CORE !== 'undefined' && CORE[name]) || (typeof RECS !== 'undefined' && RECS[name]); if (!get) return; const saved = SB.saved[name] || {};
    get().forEach(o => { if (!o || !o.id || !saved[o.id]) return; const j = JSON.stringify(o); if (j === saved[o.id]) return; const sig = name + '|' + o.id + '|' + j; if (SB.ntDone.has(sig)) return; SB.ntDone.add(sig); let prev; try { prev = JSON.parse(saved[o.id]); } catch (e) { return; } try { fn(prev, o); } catch (e) { } }); });
}

/* ---------- tampilan per penerima ---------- */
function myNotifKey() { const ws = typeof wsOf === 'function' ? wsOf() : 'admin'; if (ws === 'admin') return null; const x = me(ws); return x ? ntKey(ws, x.id) : '-'; }
function myNotifs() { const k = myNotifKey(); return NOTIFS.filter(n => k ? n.to === k : !n.to); }
/* banner status di portal saat entitas sedang ditangguhkan / bermasalah */
function portalStatusBanner(ws) {
  const x = me(ws); if (!x) return ''; const w = [];
  const st = ws === 'travel' ? x.op : x.status;
  if (['inactive', 'suspended'].includes(st)) w.push(['bad', L3(['Akun Anda sedang ditangguhkan (', 'Your account is suspended (', 'الحساب موقوف (']) + stLbl(st) + ')', lastReason(x.id)]);
  if (ws === 'travel') { if (x.sub && ['grace', 'suspended', 'expired'].includes(x.sub.state)) w.push([x.sub.state === 'grace' ? 'warn' : 'bad', 'Subscription: ' + stLbl(x.sub.state), L3(['Buka menu Subscription untuk membayar invoice.', 'Open Subscription to pay the invoice.', 'ادفع الفاتورة.'])]); if (['expired', 'rejected', 'expiring'].includes(x.legal)) w.push([x.legal === 'expiring' ? 'warn' : 'bad', L3(['Legalitas: ', 'Legality: ', 'الترخيص: ']) + stLbl(x.legal), L3(['Unggah dokumen di menu Legalitas.', 'Upload documents under Legality.', 'ارفع المستندات.'])]); }
  if (ws === 'vendor' && x.verif === 'rejected') w.push(['bad', L3(['Verifikasi ditolak', 'Verification rejected', 'رُفض التوثيق']), lastReason(x.id)]);
  if (ws === 'mitra' || ws === 'agen') { const tr = travelById(x.travel); if (tr && tr.op === 'inactive') w.push(['bad', L3(['Travel induk ditangguhkan: ', 'Parent Travel suspended: ', 'الشركة موقوفة: ']) + tr.name, L3(['Pendaftaran jamaah dihentikan sementara.', 'Pilgrim registration is paused.', 'التسجيل متوقف.'])]); if (ws === 'agen') { const m = MITRA.find(y => y.id === x.mitra); if (m && m.status === 'inactive') w.push(['bad', L3(['Mitra induk dinonaktifkan: ', 'Parent Partner deactivated: ', 'الشريك معطل: ']) + m.name, '']); } }
  if (ws === 'affiliate') { const off = (x.travels || []).map(travelById).filter(t => t && t.op === 'inactive'); if (off.length) w.push(['warn', L3(['Travel ditangguhkan: ', 'Suspended Travels: ', 'شركات موقوفة: ']) + off.map(t => t.name).join(', '), L3(['Link referral ke Travel ini tidak menghasilkan booking.', 'Referral links to these Travels won’t convert.', 'لا حجوزات.'])]); }
  return w.map(([tone, title, sub]) => `<div class="banner ${tone === 'bad' ? 'bad' : 'warn'}" role="status" style="border:1px solid var(--${tone === 'bad' ? 'bad' : 'warn'}-line, var(--line));border-radius:10px;margin-bottom:12px">${ic('alert')}<span style="flex:1"><b>${esc(title)}</b>${sub ? `<br><span style="font-size:12.5px">${esc(sub)}</span>` : ''}</span></div>`).join('');
}
