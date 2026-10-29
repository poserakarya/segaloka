import type { Metadata } from "next";

import { PartnerTravelClient } from "./PartnerTravelClient";
import "./partner-travel.css";

export const metadata: Metadata = {
  title: "Partner Travel | Segaloka",
  description:
    "Bermitra dengan Segaloka untuk mengembangkan bisnis travel Anda.",
};

export default function PartnerTravelPage() {
  return <PartnerTravelClient />;
}