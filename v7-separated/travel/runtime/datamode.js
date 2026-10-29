/* =====================================================================
   DATA MODE — tanpa data palsu.
   Default (produksi): semua entitas & transaksi demo dikosongkan; angka dihitung dari data nyata.
   Mode demo hanya bila URL memuat ?demo (dipakai untuk pengujian).
   ===================================================================== */
const DEMO = /[?&]demo\b/.test(location.search);
const ENTITY_ARRAYS = () => [TRAVELS, BRANCHES, VENDORS, AFFILIATES, MITRA, AGEN, PACKAGES, TRAVELERS, BOOKINGS, PAYMENTS, SETTLEMENTS, WITHDRAWALS, REFUNDS, CAMPAIGNS, CONVERSATIONS, APPROVALS, AUDIT, NOTIFS, WEBSITES, VPRODUCTS, REFLINKS, COMMISSIONS, SD_REQ, SD_OFF, CONTACTS, BROADCASTS, ADSETS, ADS, CREATIVES, ADBUDGETS, VOUCHERS, OPSDOCS, DEPOSITS, LEADS, USERS, SECEV, RISKS, INCIDENTS, WEBHOOKS, BANK, DEPS, AICHAT, VORDERS, AGENTS, UPLOADS, REVIEWS, SD_LEDGER, LETTERS, REG_FEES];
const VORDERS = [];
function clearFakeStats() {
  PROVIDERS.forEach(p => { p.status = 'healthy'; p.success = null; p.latency = null; p.share = null; });
  SERVICES.length = 0;
  AUTOMATIONS.forEach(a => a.runs = 0); SLAS.forEach(s => s.met = null); TRACKERS.forEach(t => t.match = null);
  INTEGS.forEach(i => i.last = null); CONFIG.forEach(c => c.version = 1); TPLS.forEach(t => t.uses = 0);
  CHANNELS.forEach(c => { c.convs = 0; c.quality = '—'; if (c.internal || c.id === 'web') { if (c.id === 'web') c.account = 'Widget Web Chat Segaloka'; c.state = c.id === 'push' ? 'inactive' : 'active'; } else { c.account = ''; c.state = 'inactive'; } });
  ADDONS.forEach(a => a.active = 0);
}
if (!DEMO) { ENTITY_ARRAYS().forEach(a => { a.length = 0; }); clearFakeStats(); }
DEPSEL = null; PKGSEL = null;

