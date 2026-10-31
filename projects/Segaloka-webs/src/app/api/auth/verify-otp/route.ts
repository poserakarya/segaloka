import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../lib/client-ip";
import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyResult = {
  authenticated?: boolean;
  code?: string;
  session?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export async function POST(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { authenticated: false, message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { authenticated: false, message: "Data OTP tidak valid." },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;
  const challengeId = data.challengeId;
  const code = data.code;

  if (
    typeof challengeId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId) ||
    typeof code !== "string" ||
    !/^[0-9]{6}$/.test(code)
  ) {
    return NextResponse.json(
      { authenticated: false, message: "Kode OTP tidak valid." },
      { status: 400 },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const originSecret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!baseUrl || !originSecret || originSecret.length < 32) {
    return NextResponse.json(
      { authenticated: false, message: "Layanan OTP belum tersedia." },
      { status: 503 },
    );
  }

  try {
    const verifyUrl = new URL("/auth/login/verify-otp", baseUrl);
    const verifyBody = Buffer.from(
      JSON.stringify({ challengeId, code }),
      "utf8",
    );
    const verifySignature = signIngressRequest(originSecret, {
      ip: clientIp,
      method: "POST",
      target: verifyUrl.pathname + verifyUrl.search,
      body: verifyBody,
    });

    const response = await fetch(
      verifyUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...verifySignature,
        },
        body: verifyBody,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.status === 401) {
      return NextResponse.json(
        {
          authenticated: false,
          code: "INVALID_OR_EXPIRED_OTP",
          message: "Kode OTP salah atau kedaluwarsa.",
        },
        { status: 401 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Verifikasi OTP belum dapat diproses.",
        },
        { status: 502 },
      );
    }

    const result = (await response.json()) as VerifyResult;
    const accessToken = result.session?.accessToken;
    const refreshToken = result.session?.refreshToken;

    if (
      result.authenticated !== true ||
      !accessToken ||
      !refreshToken
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Sesi autentikasi tidak valid.",
        },
        { status: 502 },
      );
    }

    // sg-marketplace-me-v1
    const meUrl = new URL("/auth/me", baseUrl);
    const meSignature = signIngressRequest(originSecret, {
      ip: clientIp,
      method: "GET",
      target: meUrl.pathname + meUrl.search,
      body: Buffer.alloc(0),
    });

    const accessResponse = await fetch(
      meUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...meSignature,
        },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!accessResponse.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Sesi pengguna belum dapat diverifikasi.",
        },
        { status: 502 },
      );
    }

    const access = (await accessResponse.json()) as {
      authenticated?: boolean;
      user?: {
        id?: string;
        email?: string;
        fullName?: string;
      };
    };

    if (
      access.authenticated !== true ||
      !access.user?.id
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Sesi pengguna tidak valid.",
        },
        { status: 403 },
      );
    }

    const resultResponse = NextResponse.json(
      {
        authenticated: true,
        user: access.user,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );

    const hostname = request.nextUrl.hostname;
const isLocalHttp =
  request.nextUrl.protocol === "http:" &&
  (hostname === "127.0.0.1" || hostname === "localhost");

const secure =
  process.env.NODE_ENV === "production" && !isLocalHttp;

    resultResponse.cookies.set("segaloka_access", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });

    resultResponse.cookies.set("segaloka_refresh", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api/auth",
    });

    return resultResponse;
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        message: "Tidak dapat menghubungi layanan autentikasi.",
      },
      { status: 503 },
    );
  }
}