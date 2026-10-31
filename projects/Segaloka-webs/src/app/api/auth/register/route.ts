import { NextRequest, NextResponse } from "next/server";
import { clientIpUnavailable, requestClientIp } from "../../../../lib/client-ip";
import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { accepted: false, message: "Format permintaan tidak valid." },
      { status: 400, headers: noStore },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { accepted: false, message: "Data pendaftaran tidak valid." },
      { status: 400, headers: noStore },
    );
  }

  const input = body as Record<string, unknown>;
  const allowed = new Set([
    "email",
    "fullName",
    "password",
    "phoneE164",
  ]);

  if (Object.keys(input).some((key) => !allowed.has(key))) {
    return NextResponse.json(
      { accepted: false, message: "Field pendaftaran tidak diizinkan." },
      { status: 400, headers: noStore },
    );
  }

  const { email, fullName, password, phoneE164 } = input;

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof fullName !== "string" ||
    fullName.trim().length < 2 ||
    fullName.trim().length > 150 ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    typeof phoneE164 !== "string" ||
    !/^\+[1-9][0-9]{7,14}$/.test(phoneE164)
  ) {
    return NextResponse.json(
      { accepted: false, message: "Data pendaftaran tidak valid." },
      { status: 400, headers: noStore },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const originSecret = process.env.INGRESS_IDENTITY_SECRET;

  if (!baseUrl || !originSecret || originSecret.length < 32) {
    return NextResponse.json(
      { accepted: false, message: "Layanan pendaftaran belum tersedia." },
      { status: 503, headers: noStore },
    );
  }

  try {
    const target = "/auth/register";
    const bytes = Buffer.from(JSON.stringify({
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      password,
      phoneE164,
    }), "utf8");

    const signature = signIngressRequest(originSecret, {
      ip: clientIp,
      method: "POST",
      target,
      body: bytes,
    });

    const response = await fetch(
      new URL(target, baseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...signature,
        },
        body: bytes,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.status === 202) {
      return NextResponse.json(
        {
          accepted: true,
          message:
            "Jika pendaftaran dapat diproses, instruksi verifikasi akan dikirim ke email.",
        },
        { status: 202, headers: noStore },
      );
    }

    if (response.status === 429) {
      return NextResponse.json(
        {
          accepted: false,
          message: "Terlalu banyak percobaan. Silakan coba lagi nanti.",
        },
        { status: 429, headers: noStore },
      );
    }

    if (response.status === 400) {
      return NextResponse.json(
        { accepted: false, message: "Data pendaftaran tidak valid." },
        { status: 400, headers: noStore },
      );
    }

    return NextResponse.json(
      { accepted: false, message: "Layanan pendaftaran sedang mengalami gangguan." },
      { status: 502, headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { accepted: false, message: "Tidak dapat menghubungi layanan pendaftaran." },
      { status: 503, headers: noStore },
    );
  }
}