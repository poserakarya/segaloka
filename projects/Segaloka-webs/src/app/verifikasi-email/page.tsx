import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Memuat...</main>}>
      <VerifyEmailClient />
    </Suspense>
  );
}