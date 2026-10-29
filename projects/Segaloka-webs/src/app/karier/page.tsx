import type { Metadata } from "next";
import CareerClient from "./CareerClient";
import "./karier.css";

export const metadata: Metadata = {
  title: "Karier | Segaloka",
  description:
    "Bangun masa depan perjalanan bersama Segaloka.",
};

export default function CareerPage() {
  return <CareerClient />;
}