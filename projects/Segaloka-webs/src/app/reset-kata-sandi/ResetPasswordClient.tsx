"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const validToken = /^[0-9a-f]{64}$/.test(token);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || !validToken) return;

    if (password.length < 12 || password.length > 128) {
      setMessage("Kata sandi harus terdiri dari 12–128 karakter.");
      return;
    }

    if (password !== confirm) {
      setMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!response.ok) {
        setMessage("Tautan tidak valid, kedaluwarsa, atau permintaan gagal.");
        return;
      }

      setPassword("");
      setConfirm("");
      setSuccess(true);
      window.history.replaceState(null, "", "/reset-kata-sandi");
    } catch {
      setMessage("Koneksi gagal. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        fontFamily: "Plus Jakarta Sans, sans-serif",
      }}
    >
      <section style={{ width: "100%", maxWidth: 440 }}>
        <h1>Reset Kata Sandi</h1>

        {!validToken && !success ? (
          <p>Tautan reset tidak valid atau tidak tersedia.</p>
        ) : success ? (
          <>
            <p>Kata sandi berhasil diperbarui.</p>
            <a href="/?auth=login">Kembali ke login</a>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <label htmlFor="new-password">Kata sandi baru</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <label htmlFor="confirm-password">Konfirmasi kata sandi</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />

            {message && <p role="alert">{message}</p>}

            <button type="submit" disabled={busy}>
              {busy ? "Memproses..." : "Simpan Kata Sandi Baru"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}