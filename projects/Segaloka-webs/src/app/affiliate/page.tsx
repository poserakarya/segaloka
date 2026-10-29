import type { Metadata } from "next";
import { AffiliateClient } from "./AffiliateClient";
import "./affiliate.css";

export const metadata: Metadata = {
  title: "Segaloka Affiliate",
  description:
    "Promosikan produk perjalanan dari ekosistem Segaloka dan kelola performa Affiliate Anda.",
};

export default function AffiliatePage() {
  return <AffiliateClient />;
}
