import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";
import { clientIpUnavailable, requestClientIp } from "../../../../lib/client-ip";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginResult = {
  authenticated?: boolean;
  code?: string;
  challengeId?: string;
  channel?: string;
  preAuthTicket?: string;
  availableMethods?: string[];
  expiresIn?: number;
  message?: string;
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

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { authenticated: false, message: "Data login tidak valid." },
      { status: 400 },
    );
  }

  const credentials = body as Record<string, unknown>;

  const email =
    typeof credentials.email === "string"
      ? credentials.email.trim()
      : "";

  const password =
    typeof credentials.password === "string"
      ? credentials.password
      : "";

  const rawLanguage = credentials.language;
  const language =
    rawLanguage === "ID" ||
    rawLanguage === "EN" ||
    rawLanguage === "AR"
      ? rawLanguage
      : rawLanguage === undefined
        ? "ID"
        : null;

  if (!language) {
    return NextResponse.json(
      { authenticated: false, message: "Bahasa tidak valid." },
      { status: 400 },
    );
  }

  if (!email || !password || password.length > 128) {
    return NextResponse.json(
      { authenticated: false, message: "Email atau password tidak valid." },
      { status: 400 },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const originSecret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!baseUrl || !originSecret || originSecret.length < 32) {
    return NextResponse.json(
      { authenticated: false, message: "Layanan login belum tersedia." },
      { status: 503 },
    );
  }

  try {
    const url = new URL("/auth/login", baseUrl);

    const requestBody = Buffer.from(
      JSON.stringify({ email, password, language }),
      "utf8",
    );

    const signature = signIngressRequest(originSecret, {
      ip: clientIp,
      method: "POST",
      target: url.pathname + url.search,
      body: requestBody,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...signature,
      },
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Terlalu banyak percobaan login. Coba lagi nanti.",
        },
        { status: 429 },
      );
    }

    if (response.status === 401) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Email atau password tidak valid.",
        },
        { status: 401 },
      );
    }

    if (!response.ok) {
      const backendError: unknown = await response
        .clone()
        .json()
        .catch(() => null);

      const backendCode =
        backendError !== null &&
        typeof backendError === "object" &&
        "code" in backendError &&
        typeof backendError.code === "string"
          ? backendError.code
          : "UNKNOWN";

      console.error("[Segaloka Login Diagnostic]", {
        backendStatus: response.status,
        backendCode,
      });
      return NextResponse.json(
        {
          authenticated: false,
          message: "Layanan login sedang mengalami gangguan.",
        },
        { status: 502 },
      );
    }

    const result = (await response.json()) as LoginResult;

    if (
      result.authenticated === false &&
      result.code === "OTP_REQUIRED" &&
      typeof result.challengeId === "string" &&
      result.channel === "email"
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          code: "OTP_REQUIRED",
          challengeId: result.challengeId,
          channel: result.channel,
          expiresIn: result.expiresIn,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    if (
      result.authenticated === false &&
      result.code === "OTP_CHANNEL_REQUIRED" &&
      typeof result.preAuthTicket === "string" &&
      /^[0-9a-f]{64}$/.test(result.preAuthTicket) &&
      Array.isArray(result.availableMethods) &&
      result.availableMethods.length > 0 &&
      result.availableMethods.every(
        (method) =>
          typeof method === "string" &&
          ["authenticator", "email", "whatsapp", "sms"].includes(method),
      )
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          code: "OTP_CHANNEL_REQUIRED",
          preAuthTicket: result.preAuthTicket,
          availableMethods: result.availableMethods,
          expiresIn: result.expiresIn,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
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
          message: "Sesi login tidak valid.",
        },
        { status: 502 },
      );
    }

    const accessUrl = new URL("/dashboard/access", baseUrl);
    const accessSignature = signIngressRequest(originSecret, {
      ip: clientIp,
      method: "GET",
      target: accessUrl.pathname + accessUrl.search,
      body: Buffer.alloc(0),
    });

    const accessResponse = await fetch(accessUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...accessSignature,
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (!accessResponse.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Hak akses akun belum dapat diverifikasi.",
        },
        { status: 502 },
      );
    }

    const access = await accessResponse.json() as {
      authenticated?: boolean;
      dashboards?: Array<{
        dashboard: string;
        role: string;
        organizationId?: string | null;
      }>;
    };

    if (
      access.authenticated !== true ||
      !Array.isArray(access.dashboards)
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Hak akses akun tidak valid.",
        },
        { status: 403 },
      );
    }

    const resultResponse = NextResponse.json({
      authenticated: true,
      dashboards: access.dashboards,
    });

    const hostname = request.nextUrl.hostname;
const isLocalHttp =
  request.nextUrl.protocol === "http:" &&
  (hostname === "127.0.0.1" || hostname === "localhost");

const secure =
  process.env.NODE_ENV === "production" && !isLocalHttp;

    resultResponse.cookies.set(
      "segaloka_access",
      accessToken,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 900,
      },
    );

    resultResponse.cookies.set(
      "segaloka_refresh",
      refreshToken,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/api/auth",
      },
    );

    return resultResponse;
  } catch (error) {
    console.error("[Segaloka Website Login]", error);

    return NextResponse.json(
      {
        authenticated: false,
        message: "Tidak dapat menghubungi layanan login.",
      },
      { status: 503 },
    );
  }
}