import { NextRequest } from "next/server";
import { passwordResetProxy } from "../../../../../lib/password-reset-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return passwordResetProxy(request, "forgot");
}