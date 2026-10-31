import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../../lib/client-ip";
import { signIngressRequest } from "../../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

type AuthResult = {
  authenticated?: boolean;
  session?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export async function POST(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { authenticated: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json(
      { authenticated: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  const data = input as Record<string, unknown>;
  const ticket = data.preAuthTicket;
  const code = data.code;

  if (
    typeof ticket !== "string" ||
    !/^[0-9a-f]{64}$/.test(ticket) ||
    typeof code !== "string" ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return NextResponse.json(
      { authenticated: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!baseUrl || !secret || secret.length < 32) {
    return NextResponse.json(
      { authenticated: false, code: "AUTH_CONFIGURATION_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }

  try {
    const verifyUrl = new URL("/auth/login/verify-authenticator", baseUrl);
    const payload = Buffer.from(
      JSON.stringify({ preAuthTicket: ticket, code }),
      "utf8",
    );

    const signature = signIngressRequest(secret, {
      ip: clientIp,
      method: "POST",
      target: verifyUrl.pathname + verifyUrl.search,
      body: payload,
    });

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...signature,
      },
      body: payload,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          code:
            response.status === 401
              ? "INVALID_OR_EXPIRED_AUTHENTICATOR"
              : "AUTHENTICATOR_VERIFICATION_FAILED",
        },
        {
          status: response.status >= 500 ? 502 : response.status,
          headers: noStore,
        },
      );
    }

    const result = (await response.json()) as AuthResult;
    const accessToken = result.session?.accessToken;
    const refreshToken = result.session?.refreshToken;

    if (
      result.authenticated !== true ||
      typeof accessToken !== "string" ||
      !/^[0-9a-f]{64}$/.test(accessToken) ||
      typeof refreshToken !== "string" ||
      !/^[0-9a-f]{64}$/.test(refreshToken)
    ) {
      return NextResponse.json(
        { authenticated: false, code: "INVALID_AUTH_RESPONSE" },
        { status: 502, headers: noStore },
      );
    }

    const meUrl = new URL("/auth/me", baseUrl);
    const meSignature = signIngressRequest(secret, {
      ip: clientIp,
      method: "GET",
      target: meUrl.pathname + meUrl.search,
      body: Buffer.alloc(0),
    });

    const meResponse = await fetch(meUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...meSignature,
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { authenticated: false, code: "SESSION_VERIFICATION_FAILED" },
        { status: 502, headers: noStore },
      );
    }

    const me = (await meResponse.json()) as {
      authenticated?: boolean;
      user?: {
        id?: string;
        email?: string;
        fullName?: string;
      };
    };

    if (me.authenticated !== true || !me.user?.id) {
      return NextResponse.json(
        { authenticated: false, code: "INVALID_SESSION" },
        { status: 403, headers: noStore },
      );
    }

    const output = NextResponse.json(
      { authenticated: true, user: me.user },
      { status: 200, headers: noStore },
    );

    const hostname = request.nextUrl.hostname;
const isLocalHttp =
  request.nextUrl.protocol === "http:" &&
  (hostname === "127.0.0.1" || hostname === "localhost");

const secure =
  process.env.NODE_ENV === "production" && !isLocalHttp;

    output.cookies.set("segaloka_access", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });

    output.cookies.set("segaloka_refresh", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/auth",
    });

    return output;
  } catch {
    return NextResponse.json(
      { authenticated: false, code: "AUTH_SERVICE_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }
}