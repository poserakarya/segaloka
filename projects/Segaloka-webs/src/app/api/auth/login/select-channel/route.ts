import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../../lib/client-ip";
import { signIngressRequest } from "../../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { authenticated: false, code: "INVALID_REQUEST" },
      { status: 400, headers },
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json(
      { authenticated: false, code: "INVALID_REQUEST" },
      { status: 400, headers },
    );
  }

  const input = data as Record<string, unknown>;
  const ticket = input.preAuthTicket;
  const channel = input.channel;

  if (
    typeof ticket !== "string" ||
    !/^[0-9a-f]{64}$/.test(ticket) ||
    !["email", "whatsapp"].includes(String(channel))
  ) {
    return NextResponse.json(
      { authenticated: false, code: "INVALID_REQUEST" },
      { status: 400, headers },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!baseUrl || !secret || secret.length < 32) {
    return NextResponse.json(
      { authenticated: false, code: "AUTH_CONFIGURATION_UNAVAILABLE" },
      { status: 503, headers },
    );
  }

  try {
    const url = new URL("/auth/login/select-channel", baseUrl);
    const payload = Buffer.from(
      JSON.stringify({ preAuthTicket: ticket, channel }),
      "utf8",
    );

    const signature = signIngressRequest(secret, {
      ip: clientIp,
      method: "POST",
      target: url.pathname + url.search,
      body: payload,
    });

    const response = await fetch(url, {
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
          code: "OTP_CHANNEL_SELECTION_FAILED",
        },
        { status: response.status >= 500 ? 502 : response.status, headers },
      );
    }

    const result: unknown = await response.json();

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return NextResponse.json(
        { authenticated: false, code: "INVALID_AUTH_RESPONSE" },
        { status: 502, headers },
      );
    }

    const value = result as Record<string, unknown>;

    if (
      value.authenticated !== false ||
      value.code !== "OTP_REQUIRED" ||
      typeof value.challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(value.challengeId)
    ) {
      return NextResponse.json(
        { authenticated: false, code: "INVALID_AUTH_RESPONSE" },
        { status: 502, headers },
      );
    }

    return NextResponse.json(
      {
        authenticated: false,
        code: "OTP_REQUIRED",
        challengeId: value.challengeId,
        channel,
        expiresIn: value.expiresIn,
      },
      { status: 200, headers },
    );
  } catch {
    return NextResponse.json(
      { authenticated: false, code: "AUTH_SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}