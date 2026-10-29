// SEGALOKA Dashboard V7 — Travel extraction runtime
// File 03: canonical data adapter
// Exact helper extraction only.
// Canonical collections remain externally owned.
// No dataset duplication.

const nowTs = () => Date.now();
const bookingById = id => BOOKINGS.find(b => b.id === id);
const pkgById = id => PACKAGES.find(p => p.id === id);
const travelById = id => TRAVELS.find(x => x.id === id);
