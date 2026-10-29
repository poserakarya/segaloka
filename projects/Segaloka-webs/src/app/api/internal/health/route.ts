import { NextResponse } from "next/server";
import { segalokaApiRequest } from "@/lib/api/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await segalokaApiRequest<{
      status: string;
      service: string;
    }>("/health");

    if (health.status !== "ok") {
      return NextResponse.json(
        { status: "unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "connected",
      backend: health.service,
    });
  } catch (error) {
    console.error("[Segaloka API Health]", error);

    return NextResponse.json(
      { status: "unavailable" },
      { status: 503 },
    );
  }
}