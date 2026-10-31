import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../lib/client-ip";
import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.INGRESS_IDENTITY_SECRET;

  if (!baseUrl || !secret || secret.length < 32) {
    return NextResponse.json(
      { verified: false, code: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { verified: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return NextResponse.json(
      { verified: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  const fields = payload as Record<string, unknown>;

  if (
    Object.keys(fields).length !== 1 ||
    typeof fields.token !== "string" ||
    !/^[0-9a-f]{64}$/.test(fields.token)
  ) {
    return NextResponse.json(
      { verified: false, code: "INVALID_VERIFICATION_TOKEN" },
      { status: 400, headers: noStore },
    );
  }

  const target = "/auth/verify-email";
  const bytes = Buffer.from(
    JSON.stringify({ token: fields.token }),
    "utf8",
  );

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
        ...signature,
      },
      body: bytes,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    const result = await upstream.json().catch(() => ({}));

    return NextResponse.json(result, {
      status: upstream.status,
      headers: noStore,
    });
  } catch {
    return NextResponse.json(
      { verified: false, code: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }
}