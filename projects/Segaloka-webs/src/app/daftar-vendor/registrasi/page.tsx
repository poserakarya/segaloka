import type { Metadata } from "next";

import VendorRegistrationClient from "./VendorRegistrationClient";
import "./registration.css";

export const metadata: Metadata = {
  title: "Pendaftaran Vendor | Segaloka",
  description:
    "Daftarkan bisnis sebagai Vendor Segaloka dan lengkapi data perusahaan, layanan, serta dokumen verifikasi.",
};

export default function VendorRegistrationPage() {
  return <VendorRegistrationClient />;
}
