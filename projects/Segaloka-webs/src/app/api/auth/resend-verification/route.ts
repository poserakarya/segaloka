import { NextRequest, NextResponse } from "next/server";
import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { accepted: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { accepted: false, code: "INVALID_REQUEST" },
      { status: 400, headers: noStore },
    );
  }

  const fields = payload as Record<string, unknown>;

  if (
    Object.keys(fields).length !== 1 ||
    typeof fields.email !== "string" ||
    fields.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
  ) {
    return NextResponse.json(
      { accepted: false, code: "INVALID_EMAIL" },
      { status: 400, headers: noStore },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.INGRESS_IDENTITY_SECRET;

  if (!baseUrl || !secret || secret.length < 32) {
    return NextResponse.json(
      { accepted: false, code: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }

  const target = "/auth/resend-verification";
  const bytes = Buffer.from(
    JSON.stringify({ email: fields.email.trim().toLowerCase() }),
    "utf8",
  );

  try {
    const signature = signIngressRequest(secret, {
      ip: "127.0.0.1",
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
      signal: AbortSignal.timeout(20000),
    });

    if (upstream.status === 202) {
      return NextResponse.json(
        {
          accepted: true,
          message: "Jika akun memenuhi syarat, email verifikasi akan dikirim.",
        },
        { status: 202, headers: noStore },
      );
    }

    if (upstream.status === 400) {
      return NextResponse.json(
        { accepted: false, code: "INVALID_EMAIL" },
        { status: 400, headers: noStore },
      );
    }

    return NextResponse.json(
      { accepted: false, code: "SERVICE_UNAVAILABLE" },
      { status: 502, headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { accepted: false, code: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }
}