/* Segaloka Travel — shared runtime extracted from existing V7 */

function reroute(pattern, fn) {
  for (let i = ROUTES.length - 1; i >= 0; i--)
    if (ROUTES[i].pattern === pattern) ROUTES.splice(i, 1);
  route(pattern, fn);
}

const ntKey = (ws, id) => ws + ':' + id;

function partyNotify(keys, cat, tone, title, sub, route) {
  const seen = new Set();
  keys.filter(Boolean).forEach(k => {
    if (seen.has(k)) return;
    seen.add(k);
    const ws = k.split(':')[0];

    NOTIFS.unshift({
      id: uid('NTF'),
      to: k,
      cat, tone, title, sub,
      route: route && route[ws]
        ? route[ws]
        : ws === 'travel' ? '/p/travel' : '/',
      ts: nowTs(),
      unread: true
    });
  });
}

function portalStatusBanner(ws) {
  if (ws !== 'travel') return '';

  const x = me('travel');
  if (!x) return '';

  const w = [];
  const st = x.op;

  if (['inactive','suspended'].includes(st))
    w.push(['bad',
      L3(['Akun Anda sedang ditangguhkan','Your account is suspended','الحساب موقوف']),
      ''
    ]);

  if (x.sub && ['grace','suspended','expired'].includes(x.sub.state))
    w.push([
      x.sub.state === 'grace' ? 'warn' : 'bad',
      'Subscription: ' + x.sub.state,
      L3([
        'Buka menu Subscription untuk membayar invoice.',
        'Open Subscription to pay the invoice.',
        'ادفع الفاتورة.'
      ])
    ]);

  return w.map(([tone,title,sub]) =>
    `<div class="banner ${tone === 'bad' ? 'bad' : 'warn'}" role="status">
      ${ic('alert')}
      <span style="flex:1">
        <b>${esc(title)}</b>
        ${sub ? `<br><span style="font-size:12.5px">${esc(sub)}</span>` : ''}
      </span>
    </div>`
  ).join('');
}
