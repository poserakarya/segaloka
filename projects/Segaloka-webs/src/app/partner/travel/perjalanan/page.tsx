import { Suspense } from "react";

import "./journey.css";
import PartnerJourneyClient from "./PartnerJourneyClient";

function JourneyFallback() {
  return (
    <main className="partner-journey-page">
      <div className="partner-journey-shell">
        <div className="partner-journey-loading">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}

export default function PartnerTravelJourneyPage() {
  return (
    <Suspense fallback={<JourneyFallback />}>
      <PartnerJourneyClient />
    </Suspense>
  );
}