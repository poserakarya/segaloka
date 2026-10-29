import type { Metadata } from "next";
import SegaDealsClient from "./SegaDealsClient";
import "./segadeals.css";

export const metadata: Metadata = {
  title: "SegaDeals | Segaloka",
  description:
    "Temukan dan pahami penawaran khusus perjalanan melalui SegaDeals di Segaloka.",
};

export default function SegaDealsPage() {
  return <SegaDealsClient />;
}
