import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../lib/client-ip";
import { randomBytes } from "node:crypto";
import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";

// Handoff login Marketplace -> dashboard non-admin (Travel, Vendor, Affiliate,
// Agen, Mitra, Traveler). Dashboard memulai alur dengan ?dashboard=&challenge=
// (challenge = sha256 verifier yang disimpan dashboard di cookie HttpOnly-nya).
// Pengguna yang belum login diarahkan ke login Marketplace existing lalu
// kembali ke sini. Server meminta tiket sekali pakai ke API (sesi pengguna +
// ingress bertanda); API memeriksa role/tenant. Tiket dikirim ke dashboard
// lewat form POST, tidak pernah lewat URL.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DASHBOARDS = ["travel", "vendor", "affiliate", "agen", "mitra", "traveler"] as const;
type Dashboard = (typeof DASHBOARDS)[number];

const DASHBOARD_NAMES: Record<Dashboard, string> = {
  travel: "Travel",
  vendor: "Vendor",
  affiliate: "Affiliate",
  agen: "Agen",
  mitra: "Mitra",
  traveler: "Traveler",
};

const DEFAULT_ORIGINS: Record<Dashboard, string> = {
  travel: "https://travel.dashboard.segaloka.com",
  vendor: "https://vendor.dashboard.segaloka.com",
  affiliate: "https://affiliate.dashboard.segaloka.com",
  agen: "https://agen.dashboard.segaloka.com",
  mitra: "https://mitra.dashboard.segaloka.com",
  traveler: "https://traveler.dashboard.segaloka.com",
};

const HEX64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Origin dashboard: default hostname resmi; SEGALOKA_DASHBOARD_ORIGINS (JSON)
// boleh mengganti. Production wajib https *.segaloka.com; di luar production
// http://127.0.0.1:<port> diizinkan untuk uji lokal terisolasi.
function dashboardOrigin(dashboard: Dashboard): string | null {
  let configured: Record<string, string> = {};
  try {
    configured = JSON.parse(process.env.SEGALOKA_DASHBOARD_ORIGINS || "{}");
  } catch {
    return null;
  }
  const value = configured[dashboard] || DEFAULT_ORIGINS[dashboard];
  try {
    const url = new URL(value);
    const production = process.env.NODE_ENV === "production";
    const secure = url.protocol === "https:" && (url.hostname === "segaloka.com" || url.hostname.endsWith(".segaloka.com"));
    const localTest = !production && url.protocol === "http:" && url.hostname === "127.0.0.1";
    if ((!secure && !localTest) || url.username || url.password || url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
}

function page(title: string, body: string, options: { nonce?: string; formAction?: string } = {}) {
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    options.nonce ? `script-src 'nonce-${options.nonce}'` : "script-src 'none'",
    `form-action ${options.formAction || "'self'"}`,
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  return new NextResponse(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>` +
      `<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f7fb;color:#14243b}main{max-width:420px;padding:24px}a,button{display:block;width:100%;margin-top:10px;padding:12px;border-radius:10px;border:1px solid #d5dbe5;background:#fff;color:inherit;text-align:center;text-decoration:none;font:inherit;cursor:pointer}</style></head>` +
      `<body><main>${body}</main></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // strict-origin: browser tetap mengirim Origin pada form POST ke
        // dashboard (no-referrer membuatnya "null"); path/query tidak dikirim.
        "Referrer-Policy": "strict-origin",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": csp,
      },
    },
  );
}

function loginRedirect(request: NextRequest) {
  const returnTo = request.nextUrl.pathname + request.nextUrl.search;
  // Location relatif: tetap di host Marketplace yang dipakai browser.
  const target = new URLSearchParams({ auth: "login", returnTo });
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/?${target}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function GET(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  const params = request.nextUrl.searchParams;
  const dashboard = params.get("dashboard") as Dashboard | null;
  const challenge = params.get("challenge") || "";
  const organizationId = params.get("organizationId");

  if (!dashboard || !DASHBOARDS.includes(dashboard) || !HEX64.test(challenge) ||
      (organizationId !== null && !UUID.test(organizationId))) {
    return NextResponse.json({ code: "INVALID_HANDOFF_REQUEST" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const origin = dashboardOrigin(dashboard);
  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;
  if (!origin || !baseUrl || !secret || secret.length < 32) {
    return NextResponse.json({ code: "AUTH_CONFIGURATION_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const accessToken = request.cookies.get("segaloka_access")?.value || "";
  if (!HEX64.test(accessToken)) return loginRedirect(request);

  const target = "/auth/dashboard-handoff/tickets";
  const body = Buffer.from(JSON.stringify({ dashboard, challenge, ...(organizationId ? { organizationId } : {}) }), "utf8");
  let status: number;
  let result: { ticket?: string; code?: string; workspaces?: { organizationId: string; organizationName: string }[] };
  try {
    const signature = signIngressRequest(secret, { ip: clientIp, method: "POST", target, body });
    const upstream = await fetch(new URL(target, baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...signature },
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    status = upstream.status;
    result = await upstream.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ code: "HANDOFF_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const name = DASHBOARD_NAMES[dashboard];
  if (status === 401) return loginRedirect(request);
  if (status === 409 && result.code === "WORKSPACE_SELECTION_REQUIRED" && Array.isArray(result.workspaces)) {
    // Pilihan workspace hanya dari organisasi yang dikembalikan API untuk
    // akun ini; pilihan diperiksa ulang oleh API.
    const links = result.workspaces
      .filter(item => UUID.test(item.organizationId))
      .map(item => {
        const next = new URL(request.nextUrl.pathname, request.url);
        next.searchParams.set("dashboard", dashboard);
        next.searchParams.set("challenge", challenge);
        next.searchParams.set("organizationId", item.organizationId);
        return `<a href="${escapeHtml(next.pathname + next.search)}">${escapeHtml(item.organizationName || item.organizationId)}</a>`;
      })
      .join("");
    return page(`Pilih organisasi ${name}`, `<h1>Pilih organisasi</h1><p>Akun Anda terdaftar di lebih dari satu organisasi ${escapeHtml(name)}.</p>${links}`);
  }
  if (status !== 201 || !result.ticket || !HEX64.test(result.ticket)) {
    return page(`Akses ${name}`, `<h1>Akses ditolak</h1><p>Akun Anda tidak memiliki akses ke Dashboard ${escapeHtml(name)}.</p><a href="/">Kembali ke Segaloka</a>`);
  }

  const nonce = randomBytes(16).toString("base64");
  const action = `${origin}/bff/auth/handoff/callback`;
  return page(
    `Membuka Dashboard ${name}`,
    `<form id="handoff" method="post" action="${escapeHtml(action)}"><input type="hidden" name="ticket" value="${result.ticket}"><p>Membuka Dashboard ${escapeHtml(name)}…</p><noscript><button type="submit">Lanjutkan</button></noscript></form>` +
      `<script nonce="${nonce}">document.getElementById('handoff').submit();</script>`,
    { nonce, formAction: origin },
  );
}
