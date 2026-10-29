"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailClient() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    "idle" | "success" | "invalid" | "error"
  >("idle");

  const validToken = /^[0-9a-f]{64}$/.test(token);

  async function verify() {
    if (!validToken || loading) return;

    setLoading(true);
    setResult("idle");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });

      if (response.ok) {
        setResult("success");
      } else if (response.status === 400) {
        setResult("invalid");
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "Plus Jakarta Sans, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          padding: 32,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>
          Verifikasi Email Segaloka
        </h1>

        {result === "success" ? (
          <>
            <p>Alamat email Anda berhasil diverifikasi.</p>
            <a href="/?auth=login">Masuk ke Segaloka</a>
          </>
        ) : (
          <>
            <p style={{ lineHeight: 1.7 }}>
              {validToken
                ? "Konfirmasikan alamat email Anda untuk melanjutkan."
                : "Tautan verifikasi tidak valid atau tidak lengkap."}
            </p>

            {result === "invalid" && (
              <p role="alert">
                Token tidak valid atau sudah kedaluwarsa.
              </p>
            )}

            {result === "error" && (
              <p role="alert">
                Layanan verifikasi sedang mengalami gangguan.
              </p>
            )}

            <button
              type="button"
              disabled={!validToken || loading}
              onClick={verify}
              style={{
                width: "100%",
                padding: 14,
                marginTop: 20,
                border: 0,
                borderRadius: 10,
                background: "#1769aa",
                color: "white",
                fontSize: 15,
                cursor: validToken && !loading
                  ? "pointer"
                  : "not-allowed",
                opacity: validToken && !loading ? 1 : 0.5,
              }}
            >
              {loading ? "Memverifikasi..." : "Verifikasi Email"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}