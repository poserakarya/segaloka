import {
  notFound,
  redirect,
} from "next/navigation";

import { cookies } from "next/headers";

// sg-package-auth-guard-v1
export const dynamic = "force-dynamic";

import {
  featuredPackages,
} from "@/data/home";

import {
  PackageDetailClient,
} from "@/components/package/PackageDetailClient";


type Props = {
  params: Promise<{
    slug: string;
  }>;
};


export default async function PackageDetailPage({
  params,
}: Props) {
  const {
    slug,
  } = await params;

  // Validasi sesi sebelum detail paket diberikan.
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("segaloka_access")?.value;

  const returnTo = `/paket/${encodeURIComponent(slug)}`;
  const loginUrl =
    `/?auth=login&returnTo=${encodeURIComponent(returnTo)}`;

  if (!accessToken) {
    redirect(loginUrl);
  }

  const baseUrl = process.env.SEGALOKA_API_BASE_URL;
  const originSecret = process.env.SEGALOKA_ORIGIN_AUTH_SECRET;

  if (!baseUrl || !originSecret || originSecret.length < 32) {
    throw new Error("SEGALOKA_AUTH_CONFIGURATION_REQUIRED");
  }

  let authenticated = false;

  try {
    const response = await fetch(
      new URL("/auth/me", baseUrl),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-segaloka-origin-auth": originSecret,
        },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.ok) {
      const result = await response.json() as {
        authenticated?: boolean;
      };

      authenticated = result.authenticated === true;
    } else if (response.status !== 401) {
      throw new Error("SEGALOKA_AUTH_SERVICE_UNAVAILABLE");
    }
  } catch {
    throw new Error("SEGALOKA_AUTH_SERVICE_UNAVAILABLE");
  }

  if (!authenticated) {
    redirect(loginUrl);
  }
  const item =
    featuredPackages.find(
      (packageItem) =>
        packageItem.id ===
        slug,
    );

  if (!item) {
    notFound();
  }

  const recommendations =
    featuredPackages
      .filter(
        (packageItem) =>
          packageItem.id !==
          item.id,
      )
      .slice(
        0,
        4,
      );

  return (
    <PackageDetailClient
      item={item}
      recommendations={
        recommendations
      }
    />
  );
}