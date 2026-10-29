import { AccommodationTravelerClient } from "@/components/booking/AccommodationTravelerClient";

type Props = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    periodId?: string;
    traveler?: string;
    startDate?: string;
    endDate?: string;
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

export default async function AccommodationTravelerPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const query = await searchParams;

  return (
    <AccommodationTravelerClient
      slug={slug}
      travelerCount={positiveInteger(
        query.traveler,
        1,
      )}
      startDate={query.startDate}
      endDate={query.endDate}
      roomType={query.roomType}
      rooms={positiveInteger(
        query.rooms,
        1,
      )}
      snapshot={{
        periodId: query.periodId ?? "",
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