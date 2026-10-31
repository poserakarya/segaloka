import "server-only";
import { NextResponse } from "next/server";
import { requestClientIp as resolveClientIp } from "./client-ip-source.mjs";

// IP klien untuk tanda tangan ingress; aturan sumber di client-ip-source.mjs.
export function requestClientIp(request: Request): string | null {
  return resolveClientIp(request);
}

export function clientIpUnavailable() {
  return NextResponse.json(
    { code: "CLIENT_IP_UNAVAILABLE" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
