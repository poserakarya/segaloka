/* =====================================================================
   OMNICHANNEL — koneksi nyata ke Meta (WhatsApp Cloud API, Messenger, Instagram DM),
   Email (Resend + inbound) dan Telegram, lewat Supabase Edge Function "omni".
   - Pesan masuk: webhook -> Edge Function -> tabel conversations -> realtime ke Inbox.
   - Pesan keluar: Inbox -> control_center.omni_outbox -> trigger -> Edge Function -> API provider
     -> status (sent/delivered/read/failed) kembali ke pesan di percakapan.
   - Token disimpan di Supabase Vault (tidak pernah dibaca balik ke browser).
   ===================================================================== */
const OMNI_FN = 'https://lcfjqhnimbigwiqkrapm.supabase.co/functions/v1/omni';
/* kanal internal Segaloka: percakapan tetap di dalam platform (tanpa API pihak ketiga) */
[{ id: 'app', key: 'aplikasi', nav: 'om_app', name: 'Pesan Aplikasi', account: L3(['Chat pengguna di aplikasi & website Segaloka · nomor HP disensor', 'User chat in the Segaloka app & website · phone numbers masked', 'دردشة التطبيق']), state: 'active', internal: true, cfg: { queue: 'Umrah', autoReply: true, hours: '08:00–21:00 WITA' } },
 { id: 'dash', key: 'dashboard', nav: 'om_dash', name: 'Pesan Dashboard', account: L3(['Chat Travel, Vendor, Mitra & Agen dengan Segaloka', 'Travel, Vendor, Partner & Agent chat with Segaloka', 'دردشة لوحة التحكم']), state: 'active', internal: true, cfg: { queue: 'Default', autoReply: false, hours: '08:00–17:00 WITA' } },
 { id: 'push', key: 'push', nav: 'om_push', name: 'Push & Notifikasi', account: L3(['Aplikasi Android & iOS · FCM/APNs', 'Android & iOS app · FCM/APNs', 'الإشعارات']), state: 'inactive', internal: true, cfg: { queue: 'Default', autoReply: false, hours: '24 jam' } }]
  .forEach(x => { if (!CHANNELS.some(c => c.id === x.id)) CHANNELS.unshift(Object.assign({ quality: '—', convs: 0 }, x)); });
CHANNELS.sort((a, b) => ['app', 'dash', 'push', 'wa', 'ig', 'fb', 'email', 'tg', 'web'].indexOf(a.id) - ['app', 'dash', 'push', 'wa', 'ig', 'fb', 'email', 'tg', 'web'].indexOf(b.id));
/* sensor kontak pribadi di kanal internal: nomor telepon, wa.me / t.me, dan ajakan pindah ke WA */
function maskContact(s) {
  let n = 0; const tag = L3(['[disensor]', '[hidden]', '[مخفي]']);
  const out = String(s)
    .replace(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|t\.me|line\.me)\/[^\s]*/gi, () => { n++; return tag; })
    .replace(/(?:\+?62|\b0)[\s.-]?8[\d\s.-]{7,14}\d/g, () => { n++; return tag; })
    .replace(/\b\d(?:[\s.-]?\d){9,13}\b/g, () => { n++; return tag; });
  return { text: out, masked: n };
}
if (!CHANNELS.some(c => c.id === 'tg')) CHANNELS.push({ id: 'tg', key: 'telegram', nav: 'om_tg', name: 'Telegram', account: '', quality: '—', state: 'inactive', convs: 0, cfg: { queue: 'Default', autoReply: false, hours: '24 jam' } });


