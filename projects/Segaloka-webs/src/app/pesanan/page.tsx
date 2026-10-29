import type { Metadata } from "next";

import { PesananClient } from "./PesananClient";

export const metadata: Metadata = {
  title: "Pesanan | Segaloka",
  description:
    "Kelola dan pantau seluruh pesanan perjalanan Anda di Segaloka.",
};

export default function PesananPage() {
  return <PesananClient />;
}
