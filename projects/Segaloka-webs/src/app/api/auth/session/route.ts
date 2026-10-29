import { signIngressRequest } from "../../../../lib/segaloka-ingress-v3.mjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = {
  "Cache-Control": "no-store",
};

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("segaloka_access")?.value;

  if (!accessToken || !/^[0-9a-f]{64}$/.test(accessToken)) {
    return NextResponse.json(
      { authenticated: false, code: "AUTH_REQUIRED" },
      { status: 401, headers: noStore },
    );
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const originSecret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!baseUrl || !originSecret || originSecret.length < 32) {
    return NextResponse.json(
      {
        authenticated: false,
        code: "AUTH_CONFIGURATION_UNAVAILABLE",
      },
      { status: 503, headers: noStore },
    );
  }

  try {
    const sessionUrl = new URL("/auth/me", baseUrl);
    const sessionSignature = signIngressRequest(originSecret, {
      ip: "127.0.0.1",
      method: "GET",
      target: sessionUrl.pathname + sessionUrl.search,
      body: Buffer.alloc(0),
    });
    const response = await fetch(
      sessionUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...sessionSignature,
        },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.status === 401) {
      return NextResponse.json(
        { authenticated: false, code: "INVALID_SESSION" },
        { status: 401, headers: noStore },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          code: "AUTH_SERVICE_UNAVAILABLE",
        },
        { status: 503, headers: noStore },
      );
    }

    const result = (await response.json()) as {
      authenticated?: boolean;
      user?: {
        id?: string;
        email?: string;
        fullName?: string;
        status?: string;
      };
      memberships?: Array<{
        role: string;
        organizationId?: string | null;
      }>;
    };

    if (
      result.authenticated !== true ||
      typeof result.user?.id !== "string"
    ) {
      return NextResponse.json(
        { authenticated: false, code: "INVALID_SESSION" },
        { status: 401, headers: noStore },
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: result.user,
        memberships: result.memberships ?? [],
      },
      { status: 200, headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        code: "AUTH_SERVICE_UNAVAILABLE",
      },
      { status: 503, headers: noStore },
    );
  }
}