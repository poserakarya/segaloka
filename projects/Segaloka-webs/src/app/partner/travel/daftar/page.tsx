import type { Metadata } from "next";
import { Suspense } from "react";

import "../partner-feature-detail.css";
import "./travel-registration.css";
import TravelRegistrationClient from "./TravelRegistrationClient";

export const metadata: Metadata = {
  title: "Daftar Travel | Segaloka",
  description:
    "Daftarkan bisnis Travel Anda untuk bergabung ke ekosistem Segaloka.",
};

function RegistrationFallback() {
  return (
    <main className="travel-registration-page">
      <div className="travel-registration-shell">
        <div className="travel-registration-loading">
          Memuat pendaftaran Travel...
        </div>
      </div>
    </main>
  );
}

export default function TravelRegistrationPage() {
  return (
    <Suspense fallback={<RegistrationFallback />}>
      <TravelRegistrationClient />
    </Suspense>
  );
}