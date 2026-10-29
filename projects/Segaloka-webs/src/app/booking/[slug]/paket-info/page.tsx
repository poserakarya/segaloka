import { AccommodationPackageInfoClient } from "@/components/booking/AccommodationPackageInfoClient";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    periodId?: string;
    startDate?: string;
    endDate?: string;
    traveler?: string;
    roomType?: string;
    rooms?: string;
    pricePerPax?: string;
    total?: string;
    bookingDeadline?: string;
  }>;
};

function positiveInteger(
  value: string | undefined,
  fallback: number,
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return Math.floor(parsed);
}

function positiveNumber(
  value: string | undefined,
  fallback: number,
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return parsed;
}

export default async function PackageInfoPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  return (
    <AccommodationPackageInfoClient
      slug={slug}
      snapshot={{
        periodId: query.periodId ?? "",
        startDate: query.startDate ?? "",
        endDate: query.endDate ?? "",
        traveler: positiveInteger(
          query.traveler,
          1,
        ),
        roomType: query.roomType ?? "quad",
        rooms: positiveInteger(
          query.rooms,
          1,
        ),
        pricePerPax: positiveNumber(
          query.pricePerPax,
          0,
        ),
        total: positiveNumber(
          query.total,
          0,
        ),
        bookingDeadline:
          query.bookingDeadline ?? "",
      }}
    />
  );
}