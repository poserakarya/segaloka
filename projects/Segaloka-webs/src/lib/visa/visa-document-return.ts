/**
 * Segaloka Visa - Physical Document Return
 *
 * Traveler mengisi data penerima dan alamat.
 * Vendor membuat label dan mengatur pengiriman.
 *
 * Nomor telepon hanya untuk kebutuhan logistik.
 * Jangan tampilkan nomor telepon di chat.
 */

export type VisaDocumentReturnStatus =
  | "not_required"
  | "address_required"
  | "address_submitted"
  | "label_ready"
  | "shipped"
  | "delivered";

export type VisaShippingRecipient = {
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  deliveryNotes?: string;
};

export type VisaShippingLabel = {
  recipient: VisaShippingRecipient;
  createdAt: string;
  createdByVendorUserId: string;
};

export type VisaDocumentShipment = {
  courierName: string;
  trackingNumber: string;
  shippedAt: string;
  deliveredAt?: string | null;
};

export type VisaDocumentReturn = {
  bookingId: string;
  required: boolean;
  status: VisaDocumentReturnStatus;

  /**
   * Diisi Traveler.
   */
  recipient?: VisaShippingRecipient;

  /**
   * Snapshot alamat saat Vendor membuat label.
   */
  shippingLabel?: VisaShippingLabel;

  /**
   * Diisi Vendor setelah pengiriman.
   */
  shipment?: VisaDocumentShipment;
};

export function canCreateVisaShippingLabel(
  data: VisaDocumentReturn,
): boolean {
  const recipient = data.recipient;

  return (
    data.required &&
    data.status === "address_submitted" &&
    !!recipient?.recipientName.trim() &&
    !!recipient?.phoneNumber.trim() &&
    !!recipient?.addressLine.trim() &&
    !!recipient?.district.trim() &&
    !!recipient?.city.trim() &&
    !!recipient?.province.trim() &&
    !!recipient?.postalCode.trim() &&
    !!recipient?.countryCode.trim()
  );
}

export function isVisaDocumentReturnComplete(
  data: VisaDocumentReturn,
): boolean {
  return (
    !data.required ||
    data.status === "not_required" ||
    (
      data.status === "delivered" &&
      !!data.shipment?.deliveredAt
    )
  );
}