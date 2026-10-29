import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = (await cookies()).get("segaloka_access")?.value;
  const base = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  if (!base || !secret || secret.length < 32) return NextResponse.json({ code: "AUTH_CONFIGURATION_UNAVAILABLE" }, { status: 503 });
  const target = new URL(request.url).pathname.endsWith("/draft") ? "/registration/documents/draft" : "/registration/documents";
  const response = await fetch(new URL(target, base), { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-segaloka-origin-auth": secret, "content-type": "application/json" }, body: await request.text(), cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15000) });
  return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
}
