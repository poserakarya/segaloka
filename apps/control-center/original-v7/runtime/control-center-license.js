/*
 * SEGALOKA Control Center
 * Shared license-domain rules extracted from legacy portals.js.
 *
 * Do not place portal routing/workspace/entity-switching code here.
 */

const licFor = {
  Umrah: 'PPIU',
  Haji: 'PIHK',
  'Halal Tour': 'BPW',
  Tour: 'BPW'
};

const licOk = (tr, cat) => {
  if (!tr || !Array.isArray(tr.lic)) return false;

  const required = licFor[cat];

  if (!required) return false;

  const license = tr.lic.find(x => x.type === required);

  return Boolean(
    license &&
    ['verified', 'expiring'].includes(license.status)
  );
};