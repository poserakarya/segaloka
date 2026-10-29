import type { Metadata } from "next";
import AccommodationClient from "./AccommodationClient";
import "./akomodasi.css";

export const metadata: Metadata = {
  title: "Akomodasi & Land Arrangement | Segaloka",
  description:
    "Temukan pilihan akomodasi dan Land Arrangement dari Travel dan Vendor di Segaloka.",
};

export default function AccommodationPage() {
  return <AccommodationClient />;
}