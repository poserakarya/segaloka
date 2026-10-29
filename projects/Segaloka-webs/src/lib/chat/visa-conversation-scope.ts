export type VisaConversationScope = Readonly<{
  bookingId: string;
  vendorId: string;
  travelerId: string;
  conversationType: "visa";
}>;

function normalizeIdentifier(
  value: string,
  field: string,
): string {
  const normalized = value.trim();

  if (
    !normalized ||
    normalized.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(normalized)
  ) {
    throw new Error(
      `Invalid conversation identifier: ${field}`,
    );
  }

  return normalized;
}

export function createVisaConversationScope(
  input: {
    bookingId: string;
    vendorId: string;
    travelerId: string;
  },
): VisaConversationScope {
  return {
    bookingId: normalizeIdentifier(
      input.bookingId,
      "bookingId",
    ),
    vendorId: normalizeIdentifier(
      input.vendorId,
      "vendorId",
    ),
    travelerId: normalizeIdentifier(
      input.travelerId,
      "travelerId",
    ),
    conversationType: "visa",
  };
}

export function isSameVisaConversation(
  left: VisaConversationScope,
  right: VisaConversationScope,
): boolean {
  return (
    left.conversationType === "visa" &&
    right.conversationType === "visa" &&
    left.bookingId === right.bookingId &&
    left.vendorId === right.vendorId &&
    left.travelerId === right.travelerId
  );
}