/* spesifikasi per channel: id non-rahasia (disimpan di konfigurasi channel) + token (di Vault) */
const OMNI_SPEC = {
  wa: { hook: '/webhook/meta', ids: [['phoneNumberId', 'Phone Number ID', '1234567890'], ['wabaId', 'WhatsApp Business Account ID', '1098765432'], ['display', L3(['Nomor tampil', 'Display number', 'الرقم']), '+62 811 …']],
    secrets: [['meta_access_token', L3(['Access token (System User, permanen)', 'Access token (System User, permanent)', 'رمز الوصول'])], ['meta_app_secret', 'App Secret'], ['meta_verify_token', 'Verify token', true]],
    guide: () => [L3(['Di developers.facebook.com buat App tipe Business, tambahkan produk WhatsApp.', 'At developers.facebook.com create a Business app and add the WhatsApp product.', 'أنشئ تطبيقاً وأضف واتساب.']),
      L3(['Di WhatsApp › API Setup: salin Phone Number ID dan WhatsApp Business Account ID ke kolom di samping.', 'In WhatsApp › API Setup copy the Phone Number ID and WABA ID into the fields.', 'انسخ المعرفات.']),
      L3(['Business Settings › System Users: buat System User (Admin), generate token dengan izin whatsapp_business_messaging + whatsapp_business_management. Tempel sebagai Access token.', 'Business Settings › System Users: create an Admin system user, generate a token with whatsapp_business_messaging + whatsapp_business_management. Paste it as Access token.', 'أنشئ مستخدم نظام وولّد الرمز.']),
      L3(['App Settings › Basic: salin App Secret, tempel di kolom App Secret.', 'App Settings › Basic: copy the App Secret into the App Secret field.', 'انسخ App Secret.']),
      L3(['Klik "Buat" pada Verify token, lalu di WhatsApp › Configuration › Webhook isi Callback URL (di bawah) dan Verify token tersebut, klik Verify and save.', 'Click "Generate" for Verify token, then in WhatsApp › Configuration › Webhook paste the Callback URL (below) and that Verify token, click Verify and save.', 'أدخل عنوان الاستدعاء ورمز التحقق.']),
      L3(['Subscribe field webhook: messages. Lalu klik "Cek koneksi" di sini.', 'Subscribe the webhook field: messages. Then click "Check connection" here.', 'اشترك في messages.'])] },
  fb: { hook: '/webhook/meta', ids: [['pageId', 'Facebook Page ID', '1122334455']],
    secrets: [['meta_page_token', L3(['Page access token (tidak kedaluwarsa)', 'Page access token (non-expiring)', 'رمز الصفحة'])], ['meta_app_secret', 'App Secret'], ['meta_verify_token', 'Verify token', true]],
    guide: () => [L3(['Di App yang sama, tambahkan produk Messenger.', 'In the same app add the Messenger product.', 'أضف ماسنجر.']),
      L3(['Messenger › Settings › Access Tokens: hubungkan Page Segaloka, generate Page access token (izin pages_messaging, pages_manage_metadata). Tempel di kolom token.', 'Messenger › Settings › Access Tokens: connect the Segaloka Page and generate a Page access token (pages_messaging, pages_manage_metadata). Paste it in the token field.', 'ولّد رمز الصفحة.']),
      L3(['Webhooks: Callback URL & Verify token sama dengan WhatsApp; subscribe Page ke field messages, message_deliveries, messaging_postbacks.', 'Webhooks: same Callback URL & Verify token as WhatsApp; subscribe the Page to messages, message_deliveries, messaging_postbacks.', 'اشترك في الحقول.']),
      L3(['Isi Page ID, simpan, lalu "Cek koneksi". Balasan di luar 24 jam dari pesan terakhir pelanggan ditolak Meta.', 'Fill the Page ID, save, then "Check connection". Replies more than 24h after the customer\'s last message are rejected by Meta.', 'نافذة 24 ساعة.'])] },
  ig: { hook: '/webhook/meta', ids: [['igUserId', 'Instagram Business Account ID', '17841400000000000'], ['username', 'Username', '@segaloka.id']],
    secrets: [['meta_ig_token', L3(['Token Instagram (opsional, default memakai Page token)', 'Instagram token (optional, defaults to the Page token)', 'رمز إنستغرام'])], ['meta_page_token', 'Page access token'], ['meta_app_secret', 'App Secret']],
    guide: () => [L3(['Akun Instagram harus Business/Creator dan terhubung ke Facebook Page Segaloka.', 'The Instagram account must be Business/Creator and linked to the Segaloka Facebook Page.', 'حساب أعمال مرتبط بالصفحة.']),
      L3(['Di App tambahkan produk Instagram (Messenger API for Instagram); izin instagram_basic, instagram_manage_messages, pages_messaging.', 'Add the Instagram product (Messenger API for Instagram); permissions instagram_basic, instagram_manage_messages, pages_messaging.', 'أضف الأذونات.']),
      L3(['Di pengaturan Instagram (aplikasi) aktifkan "Izinkan akses ke pesan".', 'In the Instagram app settings enable "Allow access to messages".', 'اسمح بالوصول للرسائل.']),
      L3(['Webhooks object "Instagram": Callback URL & Verify token sama; subscribe field messages. "Cek koneksi" akan menampilkan ID akun IG dari Page token.', 'Webhooks object "Instagram": same Callback URL & Verify token; subscribe messages. "Check connection" shows the IG account ID from the Page token.', 'اشترك في messages.'])] },
  email: { hook: '/webhook/email', ids: [['from', L3(['Pengirim (From)', 'Sender (From)', 'المرسل']), 'Segaloka <cs@segaloka.id>'], ['replyTo', 'Reply-To', 'cs@segaloka.id']],
    secrets: [['resend_api_key', 'Resend API key'], ['email_inbound_key', L3(['Kunci webhook email masuk', 'Inbound email webhook key', 'مفتاح البريد الوارد']), true]],
    guide: () => [L3(['Daftar di resend.com, verifikasi domain (SPF, DKIM di DNS), buat API key dengan izin Sending. Tempel di kolom Resend API key.', 'Sign up at resend.com, verify your domain (SPF, DKIM in DNS), create an API key with Sending access. Paste it as Resend API key.', 'تحقق من النطاق وأنشئ المفتاح.']),
      L3(['Isi alamat pengirim dengan domain yang sudah diverifikasi.', 'Set the sender address on the verified domain.', 'عنوان المرسل.']),
      L3(['Email masuk: klik "Buat" pada kunci webhook, lalu arahkan inbound (Resend Inbound, Postmark Inbound, atau Cloudflare Email Routing → Worker) ke URL webhook di bawah + ?key=<kunci>.', 'Inbound: click "Generate" for the webhook key, then point inbound (Resend Inbound, Postmark Inbound, or Cloudflare Email Routing → Worker) to the webhook URL below + ?key=<key>.', 'وجّه البريد الوارد.'])] },
  tg: { hook: '/webhook/telegram', ids: [['username', 'Bot username', '@SegalokaBot']],
    secrets: [['telegram_bot_token', 'Bot token (BotFather)'], ['telegram_webhook_secret', 'Webhook secret', true]],
    guide: () => [L3(['Di Telegram buka @BotFather → /newbot, salin token bot ke kolom Bot token.', 'In Telegram open @BotFather → /newbot, copy the bot token into the Bot token field.', 'أنشئ بوتاً.']),
      L3(['Klik "Buat" pada Webhook secret.', 'Click "Generate" for Webhook secret.', 'أنشئ السر.']),
      L3(['Klik "Cek koneksi": sistem otomatis memasang webhook bot ke Segaloka.', 'Click "Check connection": the bot webhook is registered to Segaloka automatically.', 'يتم تسجيل الويب هوك تلقائياً.'])] }
};
const OMNI_RT = { secrets: {}, health: null, events: {}, outbox: {}, loading: false, at: 0, shown: {} };
const omniLive = () => SB.on && !DEMO;
async function omniLoad(chId) {
  if (!omniLive()) return;
  OMNI_RT.loading = true;
  try {
    const [s, h, ev, ob] = await Promise.all([
      sql('select name, is_set, (extract(epoch from updated_at)*1000)::bigint as t from control_center.sg_omni_secret_status()'),
      sql("select value from control_center.settings where key = 'omni_health'"),
      sql(`select id, channel, kind, ok, error, (extract(epoch from received_at)*1000)::bigint as t from control_center.omni_events where channel in (${chId ? `'${chId}', 'meta'` : "'wa','ig','fb','email','tg','meta'"}) order by id desc limit 25`),
      sql(`select id, channel, to_addr, kind, status, error, (extract(epoch from created_at)*1000)::bigint as t from control_center.omni_outbox where kind <> 'ping' ${chId ? `and channel = '${chId}'` : ''} order by created_at desc limit 15`)]);
    OMNI_RT.secrets = {}; s.forEach(r => OMNI_RT.secrets[r.name] = +r.t || true);
    OMNI_RT.health = h[0] ? h[0].value : null; OMNI_RT.events[chId || 'all'] = ev; OMNI_RT.outbox[chId || 'all'] = ob; OMNI_RT.at = Date.now();
  } catch (e) { OMNI_RT.err = String(e.message || e); }
  OMNI_RT.loading = false;
  const box = document.getElementById('omni-live'); if (box && box.dataset.ch === (chId || '')) box.innerHTML = omniLiveHTML(chId);
  CHANNELS.forEach(c => { if (OMNI_SPEC[c.id]) c.state = omniConnected(c.id) ? 'active' : 'inactive'; });
}
/* terhubung = token & ID wajib terisi + (untuk Meta/TG) pengecekan provider berhasil */
function omniConnected(id) {
  const ch = CHANNELS.find(c => c.id === id); if (!ch) return false; if (!OMNI_SPEC[id]) return ch.state === 'active';
  const s = OMNI_RT.secrets, cfg = ch.cfg || {}, chk = (OMNI_RT.health && OMNI_RT.health.checks) || {};
  if (id === 'wa') return !!(s.meta_access_token && cfg.phoneNumberId && chk.wa && !chk.wa.error);
  if (id === 'fb') return !!(s.meta_page_token && chk.page && !chk.page.error);
  if (id === 'ig') return !!((s.meta_ig_token || s.meta_page_token) && chk.page && chk.page.instagram_business_account);
  if (id === 'email') return !!(s.resend_api_key && cfg.from);
  if (id === 'tg') return !!(s.telegram_bot_token && chk.tg && chk.tg.ok);
  return false;
}
function omniCheckText(id) {
  const chk = (OMNI_RT.health && OMNI_RT.health.checks) || {};
  if (id === 'wa' && chk.wa) return chk.wa.error ? '✗ ' + chk.wa.error.message : '✓ ' + (chk.wa.verified_name || '') + ' · ' + (chk.wa.display_phone_number || '') + (chk.wa.quality_rating ? ' · quality ' + chk.wa.quality_rating : '');
  if ((id === 'fb' || id === 'ig') && chk.page) return chk.page.error ? '✗ ' + chk.page.error.message : '✓ Page: ' + (chk.page.name || chk.page.id) + (chk.page.instagram_business_account ? ' · IG @' + (chk.page.instagram_business_account.username || '') + ' (' + chk.page.instagram_business_account.id + ')' : ' · ' + L3(['IG belum tertaut', 'no IG linked', 'لا حساب']));
  if (id === 'tg' && chk.tg) return chk.tg.ok ? '✓ @' + chk.tg.username + (chk.tgWebhook === true ? ' · webhook ✓' : chk.tgWebhook === false ? ' · webhook ✗' : '') : '✗ token ditolak';
  return null;
}
function omniLiveHTML(id) {
  if (!omniLive()) return `<div class="auditbox">${ic('info')}<span>${DEMO ? L3(['Mode demo tidak tersambung ke provider.', 'Demo mode is not connected to providers.', 'الوضع التجريبي غير متصل.']) : L3(['Sambungkan database (Supabase) untuk mengelola koneksi channel.', 'Connect the database (Supabase) to manage channel connections.', 'اتصل بقاعدة البيانات.'])}</span></div>`;
  const sp = OMNI_SPEC[id]; const ch = CHANNELS.find(c => c.id === id); const ok = omniConnected(id); const txt = omniCheckText(id);
  const ev = OMNI_RT.events[id] || [], ob = OMNI_RT.outbox[id] || [];
  const secRow = ([k, label, gen]) => { const set = OMNI_RT.secrets[k]; const shown = OMNI_RT.shown[k];
    return `<div class="field"><label for="osec-${k}">${esc(label)} ${set ? `<span class="chip" style="margin-inline-start:6px">${ic('lock', 'sm')}${L3(['tersimpan', 'stored', 'محفوظ'])}${typeof set === 'number' ? ' · ' + esc(rel(set)) : ''}</span>` : `<span class="chip" style="margin-inline-start:6px;color:var(--warn)">${L3(['belum diisi', 'not set', 'غير محدد'])}</span>`}</label>
      ${shown ? `<div class="auditbox">${ic('check')}<span>${L3(['Salin sekarang — nilai ini tidak ditampilkan lagi:', 'Copy it now — it will not be shown again:', 'انسخه الآن:'])} <code class="mono" style="user-select:all;word-break:break-all">${esc(shown)}</code></span></div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input type="password" id="osec-${k}" autocomplete="off" placeholder="${set ? '••••••••  (' + L3(['isi untuk mengganti', 'type to replace', 'للاستبدال']) + ')' : ''}" style="flex:1;min-width:160px">
      ${permBtn('omni.manage', t('save'), `data-act="omni-sec" data-k="${k}" data-mut`, 'sm')}${gen ? permBtn('omni.manage', L3(['Buat', 'Generate', 'إنشاء']), `data-act="omni-gen" data-k="${k}" data-mut`, 'sm') : ''}${set ? permBtn('omni.manage', ic('x', 'sm'), `data-act="omni-sec-del" data-k="${k}" data-mut aria-label="hapus"`, 'sm ghost') : ''}</div></div>`; };
  return `<div class="grid g12" style="margin-top:14px">
   <div class="c7">${pnl(L3(['Koneksi', 'Connection', 'الاتصال']), `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">${st(ok ? 'active' : 'inactive')}<span class="muted" style="font-size:12.5px">${txt ? esc(txt) : L3(['Belum dicek', 'Not checked yet', 'لم يُفحص'])}${OMNI_RT.health ? ' · ' + esc(rel(OMNI_RT.health.at)) : ''}</span><span style="flex:1"></span>${permBtn('omni.manage', ic('refresh', 'sm') + L3(['Cek koneksi', 'Check connection', 'فحص']), `data-act="omni-ping" data-id="${id}" data-mut`, 'sm primary')}</div>
     ${sp.ids.map(([k, label, ph]) => `<div class="field"><label for="ocfg-${k}">${esc(label)}</label><input id="ocfg-${k}" value="${esc((ch.cfg || {})[k] || '')}" placeholder="${esc(ph)}"></div>`).join('')}
     ${permBtn('omni.manage', ic('check', 'sm') + L3(['Simpan ID', 'Save IDs', 'حفظ']), `data-act="omni-cfg" data-id="${id}" data-mut`, 'sm')}
     <div class="section-title" style="margin:16px 0 8px"><h2 style="font-size:13px">${L3(['Token & rahasia (disimpan di Supabase Vault)', 'Tokens & secrets (stored in Supabase Vault)', 'الرموز (في Vault)'])}</h2><span class="rule"></span></div>
     ${sp.secrets.map(secRow).join('')}
     <div class="field"><label>${L3(['Callback / Webhook URL', 'Callback / Webhook URL', 'رابط الاستدعاء'])}</label><div style="display:flex;gap:8px"><input readonly value="${esc(OMNI_FN + sp.hook)}" class="mono" style="flex:1;min-width:0" id="ohook"><button class="btn sm" data-act="omni-copy" data-v="${esc(OMNI_FN + sp.hook)}">${ic('copy', 'sm')}</button></div></div>`, { icon: 'plug' })}</div>
   <div class="c5" style="display:grid;gap:14px;align-content:start">${pnl(L3(['Langkah pemasangan', 'Setup steps', 'خطوات الإعداد']), `<ol style="margin:0;padding-inline-start:18px;display:grid;gap:8px;font-size:13px">${sp.guide().map(s => `<li>${esc(s)}</li>`).join('')}</ol>`, { icon: 'list' })}
     ${pnl(L3(['Kirim pesan uji', 'Send test message', 'رسالة اختبار']), `<div class="field"><label for="otest-to">${id === 'email' ? 'Email' : id === 'wa' ? L3(['Nomor WA (format 62…)', 'WA number (62… format)', 'الرقم']) : id === 'tg' ? 'Chat ID' : 'PSID / IGSID'}</label><input id="otest-to" placeholder="${id === 'email' ? 'nama@domain.com' : id === 'wa' ? '6281234567890' : ''}"></div><div class="field"><label for="otest-msg">${L3(['Pesan', 'Message', 'الرسالة'])}</label><input id="otest-msg" value="${esc(L3(['Tes koneksi SEGALOKA', 'SEGALOKA connection test', 'اختبار']))}"></div>${id === 'wa' ? `<p class="muted" style="font-size:12px;margin:0 0 8px">${L3(['WhatsApp: pesan teks bebas hanya bisa ke nomor yang mengirim pesan dalam 24 jam terakhir; selain itu pakai template.', 'WhatsApp: free text only reaches numbers that messaged you within 24h; otherwise use a template.', 'نافذة 24 ساعة.'])}</p>` : ''}${permBtn('omni.manage', icd('send', 'sm') + L3(['Kirim', 'Send', 'إرسال']), `data-act="omni-test" data-id="${id}" data-mut`, 'sm')}`, { icon: 'send' })}</div></div>
  <div class="grid g2" style="margin-top:14px">${pnl(L3(['Event webhook terakhir', 'Latest webhook events', 'آخر الأحداث']), ev.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>${L3(['Waktu', 'Time', 'الوقت'])}</th><th>Event</th><th>${t('status')}</th></tr></thead><tbody>${ev.map(e => `<tr><td>${esc(rel(+e.t))}</td><td class="mono">${esc(e.channel + ' · ' + e.kind)}</td><td>${e.ok ? st('success') : st('failed')}${e.error ? `<div class="muted" style="font-size:11.5px">${esc(e.error)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : stateBlock('empty', { title: L3(['Belum ada event', 'No events yet', 'لا أحداث']), desc: L3(['Muncul setelah provider memanggil webhook.', 'Shows up once the provider calls the webhook.', 'تظهر بعد الاستدعاء.']) }), { raw: true, icon: 'activity' })}
   ${pnl(L3(['Pesan keluar terakhir', 'Latest outgoing messages', 'آخر الرسائل الصادرة']), ob.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>${L3(['Waktu', 'Time', 'الوقت'])}</th><th>${L3(['Ke', 'To', 'إلى'])}</th><th>${t('status')}</th></tr></thead><tbody>${ob.map(o => `<tr><td>${esc(rel(+o.t))}</td><td class="mono">${esc(o.to_addr)}</td><td>${st(o.status === 'queued' || o.status === 'sending' ? 'pending' : o.status === 'failed' ? 'failed' : 'success')} <span class="muted">${esc(o.status)}</span>${o.error ? `<div class="muted" style="font-size:11.5px">${esc(o.error)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : stateBlock('empty', { title: L3(['Belum ada pesan keluar', 'No outgoing messages yet', 'لا رسائل']) }), { raw: true, icon: 'send' })}</div>`;
}
/* halaman channel (menggantikan versi lama) */
function omniChannelPage(ch) {
  const convs = CONVERSATIONS.filter(c => c.channel === ch.id); const live = !!OMNI_SPEC[ch.id];
  if (live && omniLive() && Date.now() - OMNI_RT.at > 4000 && !OMNI_RT.loading) setTimeout(() => omniLoad(ch.id), 0);
  const on = live ? omniConnected(ch.id) : ch.state === 'active';
  return { html: `<div class="page">${phead({ crumbs: [[t('g_omni'), '/omni'], [t('om_chan'), ''], [ch.name, '']], title: ch.name, desc: ch.id === 'web' ? L3(['Widget chat di website Travel; pesan masuk langsung ke Inbox.', 'Chat widget on Travel websites; messages land straight in the Inbox.', 'ودجت الدردشة.']) : ch.id === 'app' ? L3(['Chat pengguna di aplikasi & website Segaloka. Nomor telepon dan link wa.me/t.me otomatis disensor — komunikasi & pembayaran tetap di Segaloka.', 'User chat in the Segaloka app & website. Phone numbers and wa.me/t.me links are masked automatically — communication & payment stay inside Segaloka.', 'تُخفى الأرقام تلقائيًا.']) : ch.id === 'dash' ? L3(['Chat Travel, Vendor, Mitra & Agen dengan tim Segaloka dari dashboard masing-masing. Kontak pribadi disensor.', 'Travel, Vendor, Partner & Agent chat with the Segaloka team from their dashboards. Personal contacts are masked.', 'دردشة لوحة التحكم.']) : ch.id === 'push' ? L3(['Push ke aplikasi Android & iOS. Butuh build aplikasi mobile + kredensial FCM/APNs; belum terhubung.', 'Push to the Android & iOS apps. Requires the mobile app build + FCM/APNs credentials; not connected yet.', 'يتطلب FCM/APNs.']) : L3(['Hubungkan akun resmi lewat API provider. Pesan masuk & status kirim tersinkron realtime ke Inbox.', 'Connect the official account through the provider API. Inbound messages & delivery status sync to the Inbox in realtime.', 'اربط الحساب الرسمي.']) })}
  ${kpiRow([{ k: t('status'), v: st(on ? 'active' : 'inactive') }, { k: L3(['Percakapan aktif', 'Active conversations', 'محادثات نشطة']), v: fN(convs.filter(c => ['open', 'pending'].includes(c.status)).length) }, { k: L3(['Volume 30d', 'Volume 30d', 'الحجم']), v: fN(convs.filter(c => (c.ts || 0) >= nowTs() - 30 * D).length) }, { k: 'First response', v: fDur(frtAvg(convs)) }])}
  ${live ? `<div id="omni-live" data-ch="${ch.id}">${omniLiveHTML(ch.id)}</div>` : ''}
  <div class="grid g12" style="margin-top:14px"><div class="c5">${pnl(L3(['Routing & jam layanan', 'Routing & service hours', 'التوجيه']), `<div class="field"><label for="chq">${L3(['Antrian default', 'Default queue', 'القائمة الافتراضية'])}</label><select id="chq">${QUEUES.map(q => `<option ${ch.cfg.queue === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div><div class="field"><label for="chh">${L3(['Jam layanan', 'Service hours', 'ساعات الخدمة'])}</label><input type="text" id="chh" value="${esc(ch.cfg.hours || '')}"></div><label class="field" style="flex-direction:row;gap:8px;font-size:13px"><input type="checkbox" id="cha" ${ch.cfg.autoReply ? 'checked' : ''}> ${L3(['Auto-reply di luar jam layanan', 'Auto-reply outside service hours', 'رد تلقائي'])}</label>`, { icon: 'sliders', foot: permBtn('omni.manage', ic('check') + t('save'), `data-act="ch-save" data-id="${ch.id}" data-mut`, 'primary') })}</div>
  <div class="c7">${pnl(L3(['Percakapan di channel ini', 'Conversations on this channel', 'محادثات القناة']), convs.length ? `<div class="list" style="margin:-14px">${convs.slice(0, 12).map(c => `<a class="li" href="#/omni/inbox/${c.id}">${chanBadge(c.channel)}<span class="body"><b>${esc(c.contact)}</b><span class="sub">${esc(((c.messages || [])[c.messages.length - 1] || {}).text || '')}</span></span>${st(c.status)}</a>`).join('')}</div>` : stateBlock('empty'), { icon: 'msg', right: seeAll('/omni/inbox') })}</div></div></div>` };
}
CHANNELS.forEach(ch => route('/omni/channel/' + ch.key, () => omniChannelPage(ch)));
const omniVal = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
Object.assign(A, {
  'ch-save': el => { const ch = CHANNELS.find(c => c.id === el.dataset.id); const before = JSON.stringify(ch.cfg); ch.cfg = Object.assign({}, ch.cfg, { queue: omniVal('chq'), hours: omniVal('chh'), autoReply: document.getElementById('cha').checked }); audit('Admin Pusat', 'channel.config.update', 'Channel/' + ch.name, 'success', { before, after: JSON.stringify(ch.cfg) }); toast('ok', L3(['Konfigurasi disimpan', 'Configuration saved', 'تم الحفظ']), ch.name); },
  'omni-cfg': el => { const ch = CHANNELS.find(c => c.id === el.dataset.id); const sp = OMNI_SPEC[ch.id]; const before = JSON.stringify(ch.cfg); ch.cfg = Object.assign({}, ch.cfg); sp.ids.forEach(([k]) => { ch.cfg[k] = omniVal('ocfg-' + k); }); if (ch.id === 'wa' && ch.cfg.display) ch.account = ch.cfg.display; if (ch.id === 'email' && ch.cfg.from) ch.account = ch.cfg.from; if ((ch.id === 'ig' || ch.id === 'tg') && ch.cfg.username) ch.account = ch.cfg.username; audit('Admin Pusat', 'channel.ids.update', 'Channel/' + ch.name, 'success', { before, after: JSON.stringify(ch.cfg) }); toast('ok', L3(['ID channel disimpan', 'Channel IDs saved', 'تم الحفظ']), ch.name); rerender(); },
  'omni-sec': async el => { if (!omniLive()) return toast('warn', L3(['Database belum tersambung', 'Database not connected', 'غير متصل']), ''); const k = el.dataset.k; const v = omniVal('osec-' + k); if (!v) { document.getElementById('osec-' + k).focus(); return; } try { await sql(`select control_center.sg_omni_set_secret('${k}', ${dq(v)})`); OMNI_RT.shown[k] = null; audit('Admin Pusat', 'channel.secret.set', 'Vault/omni_' + k, 'success'); toast('ok', L3(['Token disimpan di Vault', 'Token stored in Vault', 'حُفظ']), k); await omniLoad(document.getElementById('omni-live') ? document.getElementById('omni-live').dataset.ch : null); } catch (e) { toast('bad', L3(['Gagal menyimpan token', 'Failed to store token', 'فشل']), String(e.message || e)); } },
  'omni-gen': async el => { if (!omniLive()) return; const k = el.dataset.k; const a = new Uint8Array(24); crypto.getRandomValues(a); const v = 'sg_' + [...a].map(b => b.toString(16).padStart(2, '0')).join(''); try { await sql(`select control_center.sg_omni_set_secret('${k}', ${dq(v)})`); OMNI_RT.shown[k] = v; audit('Admin Pusat', 'channel.secret.generate', 'Vault/omni_' + k, 'success'); await omniLoad(document.getElementById('omni-live').dataset.ch); } catch (e) { toast('bad', 'Vault', String(e.message || e)); } },
  'omni-sec-del': el => { const k = el.dataset.k; confirmAction({ title: L3(['Hapus token ', 'Remove token ', 'حذف ']) + k, desc: L3(['Channel yang memakai token ini berhenti mengirim/menerima.', 'Channels using this token stop sending/receiving.', 'ستتوقف القنوات.']), tone: 'danger', reason: true, resource: 'Vault/omni_' + k, onOk: async r => { await sql(`select control_center.sg_omni_set_secret('${k}', '')`); audit('Admin Pusat', 'channel.secret.remove', 'Vault/omni_' + k, 'success', { reason: r }); OMNI_RT.shown[k] = null; await omniLoad(document.getElementById('omni-live').dataset.ch); } }); },
  'omni-copy': el => { const v = el.dataset.v; try { navigator.clipboard.writeText(v); toast('ok', L3(['Disalin', 'Copied', 'نُسخ']), v); } catch (e) { toast('info', v, ''); } },
  'omni-ping': async el => { if (!omniLive()) return; const id = el.dataset.id; try { await sbFlush(); await sql(`insert into control_center.omni_outbox (channel, to_addr, kind, created_by) values ('${id}', '-', 'ping', ${dq('Admin Pusat')})`); toast('info', L3(['Mengecek koneksi…', 'Checking connection…', 'جارٍ الفحص…']), CHANNELS.find(c => c.id === id).name); for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 1200)); const before = OMNI_RT.health && OMNI_RT.health.at; await omniLoad(id); if (OMNI_RT.health && OMNI_RT.health.at !== before && Date.now() - OMNI_RT.health.at < 60000) break; } const ok = omniConnected(id); audit('Admin Pusat', 'channel.check', 'Channel/' + id, ok ? 'success' : 'warning'); toast(ok ? 'ok' : 'warn', ok ? L3(['Terhubung', 'Connected', 'متصل']) : L3(['Belum terhubung', 'Not connected yet', 'غير متصل']), omniCheckText(id) || L3(['Lengkapi token & ID', 'Complete tokens & IDs', 'أكمل البيانات'])); rerender(); } catch (e) { toast('bad', L3(['Gagal', 'Failed', 'فشل']), String(e.message || e)); } },
  'omni-test': async el => { if (!omniLive()) return; const id = el.dataset.id; const to = omniVal('otest-to'); const msg = omniVal('otest-msg'); if (!to) { document.getElementById('otest-to').focus(); return; } try { const r = await sql(`insert into control_center.omni_outbox (channel, to_addr, body, created_by) values ('${id}', ${dq(to)}, ${dq(JSON.stringify({ text: msg, subject: 'SEGALOKA test' }))}::jsonb, ${dq('Admin Pusat')}) returning id`); const oid = r[0].id; audit('Admin Pusat', 'channel.test', 'Channel/' + id, 'success', { after: to }); toast('info', L3(['Pesan uji diantrikan', 'Test message queued', 'في الانتظار']), oid); for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 1200)); const s = await sql(`select status, error from control_center.omni_outbox where id = ${dq(oid)}`); if (s[0] && !['queued', 'sending'].includes(s[0].status)) { toast(s[0].status === 'failed' ? 'bad' : 'ok', s[0].status === 'failed' ? L3(['Gagal terkirim', 'Send failed', 'فشل']) : L3(['Terkirim ke provider', 'Accepted by provider', 'أُرسلت']), s[0].error || to); break; } } await omniLoad(id); } catch (e) { toast('bad', L3(['Gagal', 'Failed', 'فشل']), String(e.message || e)); } }
});
delete A['ch-toggle']; delete A['ch-test'];

/* ---------- Inbox: balasan dikirim sungguhan lewat outbox ---------- */
const OMNI_SENDABLE = ['wa', 'ig', 'fb', 'email', 'tg'];
async function omniQueueReply(c, m) {
  if (!omniLive() || !OMNI_SENDABLE.includes(c.channel) || !c.extId) return;
  m.status = 'queued';
  try {
    await sbFlush();
    const subj = c.channel === 'email' ? 'Re: ' + ((((c.messages || []).find(x => x.dir === 'in') || {}).text || '').match(/^\[([^\]]+)\]/) || [, 'SEGALOKA'])[1] : undefined;
    await sql(`insert into control_center.omni_outbox (channel, conv_id, msg_ts, to_addr, body, created_by) values ('${c.channel}', ${dq(c.id)}, ${+m.ts}, ${dq(c.extId)}, ${dq(JSON.stringify({ text: m.text, subject: subj }))}::jsonb, ${dq(m.by || 'Admin Pusat')})`);
  } catch (e) { m.status = 'failed'; m.error = String(e.message || e); toast('bad', L3(['Pesan gagal diantrikan', 'Failed to queue message', 'فشل']), m.error); rerender(); }
}
const OMNI_TICK = { queued: ['clock', L3(['antre', 'queued', 'بالانتظار'])], sending: ['clock', L3(['mengirim', 'sending', 'جارٍ'])], sent: ['check', L3(['terkirim', 'sent', 'أُرسلت'])], delivered: ['check', L3(['sampai', 'delivered', 'وصلت'])], read: ['check', L3(['dibaca', 'read', 'قُرئت'])], failed: ['alert', L3(['gagal', 'failed', 'فشل'])] };
function omniTick(m) { if (m.dir !== 'out') return ''; if (!m.status) return ''; const k = OMNI_TICK[m.status] || OMNI_TICK.sent; return ` · <span title="${esc(m.error || '')}" style="${m.status === 'failed' ? 'color:var(--bad)' : m.status === 'read' ? 'color:var(--accent)' : ''}">${esc(k[1])}${m.status === 'failed' && m.error ? ': ' + esc(m.error.slice(0, 80)) : ''}</span>`; }
/* 24 jam sejak pesan terakhir pelanggan (aturan Meta) */
function omniWindowOpen(c) { if (!['wa', 'ig', 'fb'].includes(c.channel)) return true; const last = c.lastIn || ((c.messages || []).filter(m => m.dir === 'in').slice(-1)[0] || {}).ts; return !last || nowTs() - last < 24 * H; }
