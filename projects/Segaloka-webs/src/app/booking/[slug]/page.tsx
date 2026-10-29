import {
  BookingFormClient,
} from "@/components/booking/BookingFormClient";

type BookingPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    adult?: string;
    child?: string;
    infant?: string;
    type?: string;

    periodId?: string;
    startDate?: string;
    endDate?: string;
    traveler?: string;
    roomType?: string;
    rooms?: string;
    pricePerPax?: string;
    total?: string;
    bookingDeadline?: string;

    country?: string;
    visaProduct?: string;
    vendor?: string;
    applicants?: string;
    paymentTerm?: string;
    departureDate?: string;
    returnDate?: string;
  }>;
};

function parseTravelerCount(
  value: string | undefined,
  fallback: number,
) {
  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return fallback;
  }

  const parsed =
    Number.parseInt(value, 10);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return parsed;
}

function parsePositiveNumber(
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

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const adult = Math.max(
    1,
    parseTravelerCount(
      query.adult,
      1,
    ),
  );

  const child =
    parseTravelerCount(
      query.child,
      0,
    );

  const infant =
    parseTravelerCount(
      query.infant,
      0,
    );

  const accommodationSnapshot =
    query.type === "accommodation"
      ? {
          periodId:
            query.periodId ?? "",
          startDate:
            query.startDate ?? "",
          endDate:
            query.endDate ?? "",
          traveler:
            parsePositiveNumber(
              query.traveler,
              adult + child + infant,
            ),
          roomType:
            query.roomType ?? "quad",
          rooms: Math.max(
            1,
            parsePositiveNumber(
              query.rooms,
              1,
            ),
          ),
          pricePerPax:
            parsePositiveNumber(
              query.pricePerPax,
              0,
            ),
          total:
            parsePositiveNumber(
              query.total,
              0,
            ),
          bookingDeadline:
            query.bookingDeadline ?? "",
        }
      : undefined;

  const visaSnapshot: {
    country: string;
    productSlug: string;
    vendorSlug: string;
    applicants: number;
    paymentTerm: "full" | "dp";
    departureDate: string;
    returnDate: string;
  } | undefined =
    query.type === "visa"
      ? {
          country:
            query.country ?? "",
          productSlug:
            query.visaProduct ??
            slug,
          vendorSlug:
            query.vendor ?? "",
          applicants: Math.max(
            1,
            parsePositiveNumber(
              query.applicants,
              1,
            ),
          ),
          paymentTerm:
            query.paymentTerm === "dp"
              ? ("dp" as const)
              : ("full" as const),
          departureDate:
            query.departureDate ??
            query.startDate ??
            "",
          returnDate:
            query.returnDate ??
            query.endDate ??
            "",
        }
      : undefined;

  return (
    <BookingFormClient
      slug={slug}
      adult={adult}
      child={child}
      infant={infant}
      productType={query.type}
      accommodationSnapshot={
        accommodationSnapshot
      }
      visaSnapshot={visaSnapshot}
    />
  );
}