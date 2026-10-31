// Sumber IP klien untuk tanda tangan ingress (rate limit dan audit di API).
// Hanya sumber yang ditulis ulang proxy tepercaya; X-Forwarded-For dari
// klien tidak pernah dibaca mentah.
//   vercel     x-vercel-forwarded-for lalu x-real-ip (ditimpa edge Vercel)
//   x-real-ip  self-hosted di belakang reverse proxy yang menimpa X-Real-IP
// SEGALOKA_CLIENT_IP_SOURCE memilih sumber; di Vercel (VERCEL=1) default
// "vercel". Di luar production tanpa konfigurasi: 127.0.0.1 (uji lokal).
// Production tanpa sumber yang sah: null (route menolak, fail closed).
import { canonicalClientIp } from "./segaloka-ingress-v3.mjs";

export function requestClientIp(request, env = process.env) {
  const source = env.SEGALOKA_CLIENT_IP_SOURCE || (env.VERCEL === "1" ? "vercel" : "");
  const first = name => {
    const value = request.headers.get(name);
    return value ? canonicalClientIp(value.split(",")[0].trim()) : null;
  };
  if (source === "vercel") return first("x-vercel-forwarded-for") ?? first("x-real-ip");
  if (source === "x-real-ip") return first("x-real-ip");
  if (source === "" && env.NODE_ENV !== "production") return "127.0.0.1";
  return null;
}
