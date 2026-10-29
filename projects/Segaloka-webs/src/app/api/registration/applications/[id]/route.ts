import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get("segaloka_access")?.value;
  const base = process.env.SEGALOKA_API_BASE_URL;
  const secret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  }

  if (!base || !secret || secret.length < 32) {
    return NextResponse.json(
      { code: "AUTH_CONFIGURATION_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { code: "INVALID_APPLICATION_ID" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      new URL(`/registration/applications/${id}`, base),
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-segaloka-origin-auth": secret,
          "content-type": "application/json",
        },
        body: await request.text(),
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { code: "REGISTRATION_API_UNAVAILABLE" },
      { status: 502 },
    );
  }
}