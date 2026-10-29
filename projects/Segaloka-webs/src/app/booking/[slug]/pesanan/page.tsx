import { AccommodationOrderClient } from "@/components/booking/AccommodationOrderClient";
import {
  VisaOrderClient,
  type VisaOrderSnapshot,
} from "@/components/booking/visa/VisaOrderClient";

type Props = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    type?: string;

    // Visa
    country?: string;
    visaProduct?: string;
    vendor?: string;
    applicants?: string;
    paymentTerm?: string;
    paymentStatus?: string;
    progressStage?: string;
    completedAt?: string;

    // Accommodation
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

function parseVisaPaymentTerm(
  value: string | undefined,
): VisaOrderSnapshot["paymentTerm"] {
  return value === "dp"
    ? "dp"
    : "full";
}

function parseVisaPaymentStatus(
  value: string | undefined,
): VisaOrderSnapshot["paymentStatus"] {
  return value === "confirmed"
    ? "confirmed"
    : "pending";
}

function parseVisaProgressStage(
  value: string | undefined,
): VisaOrderSnapshot["progressStage"] {
  switch (value) {
    case "payment":
    case "consultation":
    case "documents":
    case "submission":
    case "result":
    case "completed":
      return value;

    default:
      return undefined;
  }
}

function resolveVisaPaymentStatus(
  paymentStatus: string | undefined,
  progressStage: VisaOrderSnapshot["progressStage"],
): VisaOrderSnapshot["paymentStatus"] {
  if (
    progressStage &&
    progressStage !== "payment"
  ) {
    return "confirmed";
  }

  return parseVisaPaymentStatus(
    paymentStatus,
  );
}

export default async function BookingOrderPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const query = await searchParams;

  if (query.type === "visa") {
    const progressStage =
      parseVisaProgressStage(
        query.progressStage,
      );

    const snapshot: VisaOrderSnapshot = {
      country: query.country ?? "",
      productSlug:
        query.visaProduct ?? slug,
      vendorSlug:
        query.vendor ?? "",
      applicants: positiveInteger(
        query.applicants,
        1,
      ),
      paymentTerm:
        parseVisaPaymentTerm(
          query.paymentTerm,
        ),
      paymentStatus:
        resolveVisaPaymentStatus(
          query.paymentStatus,
          progressStage,
        ),
      progressStage,
      completedAt:
        progressStage === "completed"
          ? query.completedAt ?? null
          : null,
    };

    return (
      <VisaOrderClient
        slug={slug}
        snapshot={snapshot}
      />
    );
  }

  const snapshot = {
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
  };

  return (
    <AccommodationOrderClient
      slug={slug}
      snapshot={snapshot}
    />
  );
}