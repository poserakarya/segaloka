import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Memuat...</main>}>
      <ResetPasswordClient />
    </Suspense>
  );
}