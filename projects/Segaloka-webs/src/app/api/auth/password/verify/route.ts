import { NextRequest } from "next/server";
import { passwordResetProxy } from "@/lib/password-reset-proxy";

export async function POST(request: NextRequest) {
  return passwordResetProxy(request, "verify");
}