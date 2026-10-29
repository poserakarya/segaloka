import type { Metadata } from "next";
import HelpCenterClient from "./HelpCenterClient";
import "./pusat-bantuan.css";

export const metadata: Metadata = {
  title: "Pusat Bantuan | Segaloka",
  description:
    "Pusat Bantuan Segaloka untuk informasi perjalanan, pemesanan, pembayaran, akun, promo, dan layanan lainnya.",
};

export default function HelpCenterPage() {
  return <HelpCenterClient />;
}