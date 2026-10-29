import type { Metadata } from "next";
import { VendorPartnerClient } from "./VendorPartnerClient";
import "./vendor-partner.css";

export const metadata: Metadata = {
  title: "Daftarkan Vendor | Segaloka",
  description:
    "Bergabung sebagai Vendor Segaloka dan perluas distribusi produk serta layanan perjalanan Anda.",
};

export default function VendorPartnerPage() {
  return <VendorPartnerClient />;
}
