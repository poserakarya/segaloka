import { NextResponse } from "next/server";
import { segalokaApiRequest } from "../../../../../../lib/api/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ countryId: string }> }
) {
  const { countryId } = await context.params;

  if (!/^[0-9a-fA-F-]{36}$/.test(countryId)) {
    return NextResponse.json(
      { code: "INVALID_COUNTRY_ID" },
      { status: 400 }
    );
  }

  try {
    const data = await segalokaApiRequest<{ items: Record<string, any>[] }>(
      `/master-data/countries/${countryId}/regions`
    );
    return NextResponse.json({
      ...data,
      items: data.items.map(({ regiontype, ...item }) => ({
        ...item,
        regionType: item.regionType ?? regiontype ?? null,
      })),
    });
  } catch (error) {
    console.error("MASTER_REGIONS_FAILED", error);
    return NextResponse.json(
      { code: "MASTER_REGIONS_UNAVAILABLE" },
      { status: 503 }
    );
  }
}