// Identitas IP klien untuk tanda tangan ingress (x-segaloka-client-ip), yang
// dipakai API untuk rate limit dan audit log. Batas kepercayaan:
//
//   vercel  Hanya header yang ditulis ulang edge Vercel: x-vercel-forwarded-for
//           (tidak tertimpa proxy lain), lalu x-real-ip. Vercel menimpa nilai
//           dari klien, jadi browser tidak dapat memalsukannya.
//   proxy   Container: x-real-ip hanya dipercaya bila peer TCP adalah proxy
//           tepercaya: SEGALOKA_TRUSTED_PROXY_IPS (IP/CIDR reverse proxy, mis.
//           nginx yang menulis ulang X-Real-IP), ditambah loopback bila
//           trustLoopback (hanya BFF: listen 127.0.0.1, peer = entry lokal).
//           Selain itu IP peer TCP yang dipakai.
//
// X-Forwarded-For tidak pernah dibaca mentah: daftar itu dapat diisi klien.
import { BlockList, isIP } from 'node:net';

export const CLIENT_IP_HEADER = 'x-real-ip';

// IPv4-mapped IPv6 (::ffff:a.b.c.d) -> a.b.c.d; IPv6 huruf kecil; zone id
// dan nilai lain ditolak.
export function normalizeIp(value) {
  if (typeof value !== 'string') return null;
  let ip = value.trim();
  if (ip.length === 0 || ip.length > 45 || ip.includes('%')) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) ip = mapped[1];
  const version = isIP(ip);
  if (version === 0) return null;
  return version === 6 ? ip.toLowerCase() : ip;
}

function singleHeader(headers, name) {
  const value = headers[name];
  // Header ganda (array) dianggap tidak sah.
  return typeof value === 'string' ? value : null;
}

// Nilai pertama header yang ditulis edge Vercel.
export function clientIpFromVercelHeaders(headers) {
  for (const name of ['x-vercel-forwarded-for', 'x-real-ip']) {
    const value = singleHeader(headers, name);
    if (value === null) continue;
    const ip = normalizeIp(value.split(',')[0]);
    if (ip) return ip;
  }
  return null;
}

export function trustedProxies(env = process.env, { trustLoopback = false } = {}) {
  const list = new BlockList();
  if (trustLoopback) {
    list.addAddress('127.0.0.1', 'ipv4');
    list.addAddress('::1', 'ipv6');
  }
  for (const entry of String(env.SEGALOKA_TRUSTED_PROXY_IPS || '').split(',').map(item => item.trim()).filter(Boolean)) {
    const [address, prefix] = entry.split('/');
    const ip = normalizeIp(address);
    const type = ip && isIP(ip) === 6 ? 'ipv6' : 'ipv4';
    if (!ip || (prefix !== undefined && !/^\d{1,3}$/.test(prefix))) {
      throw new Error('INVALID_SEGALOKA_TRUSTED_PROXY_IPS');
    }
    if (prefix === undefined) list.addAddress(ip, type);
    else {
      const bits = Number(prefix);
      if (bits > (type === 'ipv6' ? 128 : 32)) throw new Error('INVALID_SEGALOKA_TRUSTED_PROXY_IPS');
      list.addSubnet(ip, bits, type);
    }
  }
  return list;
}

function isTrusted(list, ip) {
  return ip !== null && list.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4');
}

export function clientIpFromProxy(req, trusted) {
  const peer = normalizeIp(req.socket?.remoteAddress);
  if (!isTrusted(trusted, peer)) return peer;
  return normalizeIp(singleHeader(req.headers, CLIENT_IP_HEADER) ?? '') || peer;
}

// mode: 'vercel' | 'proxy'. Mengembalikan IP ternormalisasi atau null.
export function createClientIpResolver({ mode, env = process.env, trustLoopback = false } = {}) {
  if (mode === 'vercel') return req => clientIpFromVercelHeaders(req.headers);
  if (mode === 'proxy') {
    const trusted = trustedProxies(env, { trustLoopback });
    return req => clientIpFromProxy(req, trusted);
  }
  throw new Error('INVALID_CLIENT_IP_MODE');
}
