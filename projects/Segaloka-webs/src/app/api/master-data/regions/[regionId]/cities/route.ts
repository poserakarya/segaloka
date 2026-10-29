import { NextResponse } from "next/server";
import { segalokaApiRequest } from "../../../../../../lib/api/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ regionId: string }> }
) {
  const { regionId } = await context.params;

  if (!/^[0-9a-fA-F-]{36}$/.test(regionId)) {
    return NextResponse.json(
      { code: "INVALID_REGION_ID" },
      { status: 400 }
    );
  }

  try {
    const data = await segalokaApiRequest<{ items: unknown[] }>(
      `/master-data/regions/${regionId}/cities`
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("MASTER_CITIES_FAILED", error);
    return NextResponse.json(
      { code: "MASTER_CITIES_UNAVAILABLE" },
      { status: 503 }
    );
  }
}