/* ---------- angka turunan dari data nyata ---------- */
const dayKey = ts => Math.floor((ts - (T0 % D)) / D);
function recompute() {
  CONVERSATIONS.forEach(c => { if (!Array.isArray(c.tags)) c.tags = []; if (!Array.isArray(c.messages)) c.messages = []; if (typeof c.unread !== 'number') c.unread = 0; if (!c.ts) c.ts = (c.messages[c.messages.length - 1] || {}).ts || nowTs(); if (c.sla === undefined) c.sla = null; });
  const now = nowTs(), d30 = now - 30 * D;
  const paid = PAYMENTS.filter(p => p.status === 'paid');
  TRAVELS.forEach(tr => { tr.gmv30 = paid.filter(p => p.travel === tr.id && p.ts >= d30).reduce((s, p) => s + p.amount, 0); tr.book30 = BOOKINGS.filter(b => b.travel === tr.id && b.created >= d30).length; tr.branch = tr.branch || { used: 0, quota: 2 }; tr.branch.used = BRANCHES.filter(b => b.travel === tr.id && b.status !== 'inactive').length; });
  VENDORS.forEach(v => { const O = VORDERS.filter(o => o.vendor === v.id); v.orders30 = O.filter(o => o.created >= d30).length; v.gmv30 = O.filter(o => o.state === 'completed' && o.created >= d30).reduce((s, o) => s + o.value, 0); v.products = VPRODUCTS.filter(p => p.vendor === v.id).length; const done = O.filter(o => ['completed', 'cancelled'].includes(o.state)); v.sla = done.length ? Math.round(done.filter(o => o.state === 'completed').length / done.length * 100) : null; });
  AFFILIATES.forEach(a => { const L = REFLINKS.filter(r => r.aff === a.id); a.clicks = L.reduce((s, r) => s + (r.clicks || 0), 0); const bk = BOOKINGS.filter(b => b.aff === a.id); a.conv = bk.length; a.gmv = bk.reduce((s, b) => s + b.paid, 0); const C = COMMISSIONS.filter(c => c.aff === a.id); a.commission = C.filter(c => c.state !== 'rejected').reduce((s, c) => s + c.amount, 0); a.payable = C.filter(c => c.state === 'approved').reduce((s, c) => s + c.amount, 0); a.travels = a.travels || []; });
  MITRA.forEach(m => { m.jamaah30 = BOOKINGS.filter(b => b.mitra === m.id && b.created >= d30).reduce((s, b) => s + b.pax, 0); });
  AGEN.forEach(a => { a.jamaah30 = BOOKINGS.filter(b => b.agen === a.id && b.created >= d30).reduce((s, b) => s + b.pax, 0); });
  PACKAGES.forEach(p => { p.sold = BOOKINGS.filter(b => b.pkg === p.id && !['cancelled', 'refunded', 'failed'].includes(b.state)).reduce((s, b) => s + b.pax, 0); });
  PLANS.forEach(p => p.tenants = TRAVELS.filter(x => x.sub && x.sub.plan === p.name).length);
  PLACEMENTS.forEach(p => p.campaigns = CAMPAIGNS.filter(c => (c.channels || []).includes(p.name) && c.state === 'active').length);
  CHANNELS.forEach(c => c.convs = CONVERSATIONS.filter(x => x.channel === c.id).length);
  if (ADDONS[0]) ADDONS[0].active = TRAVELS.reduce((s, x) => s + ((x.sub && x.sub.addonBranch) || 0), 0);
  ADDONS.slice(1).forEach(a => { if (!DEMO) a.active = a.active || 0; });
  MPCATS.forEach(c => c.listings = c.parent === 'Paket Travel' ? PACKAGES.filter(p => p.cat === c.name).length : VPRODUCTS.filter(v => v.cat === c.name).length);
  /* agen CS = user platform aktif (tanpa nama rekaan) */
  if (!DEMO) { const act = USERS.filter(u => u.state === 'active'); const want = act.length ? act.map(u => ({ id: u.id, name: u.name })) : [{ id: 'USR-ADMIN', name: 'Admin Pusat' }]; AGENTS.length = 0; want.forEach(w => AGENTS.push({ id: w.id, name: w.name, online: true, load: CONVERSATIONS.filter(c => c.assignee === w.id && ['open', 'pending'].includes(c.status)).length })); }
  /* keberangkatan (manifest) diturunkan dari booking terkonfirmasi */
  PACKAGES.forEach(p => { const bks = BOOKINGS.filter(b => b.pkg === p.id && ['partially_paid', 'confirmed', 'processing', 'ready', 'departed'].includes(b.state)); if (!bks.length) return; let d = DEPS.find(x => x.pkg === p.id); if (!d) { d = { id: 'DEP-' + p.id.replace(/^PKG-/, ''), pkg: p.id, name: p.name + ' · ' + fD(p.dep, { day: 'numeric', month: 'short' }), travel: p.travel, dep: p.dep, pax: [], state: 'draft', rooms: [], roomState: 'draft' }; DEPS.push(d); }
    bks.forEach(b => { const tv = TRAVELERS.find(x => x.id === b.traveler) || { name: b.traveler, passport: 'pending' }; for (let k = 0; k < b.pax; k++) { const pid = b.id + '-' + (k + 1); if (!d.pax.some(x => x.id === pid)) d.pax.push({ id: pid, name: k ? tv.name.split(' ')[0] + ' — pendamping ' + k : tv.name, booking: b.id, passport: k === 0 ? tv.passport : 'pending', visa: 'pending', room: null, g: 'L' }); } }); });
  if (!DEPSEL && DEPS[0]) DEPSEL = DEPS[0].id; if ((!PKGSEL || !pkgById(PKGSEL)) && PACKAGES[0]) PKGSEL = PACKAGES[0].id;
  /* saldo nyata */
  const feeRate = tr => { const f = FEES.find(x => x.state === 'active' && x.scope === 'Travel · ' + ((tr.sub && tr.sub.plan) || '')); return f ? f.rate / 100 : 0.025; };
  TRAVELS.forEach(tr => { const regNet = (typeof REG_FEES !== 'undefined' ? REG_FEES : []).filter(r => r.travel === tr.id).reduce((s, r) => s + (r.net || 0), 0); const inn = (tr.payMode === 'VIA_SEGALOKA' ? paid.filter(p => p.travel === tr.id).reduce((s, p) => s + p.amount * (1 - feeRate(tr)), 0) : 0) + regNet; const out = WITHDRAWALS.filter(w => w.ref === tr.id && !['rejected', 'cancelled'].includes(w.state)).reduce((s, w) => s + w.amount, 0); tr.balance = Math.max(0, Math.round(inn - out)); });
  VENDORS.forEach(v => { const inn = VORDERS.filter(o => o.vendor === v.id && o.state === 'completed').reduce((s, o) => s + o.value * .95, 0); const out = WITHDRAWALS.filter(w => w.ref === v.id && !['rejected', 'cancelled'].includes(w.state)).reduce((s, w) => s + w.amount, 0); v.balance = Math.max(0, Math.round(inn - out)); });
  /* saldo iklan per tenant yang punya campaign */
  [...new Set(CAMPAIGNS.filter(c => c.owner).map(c => c.owner))].forEach(tid => { if (!ADBUDGETS.some(b => b.travel === tid) && travelById(tid)) ADBUDGETS.push({ id: 'ADB-' + tid.replace(/^TRV-/, ''), name: travelById(tid).name, travel: tid, balance: 0, spend: 0, campaigns: 0, state: 'active' }); });
  ADBUDGETS.forEach(b => { const cs = CAMPAIGNS.filter(c => c.owner === b.travel); b.spend = cs.reduce((s, c) => s + (c.spent || 0), 0); b.campaigns = cs.length; });
  if (!DEMO) buildSeries();
}
const platformRevenue = pays => pays.reduce((s, p) => { const tr = travelById(p.travel); const f = tr && FEES.find(x => x.state === 'active' && x.scope === 'Travel · ' + ((tr.sub && tr.sub.plan) || '')); return s + p.amount * (f ? f.rate / 100 : 0.025) + (p.fee || 0); }, 0);
/* seri harian 90 hari dari transaksi nyata */
function buildSeries() {
  const days = []; const today = Math.floor(nowTs() / D);
  for (let i = 89; i >= 0; i--) days.push({ ts: (today - i) * D + 12 * H, gmv: 0, book: 0, spend: 0, leads: 0, conv: 0 });
  const at = ts => { const i = Math.floor(ts / D) - (today - 89); return i >= 0 && i < 90 ? days[i] : null; };
  PAYMENTS.forEach(p => { if (p.status === 'paid') { const d = at(p.ts); if (d) d.gmv += p.amount; } });
  BOOKINGS.forEach(b => { const d = at(b.created); if (d) d.book++; });
  CONVERSATIONS.forEach(c => { const d = at((c.messages && c.messages[0] && c.messages[0].ts) || c.ts); if (d) { d.conv++; if (c.kind === 'lead') d.leads++; } });
  CAMPAIGNS.forEach(c => (c.spendLog || []).forEach(e => { const d = at(e.ts); if (d) d.spend += e.amount; }));
  SERIES.length = 0; days.forEach(d => SERIES.push(d));
}
/* delta nyata: periode ini vs periode sebelumnya dari SERIES */
function realDelta(key, inv) { const n = PERIOD; const cur = SERIES.slice(-n).reduce((s, d) => s + d[key], 0); const prev = SERIES.slice(-2 * n, -n).reduce((s, d) => s + d[key], 0); if (!prev) return '<span class="muted">—</span>'; return delta((cur / prev - 1) * 100, inv); }
/* ---------- metrik omnichannel dari percakapan nyata ---------- */
function frtList(conv) { return (conv || CONVERSATIONS).map(c => { const m = c.messages || []; const i = m.find(x => x.dir === 'in'); if (!i) return null; const o = m.find(x => x.dir === 'out' && x.ts >= i.ts); return o ? o.ts - i.ts : null; }).filter(x => x != null); }
function frtAvg(conv) { const l = frtList(conv); return l.length ? l.reduce((s, x) => s + x, 0) / l.length : null; }
function fDur(ms) { if (ms == null) return '—'; const s = Math.round(ms / 1000); if (s < 60) return s + 's'; const m = Math.floor(s / 60); if (m < 60) return m + 'm ' + (s % 60) + 's'; return Math.floor(m / 60) + 'j ' + (m % 60) + 'm'; }
function slaMet(conv) { const l = (conv || CONVERSATIONS).filter(c => c.sla != null); return l.length ? l.filter(c => c.sla >= 0).length / l.length * 100 : null; }
function chShare() { const n = CONVERSATIONS.length; return CHANNELS.map(c => [c.name || c.id, n ? Math.round(CONVERSATIONS.filter(x => x.channel === c.id).length / n * 100) : 0, 'var(--s1)']).filter(x => x[1] > 0); }
function healthRows() { const rt = typeof SB !== 'undefined' ? SB : null; return [
  ['Supabase DB', !rt ? 'pending' : rt.state === 'error' ? 'down' : rt.on ? 'healthy' : 'pending', rt && rt.lastSave ? 'save ' + rel(rt.lastSave) : (rt && rt.on ? 'connected' : 'connecting')],
  ['Realtime', S.ux === 'offline' ? 'down' : rt && rt.on ? 'healthy' : 'pending', rt ? (rt.peers || 1) + ' ' + L3(['layar', 'screens', 'شاشات']) : '—'],
  ...PROVIDERS.slice(0, 3).map(p => [p.name, p.status || 'pending', p.success != null ? 'success ' + pct(p.success) : L3(['belum ada transaksi', 'no transactions yet', 'لا معاملات'])]),
  ['Webhook', WEBHOOKS.some(w => w.state === 'failed') ? 'degraded' : 'healthy', WEBHOOKS.length + ' endpoint']]; }
