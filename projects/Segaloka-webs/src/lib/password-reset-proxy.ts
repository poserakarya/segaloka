import { NextRequest, NextResponse } from "next/server";
import { signIngressRequest } from "./segaloka-ingress-v3.mjs";
import { clientIpUnavailable, requestClientIp } from "./client-ip";

export async function passwordResetProxy(
  request: NextRequest,
  action: "forgot" | "reset" | "verify",
) {
  const clientIp = requestClientIp(request);
  if (!clientIp) return clientIpUnavailable();
  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.INGRESS_IDENTITY_SECRET;

  if (!baseUrl || !secret || secret.length < 32) {
    return NextResponse.json(
      { code: "SERVICE_UNAVAILABLE", message: "Layanan belum tersedia." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const fields = payload as Record<string, unknown>;
  let body: Record<string, string>;

  if (action === "forgot") {
    const email = fields.email;

    if (
      Object.keys(fields).length !== 1 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { code: "INVALID_EMAIL" },
        { status: 400 },
      );
    }

    body = { email: email.trim() };
  } else if (action === "verify") {
    const { challengeId, code } = fields;

    if (
      Object.keys(fields).length !== 2 ||
      typeof challengeId !== "string" ||
      !/^[0-9a-f]{32}$/.test(challengeId) ||
      typeof code !== "string" ||
      !/^[0-9]{6}$/.test(code)
    ) {
      return NextResponse.json(
        { code: "INVALID_OTP_REQUEST" },
        { status: 400 },
      );
    }

    body = { challengeId, code };
  } else {
    const { token, newPassword } = fields;

    if (
      Object.keys(fields).length !== 2 ||
      typeof token !== "string" ||
      !/^[0-9a-f]{64}$/.test(token) ||
      typeof newPassword !== "string" ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      return NextResponse.json(
        { code: "INVALID_RESET_REQUEST" },
        { status: 400 },
      );
    }

    body = { token, newPassword };
  }

  const target = `/auth/password/${action}`;
  const bytes = Buffer.from(JSON.stringify(body), "utf8");

  try {
    const url = new URL(target, baseUrl);

    // IP klien dari sumber proxy tepercaya (lib/client-ip), bukan klaim browser.
    const signature = signIngressRequest(secret, {
      ip: clientIp,
      method: "POST",
      target,
      body: bytes,
    });

    const upstream = await fetch(url, {
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
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { code: "SERVICE_UNAVAILABLE", message: "Koneksi layanan gagal." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}