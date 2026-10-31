import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../../lib/client-ip";
import { signIngressRequest } from "../../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

type ExchangeResult = {
  authenticated?: boolean;
  user?: { id?: string };
  session?: { accessToken?: string; refreshToken?: string };
};

export async function GET(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  const code = request.nextUrl.searchParams.get("code");
  if (!code || !/^[0-9a-f]{64}$/.test(code)) {
    return NextResponse.redirect(new URL("/masuk?error=google_invalid_code", request.url));
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.INGRESS_IDENTITY_SECRET;
  if (!baseUrl || !secret || secret.length < 32) {
    return NextResponse.json({ authenticated: false, code: "AUTH_CONFIGURATION_UNAVAILABLE" }, { status: 503, headers: noStore });
  }

  const target = "/auth/google/exchange";
  const bytes = Buffer.from(JSON.stringify({ code }), "utf8");

  try {
    const signature = signIngressRequest(secret, {
      ip: clientIp,
      method: "POST",
      target,
      body: bytes,
    });
    const upstream = await fetch(new URL(target, baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        ...signature,
      },
      body: bytes,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const result = (await upstream.json().catch(() => ({}))) as ExchangeResult;
    const accessToken = result.session?.accessToken;
    const refreshToken = result.session?.refreshToken;
    if (!upstream.ok || result.authenticated !== true ||
        !result.user?.id || !accessToken || !refreshToken ||
        !/^[0-9a-f]{64}$/.test(accessToken) ||
        !/^[0-9a-f]{64}$/.test(refreshToken)) {
      return NextResponse.redirect(new URL("/masuk?error=google_exchange_failed", request.url));
    }

    const response = NextResponse.redirect(new URL("/", request.url));
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("segaloka_access", accessToken, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 900,
    });
    response.cookies.set("segaloka_refresh", refreshToken, {
      httpOnly: true, secure, sameSite: "lax", path: "/api/auth",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/masuk?error=google_exchange_unavailable", request.url));
  }
}