/* saran AI iklan dihitung dari performa slot nyata */
function adInsight() {
  const by = {}; CAMPAIGNS.forEach(c => (c.channels || []).forEach(ch => { const n = (c.channels || []).length || 1; const o = by[ch] = by[ch] || { s: 0, l: 0 }; o.s += (c.spent || 0) / n; o.l += (c.leads || 0) / n; }));
  const L = Object.entries(by).filter(([, o]) => o.l >= 5).map(([k, o]) => [k, o.s / o.l]).sort((a, b) => a[1] - b[1]);
  if (L.length < 2) return L3(['Belum cukup data performa untuk saran optimasi (butuh ≥ 2 slot dengan ≥ 5 lead).', 'Not enough performance data for optimization advice (needs ≥ 2 slots with ≥ 5 leads).', 'لا توجد بيانات كافية.']);
  const best = L[0], worst = L[L.length - 1]; const d = Math.round((1 - best[1] / worst[1]) * 100);
  return L3([`Slot ${best[0]} memberi CPL ${d}% lebih rendah dari ${worst[0]} (${money(best[1])} vs ${money(worst[1])}). Pertimbangkan menggeser budget. Perubahan tetap lewat aksi & permission Anda.`, `${best[0]} has ${d}% lower CPL than ${worst[0]} (${money(best[1])} vs ${money(worst[1])}). Consider shifting budget. Changes still go through your actions & permissions.`, `${best[0]} أقل تكلفة بنسبة ${d}%`]);
}
function vendorById(id) { return VENDORS.find(v => v.id === id); }
function pnlH(title, right) { return `<div class="panel-h"><h3>${esc(title)}</h3>${right || ''}</div>`; }
/* mode demo: order vendor contoh (tidak dipakai di produksi) */
if (DEMO && !VORDERS.length) VENDORS.forEach((v, vi) => { const P = VPRODUCTS.filter(p => p.vendor === v.id); if (!P.length) return; BOOKINGS.filter((b, i) => i % VENDORS.length === vi).slice(0, 6).forEach((b, i) => { const x = P[i % P.length]; const qty = b.pax || 1; VORDERS.push({ id: 'PO-' + v.id.slice(4) + '-' + (100 + i), vendor: v.id, travel: b.travel, product: x.id, productName: x.name, qty, value: qty * x.price, booking: b.id, note: '', state: ['departed', 'completed'].includes(b.state) ? 'completed' : BK_EXC.includes(b.state) ? 'cancelled' : i % 3 === 0 ? 'pending' : 'confirmed', created: b.created + H }); }); });
function median(l) { l = (l || []).filter(x => x != null && isFinite(x)).sort((a, b) => a - b); if (!l.length) return null; const m = l.length >> 1; return l.length % 2 ? l[m] : (l[m - 1] + l[m]) / 2; }
function csatAvg(conv) { const l = conv.map(c => c.csat).filter(x => x != null); return l.length ? l.reduce((s, x) => s + x, 0) / l.length : null; }
function perPaid() { return PAYMENTS.filter(p => p.status === 'paid' && p.ts >= nowTs() - PERIOD * D); }
function platRev() { const since = nowTs() - PERIOD * D; return platformRevenue(perPaid()) + (typeof REG_FEES !== 'undefined' ? REG_FEES : []).filter(r => r.ts >= since).reduce((s, r) => s + (r.segFee || 0), 0); }
function perPaid() { return PAYMENTS.filter(p => p.status === 'paid' && p.ts >= nowTs() - PERIOD * D); }
function platRev() { const since = nowTs() - PERIOD * D; return platformRevenue(perPaid()) + (typeof REG_FEES !== 'undefined' ? REG_FEES : []).filter(r => r.ts >= since).reduce((s, r) => s + (r.segFee || 0), 0); }
