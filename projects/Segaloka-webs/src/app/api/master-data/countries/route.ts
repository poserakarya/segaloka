import { NextResponse } from "next/server";
import { segalokaApiRequest } from "../../../../lib/api/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await segalokaApiRequest<{ items: Record<string, any>[] }>(
      "/master-data/countries"
    );
    return NextResponse.json({
      ...data,
      items: data.items.map(({ phonecode, ...item }) => ({
        ...item,
        phoneCode: item.phoneCode ?? phonecode ?? null,
      })),
    });
  } catch (error) {
    console.error("MASTER_COUNTRIES_FAILED", error);
    return NextResponse.json(
      { code: "MASTER_COUNTRIES_UNAVAILABLE" },
      { status: 503 }
    );
  }
}