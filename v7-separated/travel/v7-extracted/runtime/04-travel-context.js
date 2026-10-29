/* Segaloka Travel — fixed role context */
const TRAVEL_WS = 'travel';

function wsOf() { return TRAVEL_WS; }

function me(ws = TRAVEL_WS) {
  if (ws !== TRAVEL_WS) return null;
  const list = typeof TRAVELS !== 'undefined' ? TRAVELS : [];
  return list.find(x => !['inactive','rejected'].includes(x.status)) || list[0] || null;
}

const WS = {
  travel: {
    label: ['Travel','Travel','السفر'],
    home: '/p/travel'
  }
};

const pAudit = (ws, action, resource, extra) =>
  audit(me(TRAVEL_WS)?.name || 'Travel', action, resource, 'success',
    Object.assign({ source: 'Travel' }, extra || {}));

const pNotif = (cat, tone, title, sub, route) => {
  NOTIFS.unshift({
    id: uid('NTF'), cat, tone, title, sub, route,
    ts: nowTs(), unread: true
  });
};

const pApproval = o => {
  const a = Object.assign({
    id: uid('APR'),
    status: 'waiting',
    priority: 'p2',
    assignee: null,
    ts: nowTs()
  }, o);
  APPROVALS.unshift(a);
  return a;
};

const pHead = (ws, title, desc, actions) =>
  phead({
    crumbs: [[L3(WS.travel.label), '/p/travel'], [title, '']],
    title, desc, actions
  });

const tbl = (head, rows, empty) =>
  rows.length
    ? `<div class="tbl-wrap"><table class="t"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
    : stateBlock('empty', { title: empty || t('no_data') });
