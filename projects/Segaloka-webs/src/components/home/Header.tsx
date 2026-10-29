"use client";
import * as React from "react";

import "../../app/segaloka-recovery.css";
import CountryCallingCodePicker from "@/components/auth/CountryCallingCodePicker";
import { createPortal } from "react-dom";

import {
  ChevronDown,
  Globe2,
  Menu,
  Search,
  X,
  Eye, EyeOff,

  Mail,
  LockKeyhole,
  ArrowRight,
  BadgeCheck,} from "lucide-react";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  currencyOptions,
  languageOptions,
} from "@/data/preferences";
import { useMarketplacePreferences } from "@/components/providers/MarketplacePreferencesProvider";
import { marketplaceTranslate } from "@/lib/marketplace-i18n";


const businessItems = [
  {
    labelKey: "header.registerTravel" as const,
    href: "/partner/travel",
  },
  {
    labelKey: "header.registerVendor" as const,
    href: "/daftar-vendor",
  },
  {
    labelKey: "header.affiliate" as const,
    href: "/affiliate",
  },
];


const helpItems = [
  {
    labelKey: "header.helpCenter" as const,
    href: "/pusat-bantuan",
  },
  {
    labelKey: "header.howToBook" as const,
    href: "/cara-pesan",
  },
  {
    labelKey: "header.contactUs" as const,
    href: "/bantuan",
  },
  {
    labelKey: "header.terms" as const,
    href: "/syarat-ketentuan",
  },
];


function SegalokaOtpBoxes({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from(
    { length: 6 },
    (_, index) => value[index] ?? ""
  );

  return (
    <div
      role="group"
      aria-label="Kode OTP enam digit"
      dir="ltr"
      className="sg-otp-six-boxes"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit OTP ${index + 1}`}
          value={digit}
          disabled={disabled}
          onChange={(event) => {
            const numbers = event.target.value.replace(/\D/g, "");
            const next = [...digits];

            if (!numbers) {
              next[index] = "";
              onChange(next.join(""));
              return;
            }

            for (
              let offset = 0;
              offset < numbers.length && index + offset < 6;
              offset++
            ) {
              next[index + offset] = numbers[offset];
            }

            onChange(next.join(""));

            refs.current[
              Math.min(index + numbers.length, 5)
            ]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();

              const next = [...digits];

              if (next[index]) {
                next[index] = "";
              } else if (index > 0) {
                next[index - 1] = "";
                refs.current[index - 1]?.focus();
              }

              onChange(next.join(""));
            }

            if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            }

            if (event.key === "ArrowRight" && index < 5) {
              refs.current[index + 1]?.focus();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();

            const code = event.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, 6);

            if (code.length === 6) {
              onChange(code);
              refs.current[5]?.focus();
            }
          }}
          className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white text-center text-xl font-semibold text-[#092e67] outline-none transition focus:border-[#0875ff] focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:h-14"
        />
      ))}
    </div>
  );
}

export function Header() {
  const {
    language,
    currency,
    setLanguage,
    setCurrency,
  } = useMarketplacePreferences();
  const t = (
    key: Parameters<typeof marketplaceTranslate>[1],
  ) => marketplaceTranslate(language, key);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const [businessOpen, setBusinessOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // sg-auth-mode-separation-v1
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // sg-guest-auth-timer-disabled-v1
  // Popup autentikasi dibuka melalui tindakan pengguna.
  const [authRequired] = useState(false);
  // sg-email-otp-form-v2
  const [authStep, setAuthStep] = useState<"options" | "login-email" | "login" | "otp-method" | "otp" | "register-email" | "register-details" | "register-success" | "forgot-password" | "forgot-email" | "forgot-otp" | "forgot-new-password">("options");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  // sg-login-recovery-controls-v1
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginRecoveryNotice, setLoginRecoveryNotice] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authChallengeId, setAuthChallengeId] = useState("");
  const [loginPreAuthTicket, setLoginPreAuthTicket] = useState("");
  const [loginAvailableMethods, setLoginAvailableMethods] = useState<string[]>([]);
  const [loginSelectedMethod, setLoginSelectedMethod] = useState("");
  // sg-password-reset-otp-v1: terpisah dari OTP login MFA.
  const [recoveryChallengeId, setRecoveryChallengeId] = useState("");
  const [recoveryResendSeconds, setRecoveryResendSeconds] = useState(0);
  const [recoveryResendUntil, setRecoveryResendUntil] = useState<number | null>(null);

  React.useEffect(() => {
    if (recoveryResendUntil === null) return;

    const update = () => {
      setRecoveryResendSeconds(
        Math.max(0, Math.ceil((recoveryResendUntil - Date.now()) / 1000))
      );
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [recoveryResendUntil]);

  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authReturnTo, setAuthReturnTo] = useState("");

  // sg-traveler-registration-v1
  const [registerName, setRegisterName] = useState("");
  const [registerCountryCode, setRegisterCountryCode] = useState("+62");
  const [recoveryCountryCode, setRecoveryCountryCode] = useState("+62");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const registrationLabels = {
    ID: {
      continue: "Lanjutkan",
      name: "Nama lengkap",
      phone: "Nomor HP",
      country: "Kode negara",
      register: "Daftar",
      success: "Periksa email Anda untuk melanjutkan verifikasi akun.",
      unavailable: "Metode pendaftaran belum tersedia. Silakan daftar melalui email.",
      invalidPhone: "Masukkan nomor HP tanpa angka 0 di depan.",
      error: "Pendaftaran belum dapat diproses.",
    },
    EN: {
      continue: "Continue",
      name: "Full name",
      phone: "Phone number",
      country: "Country code",
      register: "Register",
      success: "Check your email to continue account verification.",
      unavailable: "This registration method is not available yet. Please register using email.",
      invalidPhone: "Enter your phone number without a leading zero.",
      error: "Registration could not be processed.",
    },
    AR: {
      continue: "متابعة",
      name: "الاسم الكامل",
      phone: "رقم الهاتف",
      country: "رمز الدولة",
      register: "إنشاء حساب",
      success: "تحقق من بريدك الإلكتروني لمتابعة تأكيد الحساب.",
      unavailable: "طريقة التسجيل هذه غير متاحة حالياً. يرجى التسجيل بالبريد الإلكتروني.",
      invalidPhone: "أدخل رقم الهاتف دون صفر في البداية.",
      error: "تعذرت معالجة التسجيل.",
    },
  }[language];

  async function submitTravelerRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;

    const localPhone = registerPhone.replace(/\D/g, "").replace(/^0+/, "");
    const phoneE164 = registerCountryCode + localPhone;

    if (
      !/^[1-9][0-9]{6,13}$/.test(localPhone) ||
      !/^\+[1-9][0-9]{7,14}$/.test(phoneE164)
    ) {
      setAuthError(registrationLabels.invalidPhone);
      return;
    }

    setAuthBusy(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          email: authEmail.trim(),
          fullName: registerName.trim(),
          password: registerPassword,
          phoneE164,
        }),
      });

      if (response.status === 202) {
        setRegisterSuccess(true);
        setRegisterPassword("");
        setAuthStep("register-success");
        return;
      }

      const result = await response.json().catch(() => ({}));
      setAuthError(
        typeof result.message === "string"
          ? result.message
          : registrationLabels.error,
      );
    } catch {
      setAuthError(registrationLabels.error);
    } finally {
      setAuthBusy(false);
    }
  }


  const authLabels = {
    ID: {
      email: "Alamat email",
      password: "Kata sandi",
      login: "Masuk",
      otp: "Masukkan kode OTP 6 digit",
      verify: "Verifikasi OTP",
      back: "Kembali",
      error: "Autentikasi gagal. Silakan coba kembali.",
    },
    EN: {
      email: "Email address",
      password: "Password",
      login: "Sign in",
      otp: "Enter your 6-digit OTP",
      verify: "Verify OTP",
      back: "Back",
      error: "Authentication failed. Please try again.",
    },
    AR: {
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      login: "تسجيل الدخول",
      otp: "أدخل رمز التحقق المكون من 6 أرقام",
      verify: "التحقق من الرمز",
      back: "رجوع",
      error: "فشلت المصادقة. يرجى المحاولة مرة أخرى.",
    },
  }[language];

  // sg-password-recovery-v1
  async function submitPasswordRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;

    setAuthBusy(true);
    setAuthError("");
    setLoginRecoveryNotice("");

    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: authEmail.trim() }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !/^[0-9a-f]{32}$/.test(result.challengeId ?? "")) {
        setAuthError(
          language === "EN" ? "Unable to send verification code."
          : language === "AR" ? "تعذر إرسال رمز التحقق."
          : "Permintaan kode verifikasi gagal. Silakan coba lagi."
        );
        return;
      }

      setRecoveryChallengeId(result.challengeId);
      setRecoveryResendUntil(Date.now() + 60000);
      setRecoveryCode("");
      setRecoveryToken("");
      setRecoveryNewPassword("");
      setRecoveryConfirmPassword("");
      setAuthStep("forgot-otp");
    } catch {
      setAuthError(
        language === "EN" ? "Connection failed."
        : language === "AR" ? "فشل الاتصال."
        : "Koneksi gagal. Silakan coba lagi."
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendRecoveryOtp() {
    if (authBusy || recoveryResendSeconds > 0 || !authEmail.trim()) return;

    setAuthBusy(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: authEmail.trim() }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !/^[0-9a-f]{32}$/.test(result.challengeId ?? "")) {
        setAuthError(
          language === "EN" ? "Unable to resend code." : "Gagal mengirim ulang kode."
        );
        return;
      }

      setRecoveryChallengeId(result.challengeId);
      setRecoveryCode("");
      setRecoveryResendUntil(Date.now() + 60000);
    } catch {
      setAuthError(
        language === "EN" ? "Connection failed." : "Koneksi gagal."
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function submitRecoveryOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy || recoveryCode.length !== 6 || !recoveryChallengeId) return;

    setAuthBusy(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          challengeId: recoveryChallengeId,
          code: recoveryCode,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.verified !== true ||
          typeof result.token !== "string" ||
          !/^[0-9a-f]{64}$/.test(result.token)) {
        setAuthError(
          language === "EN" ? "Invalid or expired verification code."
          : language === "AR" ? "رمز التحقق غير صالح أو منتهي الصلاحية."
          : "Kode OTP salah, kedaluwarsa, atau sudah digunakan."
        );
        return;
      }

      setRecoveryToken(result.token);
      setRecoveryCode("");
      setAuthStep("forgot-new-password");
    } catch {
      setAuthError("Koneksi verifikasi gagal. Silakan coba lagi.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitRecoveryNewPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy || !recoveryToken) return;

    if (recoveryNewPassword.length < 12 || recoveryNewPassword.length > 128) {
      setAuthError("Kata sandi harus terdiri dari 12–128 karakter.");
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setAuthError("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          token: recoveryToken,
          newPassword: recoveryNewPassword,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.reset !== true) {
        setAuthError(
          "Gagal mengganti kata sandi. Silakan ulangi proses verifikasi jika kode sudah kedaluwarsa."
        );
        return;
      }

      setRecoveryToken("");
      setRecoveryChallengeId("");
      setRecoveryCode("");
      setRecoveryNewPassword("");
      setRecoveryConfirmPassword("");
      setAuthPassword("");
      setAuthError("");
      setLoginRecoveryNotice(
        "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru."
      );
      setAuthStep("login");
    } catch {
      setAuthError("Koneksi gagal. Silakan coba lagi.");
    } finally {
      setAuthBusy(false);
    }
  }
  async function submitEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;

    setAuthBusy(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
          language,
        }),
      });

      const result = await response.json();

      if (response.ok && result.authenticated === true) {
        const check = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        const session = await check.json().catch(() => ({}));

        if (check.ok && session.authenticated === true) {
          const destination =
            authReturnTo.startsWith("/") &&
            !authReturnTo.startsWith("//") &&
            !authReturnTo.includes("\\") &&
            !authReturnTo.includes("\n") &&
            !authReturnTo.includes("\r")
              ? authReturnTo
              : "/";

          try {
            sessionStorage.removeItem("segaloka_guest_started_at");
          } catch {
            // Ignore unavailable storage.
          }

          window.location.assign(destination);
          return;
        }

        setAuthError("Sesi login belum dapat diverifikasi.");
        return;
      }

      if (
        response.ok &&
        result.authenticated === false &&
        result.code === "OTP_CHANNEL_REQUIRED" &&
        typeof result.preAuthTicket === "string" &&
        /^[0-9a-f]{64}$/.test(result.preAuthTicket) &&
        Array.isArray(result.availableMethods)
      ) {
        const methods = result.availableMethods.filter(
          (method: unknown): method is string =>
            typeof method === "string" &&
            ["authenticator", "email", "whatsapp"].includes(method),
        );

        if (methods.length === 0) {
          setAuthError(authLabels.error);
          return;
        }

        setLoginPreAuthTicket(result.preAuthTicket);
        setLoginAvailableMethods(methods);
        setLoginSelectedMethod("");
        setAuthChallengeId("");
        setAuthCode("");
        setAuthPassword("");
        setAuthStep("otp-method");
        return;
      }
      if (
        response.ok &&
        result.code === "OTP_REQUIRED" &&
        typeof result.challengeId === "string"
      ) {
        setAuthChallengeId(result.challengeId);
        setAuthCode("");
        setAuthPassword("");
        setAuthStep("otp");
      } else {
        setAuthError(
          typeof result.message === "string"
            ? result.message
            : authLabels.error,
        );
      }
    } catch {
      setAuthError(authLabels.error);
    } finally {
      setAuthBusy(false);
    }
  }

  async function selectLoginMethod(method: string) {
    if (
      authBusy ||
      !loginAvailableMethods.includes(method) ||
      !/^[0-9a-f]{64}$/.test(loginPreAuthTicket)
    ) return;

    setAuthError("");
    setAuthCode("");

    if (method === "authenticator") {
      setLoginSelectedMethod(method);
      setAuthStep("otp");
      return;
    }

    setAuthBusy(true);

    try {
      const response = await fetch("/api/auth/login/select-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          preAuthTicket: loginPreAuthTicket,
          channel: method,
          language,
        }),
      });

      const result = await response.json();

      if (
        response.ok &&
        result.code === "OTP_REQUIRED" &&
        typeof result.challengeId === "string"
      ) {
        setAuthChallengeId(result.challengeId);
        setLoginSelectedMethod(method);
        setLoginPreAuthTicket("");
        setAuthStep("otp");
        return;
      }

      setAuthError(
        typeof result.message === "string"
          ? result.message
          : authLabels.error,
      );
    } catch {
      setAuthError(authLabels.error);
    } finally {
      setAuthBusy(false);
    }
  }
  async function submitEmailOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authBusy || !/^[0-9]{6}$/.test(authCode)) return;

    setAuthBusy(true);
    setAuthError("");

    try {
      const response = await fetch(
        loginSelectedMethod === "authenticator"
          ? "/api/auth/login/verify-authenticator"
          : "/api/auth/verify-otp",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          ...(loginSelectedMethod === "authenticator"
            ? { preAuthTicket: loginPreAuthTicket }
            : { challengeId: authChallengeId }),
          code: authCode,
        }),
      });

      const result = await response.json();

      if (response.ok && result.authenticated === true) {
        const check = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        const session = await check.json();

        if (check.ok && session.authenticated === true) {
          const destination =
            authReturnTo.startsWith("/") &&
            !authReturnTo.startsWith("//") &&
            !authReturnTo.includes("\\") &&
            !authReturnTo.includes("\n") &&
            !authReturnTo.includes("\r")
              ? authReturnTo
              : "/";

          try {
            sessionStorage.removeItem("segaloka_guest_started_at");
          } catch {
            // Ignore unavailable storage.
          }
          window.location.assign(destination);
          return;
        }
      }

      setAuthError(
        typeof result.message === "string"
          ? result.message
          : authLabels.error,
      );
    } catch {
      setAuthError(authLabels.error);
    } finally {
      setAuthBusy(false);
    }
  }

  // sg-auth-route-query-handler
  useEffect(() => {
    const url = new URL(window.location.href);
    const auth = url.searchParams.get("auth");

    if (auth !== "login" && auth !== "register") {
      return;
    }

    const requestedReturnTo = url.searchParams.get("returnTo") ?? "";

    if (
      requestedReturnTo.startsWith("/") &&
      !requestedReturnTo.startsWith("//") &&
      !requestedReturnTo.includes("\\")
    ) {
      setAuthReturnTo(requestedReturnTo);
    }

    setAuthMode(auth);
    setAuthStep("options");
    setAuthError("");
    setAuthModalOpen(true);
    url.searchParams.delete("auth");

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, []);



  function closeNavDropdowns() {
    setBusinessOpen(false);
    setHelpOpen(false);
  }



  function closeAuthModal() {
    setAuthModalOpen(false);
  }


  useEffect(() => {
    if (!authModalOpen) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;

    const scrollY = window.scrollY;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;

    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !authRequired) {
        closeAuthModal();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );

      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;

      html.style.overflow = previousHtmlOverflow;

      window.scrollTo(0, scrollY);
    };
  }, [authModalOpen, authRequired]);
  return (
    <header className="hero-header">

      <div className="hero-header-shell">

        <a
          href="/"
          className="hero-logo"
          aria-label="Segaloka"
        >
          <Image
            src="/images/brand/segaloka-logo.png"
            alt="Segaloka"
            width={106}
            height={34}
            priority
          />
        </a>


        <nav
          className="hero-nav hero-nav-new"
          aria-label={t("header.mainNavigation")}
        >

          <a
            href="#promo"
            className="hero-nav-primary"
            onClick={closeNavDropdowns}
          >
            <span className="hero-nav-promo-icon">
              %
            </span>

            {t("header.promo")}
          </a>


          <a
            href="#aplikasi"
            className="hero-nav-primary"
            onClick={closeNavDropdowns}
          >
            <span className="hero-nav-download-icon">
              ↓
            </span>

            {t("header.downloadApp")}
          </a>


          <div className="hero-nav-dropdown">

            <button
              type="button"
              className="hero-nav-trigger"
              aria-expanded={businessOpen}
              onClick={() => {
                setBusinessOpen(
                  (value) => !value
                );

                setHelpOpen(false);
              }}
            >
              {t("header.business")}

              <ChevronDown
                size={14}
                className={
                  businessOpen
                    ? "is-open"
                    : ""
                }
              />
            </button>


            {businessOpen && (
              <div className="hero-nav-menu">

                {businessItems.map(
                  (item) => (
                    <a
                      key={t(item.labelKey)}
                      href={item.href}
                      onClick={() =>
                        setBusinessOpen(false)
                      }
                    >
                      {t(item.labelKey)}
                    </a>
                  ),
                )}

              </div>
            )}

          </div>


          <div className="hero-nav-dropdown">

            <button
              type="button"
              className="hero-nav-trigger"
              aria-expanded={helpOpen}
              onClick={() => {
                setHelpOpen(
                  (value) => !value
                );

                setBusinessOpen(false);
              }}
            >
              {t("header.help")}

              <ChevronDown
                size={14}
                className={
                  helpOpen
                    ? "is-open"
                    : ""
                }
              />
            </button>


            {helpOpen && (
              <div className="hero-nav-menu">

                {helpItems.map(
                  (item) => (
                    <a
                      key={t(item.labelKey)}
                      href={item.href}
                      onClick={() =>
                        setHelpOpen(false)
                      }
                    >
                      {t(item.labelKey)}
                    </a>
                  ),
                )}

              </div>
            )}

          </div>


          <a
            href="/pesanan"
            className="hero-nav-primary"
            onClick={closeNavDropdowns}
          >
            {t("header.orders")}
          </a>

        </nav>


        <div className="hero-header-actions">

          <button
            type="button"
            className="hero-currency"
            aria-expanded={preferencesOpen}
            aria-haspopup="true"
            onClick={() => {
              setPreferencesOpen(
                (value) => !value
              );

              closeNavDropdowns();
            }}
          >
            <Globe2 size={14} />

            <span>
              {language} · {currency}
            </span>

            <ChevronDown size={12} />
          </button>


          {preferencesOpen && (
            <div
              className="hero-preferences-menu"
              role="menu"
            >

              <div className="hero-preferences-group">

                <span className="hero-preferences-label">
                  {t("header.language")}
                </span>

                {languageOptions.map(
                  (option) => (
                    <button
                      key={option.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={
                        language === option.code
                      }
                      dir={option.dir}
                      className={
                        language === option.code
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        setLanguage(option.code);
                        setPreferencesOpen(false);
                      }}
                    >
                      <span>
                        {option.code}
                      </span>

                      <small>
                        {option.label}
                      </small>
                    </button>
                  ),
                )}

              </div>


              <div className="hero-preferences-group">

                <span className="hero-preferences-label">
                  {t("header.currency")}
                </span>

                {currencyOptions.map(
                  (option) => (
                    <button
                      key={option.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={
                        currency === option.code
                      }
                      className={
                        currency === option.code
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        setCurrency(option.code);
                        setPreferencesOpen(false);
                      }}
                    >
                      <span>
                        {option.code}
                      </span>

                      <small>
                        {option.label}
                      </small>
                    </button>
                  ),
                )}

              </div>

            </div>
          )}


          <button
  type="button"
  className="hero-login"
  onClick={() => {
    closeNavDropdowns();
    setPreferencesOpen(false);
    setMobileOpen(false);
    setAuthMode("login");
    setAuthStep("login");
    setAuthError("");
    setAuthModalOpen(true);
  }}
>
  {t("header.login")}
</button>


          <button
            type="button"
            className="hero-register"
            onClick={() => {
              closeNavDropdowns();
              setPreferencesOpen(false);
              setAuthMode("register");
              setAuthStep("options");
              setAuthError("");
              setAuthModalOpen(true);
            }}
          >
            {t("header.register")}
          </button>


          <button
            type="button"
            className="hero-mobile-action"
            aria-label={t("header.search")}
          >
            <Search size={18} />
          </button>


          <button
            type="button"
            className="hero-mobile-action"
            aria-label={t("header.menu")}
            onClick={() =>
              setMobileOpen(
                (value) => !value
              )
            }
          >
            {mobileOpen
              ? <X size={20} />
              : <Menu size={20} />
            }
          </button>

        </div>

      </div>


      {mobileOpen && (
        <div className="hero-mobile-menu">

          <button
            type="button"
            className="hero-mobile-preferences"
            onClick={() =>
              setPreferencesOpen(
                (value) => !value
              )
            }
          >
            <Globe2 size={15} />

            {language} · {currency}

            <ChevronDown size={13} />
          </button>


          <a href="#promo">
            {t("header.promo")}
          </a>

          <a href="#aplikasi">
            {t("header.downloadApp")}
          </a>


          <span className="hero-mobile-menu-label">
            {t("header.business")}
          </span>

          {businessItems.map(
            (item) => (
              <a
                href={item.href}
                key={t(item.labelKey)}
              >
                {t(item.labelKey)}
              </a>
            ),
          )}


          <span className="hero-mobile-menu-label">
            {t("header.help")}
          </span>

          {helpItems.map(
            (item) => (
              <a
                href={item.href}
                key={t(item.labelKey)}
              >
                {t(item.labelKey)}
              </a>
            ),
          )}


          <a href="/pesanan">
            {t("header.orders")}
          </a>


          <div className="hero-mobile-auth">

            <button
  type="button"
  className="hero-login"
  onClick={() => {
    closeNavDropdowns();
    setPreferencesOpen(false);
    setMobileOpen(false);
    setAuthMode("login");
    setAuthStep("login");
    setAuthError("");
    setAuthModalOpen(true);
  }}
>
  {t("header.login")}
</button>

            <button
            type="button"
            className="hero-register"
            onClick={() => {
              closeNavDropdowns();
              setPreferencesOpen(false);
              setAuthMode("register");
              setAuthStep("options");
              setAuthError("");
              setAuthModalOpen(true);
            }}
          >
            {t("header.register")}
          </button>

          </div>

        </div>
      )}


      {authModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className={`sg-auth-modal-backdrop ${authStep === "forgot-password" || authStep === "forgot-email" ? "sg-recovery-modal-active" : ""}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !authRequired) {
              closeAuthModal();
            }
          }}
        >
          <div
            className="sg-auth-modal" dir={language === "AR" ? "rtl" : "ltr"} lang={language.toLowerCase()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sg-auth-modal-title"
          >
            <button
              type="button"
              className="sg-auth-modal-close"
              aria-label={t("auth.close")}
              onClick={closeAuthModal}
            >
              <X size={19} />
            </button>


            <div className="sg-auth-modal-brand">
              <Image
                src="/images/brand/segaloka-logo.png"
                alt="Segaloka"
                width={122}
                height={39}
                priority
              />
            </div>


            <div className="sg-auth-modal-head" hidden={authStep === "forgot-email" || authStep === "forgot-password" || authStep === "forgot-otp" || authStep === "forgot-new-password"}>
              <h2 id="sg-auth-modal-title">
                {authStep === "options" ? t("auth.title") : (authStep === "login" || authStep === "login-email") ? "Masuk" : authStep === "otp-method" ? (language === "EN" ? "Choose verification method" : language === "AR" ? "اختر طريقة التحقق" : "Pilih Metode Verifikasi") : authStep === "otp" ? "Verifikasi OTP" : t("header.register")}
              </h2>
              <p>{t("auth.subtitle")}</p>
            </div>


            {authStep !== "options" && (
              <div className="sg-auth-login-flow">
                <button
                  type="button"
                  className="sg-auth-login-back" hidden={authStep === "login" || authStep === "forgot-email" || authStep === "forgot-password" || authStep === "forgot-otp" || authStep === "forgot-new-password"}
                  disabled={authBusy}
                  onClick={() => {
                    setAuthStep((authStep === "forgot-password" || authStep === "forgot-email" || authStep === "otp") ? "login" : authStep === "login" ? "login-email" : authStep === "register-details" ? "register-email" : "options");
                    setAuthError("");
                    setAuthCode("");
                  }}
                >
                  {authLabels.back}
                </button>

                {authStep === "register-email" ? (
                  <form
                    className="sg-auth-login-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!authEmail.trim()) return;
                      setAuthError("");
                      setAuthStep("register-details");
                    }}
                  >
                    <label htmlFor="sg-register-email">{authLabels.email}</label>
                    <input
                      id="sg-register-email"
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      required
                      maxLength={254}
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                    />
                    <button type="submit">{registrationLabels.continue}</button>
                  </form>
                ) : authStep === "register-details" ? (
                  <form
                    className="sg-auth-login-form"
                    onSubmit={submitTravelerRegistration}
                  >
                    <label htmlFor="sg-register-name">{registrationLabels.name}</label>
                    <input
                      id="sg-register-name"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={150}
                      value={registerName}
                      onChange={(event) => setRegisterName(event.target.value)}
                    />

                    {/* sg-register-phone-row-v1 */}
                    <label htmlFor="sg-register-phone">
                      {registrationLabels.phone}
                    </label>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "stretch",
                        gap: "8px",
                        width: "100%",
                        minWidth: 0,
                      }}
                    >
                      <CountryCallingCodePicker
                        value={registerCountryCode}
                        onChange={setRegisterCountryCode}
                        language={language}
                        label={registrationLabels.country}
                      />
                      <input
                        id="sg-register-phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="[1-9][0-9]*"
                        dir="ltr"
                        autoComplete="tel-national"
                        required
                        maxLength={14}
                        value={registerPhone}
                        onChange={(event) =>
                          setRegisterPhone(
                            event.target.value
                              .replace(/\D/g, "")
                              .replace(/^0+/, "")
                              .slice(0, 14),
                          )
                        }
                        style={{
                          flex: "1 1 0",
                          width: "100%",
                          minWidth: 0,
                          height: "46px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <label htmlFor="sg-register-email-locked">{authLabels.email}</label>
                    <input
                      id="sg-register-email-locked"
                      type="email"
                      dir="ltr"
                      value={authEmail}
                      readOnly
                    />

                    <label htmlFor="sg-register-password">{authLabels.password}</label>
                    <input
                      id="sg-register-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                    />

                    <button type="submit" disabled={authBusy}>
                      {authBusy ? "..." : registrationLabels.register}
                    </button>
                  </form>
                ) : authStep === "register-success" ? (
                  <div role="status" aria-live="polite">
                    {registerSuccess && registrationLabels.success}
                  </div>
                ) : authStep === "login-email" ? (
                  <form
                    className="sg-auth-login-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!authEmail.trim()) return;
                      setAuthError("");
                      setAuthStep("login");
                    }}
                  >
                    <label htmlFor="sg-login-email-first">
                      {authLabels.email}
                    </label>
                    <input
                      id="sg-login-email-first"
                      type="email"
                      autoComplete="username"
                      dir="ltr"
                      required
                      maxLength={254}
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                    />
                    <button type="submit">
                      {registrationLabels.continue}
                    </button>
                  </form>
                ) : authStep === "forgot-email" ? (
                  <div className="sg-recovery-reference-v1 sg-recovery-content" dir={language === "AR" ? "rtl" : "ltr"}>
                    <h2>
                      {language === "EN" ? "Forgot Email" : language === "AR" ? "نسيت البريد الإلكتروني" : "Lupa Email"}
                    </h2>
                    <p className="sg-recovery-description">
                      {language === "EN"
                        ? "Enter your registered WhatsApp number. We will send your account email address to that number."
                        : language === "AR"
                          ? "أدخل رقم واتساب المسجل لاستعادة عنوان البريد الإلكتروني."
                          : "Masukkan nomor WhatsApp yang terdaftar. Kami akan mengirim alamat email akun Anda ke WhatsApp tersebut."}
                    </p>
                    <label htmlFor="sg-recovery-phone">
                      {language === "EN" ? "WhatsApp Number" : language === "AR" ? "رقم واتساب" : "Nomor WhatsApp"}
                    </label>
                    <div className="sg-recovery-phone-field sg-recovery-phone-with-country">
                      <CountryCallingCodePicker
                        value={recoveryCountryCode}
                        onChange={setRecoveryCountryCode}
                        language={language}
                        label={language === "EN" ? "Country code" : language === "AR" ? "رمز الدولة" : "Kode negara"}
                      />
                      <input
                        id="sg-recovery-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="812 3456 7890"
                        dir="ltr"
                      />
                    </div>
                    <button type="button" className="sg-recovery-primary" disabled>
                      {language === "EN" ? "Send My Email to WhatsApp" : language === "AR" ? "إرسال بريدي الإلكتروني إلى واتساب" : "Kirim Email Saya ke WhatsApp"}
                    </button>
                    <div className="sg-recovery-security">
                      <strong>🔒 {language === "EN" ? "Secure and verified" : language === "AR" ? "آمن وموثّق" : "Aman dan terverifikasi"}</strong>
                      <p>
                        {language === "EN"
                          ? "Account information will only be sent to a verified WhatsApp number."
                          : language === "AR"
                            ? "لن يتم إرسال معلومات الحساب إلا إلى رقم واتساب تم التحقق منه."
                            : "Informasi akun hanya akan dikirim ke nomor WhatsApp yang telah diverifikasi."}
                      </p>
                    </div>
                    <button type="button" className="sg-recovery-back" onClick={() => setAuthStep("login")}>
                      ← {language === "EN" ? "Back to login" : language === "AR" ? "العودة لتسجيل الدخول" : "Kembali ke halaman masuk"}
                    </button>
                  </div>                ) : authStep === "forgot-password" ? (
                  <>
                  <form
                    onSubmit={submitPasswordRecovery}
                    className="sg-auth-login-form sg-recovery-content sg-recovery-reference-v1"
                    dir={language === "AR" ? "rtl" : "ltr"}
                  >
                    <h3>
                      {language === "EN"
                        ? "Forgot Password"
                        : language === "AR"
                          ? "نسيت كلمة المرور"
                          : "Lupa Kata Sandi"}
                    </h3>

                    <p>
                      {language === "EN"
                        ? "Enter your registered email address."
                        : language === "AR"
                          ? "أدخل عنوان بريدك الإلكتروني المسجل."
                          : "Masukkan alamat email yang terdaftar di Segaloka."}
                    </p>

                    <label htmlFor="sg-recovery-email">
                      {authLabels.email}
                    </label>

                    <input
                      id="sg-recovery-email"
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      required
                      maxLength={254}
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                    />

                    {authError && <p role="alert">{authError}</p>}

                    {loginRecoveryNotice && (
                      <p role="status" aria-live="polite">
                        {loginRecoveryNotice}
                      </p>
                    )}

                    <button type="submit" disabled={authBusy}>
                      {authBusy
                        ? "..."
                        : language === "EN"
                          ? "Send Reset Instructions"
                          : language === "AR"
                            ? "إرسال تعليمات إعادة التعيين"
                            : "Kirim Kode OTP"}
                    </button>
                  </form>
                  <div className="sg-recovery-bottom">
                    <button
                      type="button"
                      className="sg-recovery-back"
                      onClick={() => {
                        setAuthStep("login");
                        setAuthError("");
                        setLoginRecoveryNotice("");
                      }}
                    >
                      ← {language === "EN" ? "Back to login" : language === "AR" ? "العودة إلى تسجيل الدخول" : "Kembali ke halaman masuk"}
                    </button>
                  </div>
                  </>
                ) : authStep === "forgot-otp" ? (
                  <form
                    onSubmit={submitRecoveryOtp}
                    className="sg-auth-login-form sg-recovery-content sg-recovery-reference-v1 sg-recovery-complete-v3"
                    dir={language === "AR" ? "rtl" : "ltr"}
                  >
                    <h3>
                      {language === "EN" ? "Verify Email" : language === "AR" ? "التحقق من البريد الإلكتروني" : "Verifikasi Email"}
                    </h3>

                    <p>
                      {language === "EN"
                        ? "Enter the 6-digit code sent to your email. Valid for 5 minutes."
                        : language === "AR"
                          ? "أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني. صالح لمدة 5 دقائق."
                          : "Masukkan kode 6 digit yang dikirim ke email Anda. Berlaku 5 menit."}
                    </p>

                    <div className="sg-recovery-email-card-v3">
                      <span className="sg-recovery-mail-icon" aria-hidden="true">
                        ✉
                      </span>

                      <span className="sg-recovery-email-address" title={authEmail}>
                        {authEmail}
                      </span>

                      <button
                        type="button"
                        className="sg-recovery-change-email"
                        disabled={authBusy}
                        onClick={() => {
                          setRecoveryChallengeId("");
                          setRecoveryCode("");
                          setAuthError("");
                          setAuthStep("forgot-password");
                        }}
                      >
                        {language === "EN" ? "Change Email" : language === "AR" ? "تغيير البريد" : "Ubah Email"}
                      </button>
                    </div>

                    <label>
                      {language === "EN" ? "OTP Code" : language === "AR" ? "رمز التحقق" : "Kode OTP"}
                    </label>

                    <SegalokaOtpBoxes
                      value={recoveryCode}
                      onChange={setRecoveryCode}
                      disabled={authBusy}
                    />

                    <button
                      type="submit"
                      disabled={authBusy || recoveryCode.length !== 6}
                    >
                      {authBusy ? "..." : language === "EN" ? "Verify Code" : language === "AR" ? "تحقق من الرمز" : "Verifikasi Kode"}
                    </button>

                    <div className="sg-recovery-resend-v3">
                      <span>
                        {language === "EN" ? "Didn't receive the code?" : language === "AR" ? "لم يصلك الرمز؟" : "Tidak menerima kode?"}
                      </span>

                      <button
                        type="button"
                        disabled={authBusy || recoveryResendSeconds > 0}
                        onClick={() => void resendRecoveryOtp()}
                      >
                        {language === "EN" ? "Resend Code" : language === "AR" ? "إعادة إرسال الرمز" : "Kirim Ulang Kode"}
                      </button>

                      {recoveryResendSeconds > 0 && (
                        <span className="sg-recovery-countdown">
                          ({String(Math.floor(recoveryResendSeconds / 60)).padStart(2, "0")}:
                          {String(recoveryResendSeconds % 60).padStart(2, "0")})
                        </span>
                      )}
                    </div>

                    <div className="sg-recovery-footer-v3">
                      <button
                        type="button"
                        className="sg-recovery-back"
                        disabled={authBusy}
                        onClick={() => {
                          setRecoveryChallengeId("");
                          setRecoveryCode("");
                          setAuthError("");
                          setAuthStep("forgot-password");
                        }}
                      >
                        <span aria-hidden="true">←</span>
                        {language === "EN" ? "Back to Email" : language === "AR" ? "العودة إلى البريد" : "Kembali ke Email"}
                      </button>
                    </div>
                  </form>                ) : authStep === "forgot-new-password" ? (
                  <form
                    onSubmit={submitRecoveryNewPassword}
                    className="sg-auth-login-form sg-recovery-content sg-recovery-reference-v1"
                    dir={language === "AR" ? "rtl" : "ltr"}
                  >
                    <h3>{language === "EN" ? "New Password" : language === "AR" ? "كلمة مرور جديدة" : "Kata Sandi Baru"}</h3>
                    <p>
                      {language === "EN"
                        ? "Create a new password with at least 12 characters."
                        : language === "AR"
                          ? "أنشئ كلمة مرور جديدة تتكون من 12 حرفًا على الأقل."
                          : "Buat kata sandi baru minimal 12 karakter."}
                    </p>
                    <label htmlFor="sg-recovery-new-password">Kata Sandi Baru</label>
                    <input
                      id="sg-recovery-new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      value={recoveryNewPassword}
                      onChange={(event) => setRecoveryNewPassword(event.target.value)}
                    />
                    <label htmlFor="sg-recovery-confirm-password">Konfirmasi Kata Sandi</label>
                    <input
                      id="sg-recovery-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      value={recoveryConfirmPassword}
                      onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                    />
                    <button type="submit" disabled={authBusy}>
                      {authBusy ? "..." : language === "EN" ? "Save New Password" : language === "AR" ? "حفظ كلمة المرور الجديدة" : "Simpan Kata Sandi Baru"}
                    </button>
                  </form>
                ) : authStep === "login" ? (
                  <form onSubmit={submitEmailLogin} className="sg-auth-login-form sg-login-reference">
  <label htmlFor="sg-login-email">{authLabels.email}</label>

  <div className="sg-login-field">
    <Mail size={17} aria-hidden="true" />
    <input
      id="sg-login-email"
      type="email"
      autoComplete="username"
      dir="ltr"
      required
      maxLength={254}
      placeholder={
        language === "EN"
          ? "Enter your email address"
          : language === "AR"
            ? "أدخل بريدك الإلكتروني"
            : "Masukkan alamat email Anda"
      }
      value={authEmail}
      onChange={(event) => setAuthEmail(event.target.value)}
    />
  </div>

  <label htmlFor="sg-login-password">{authLabels.password}</label>

  <div className="sg-login-field">
    <LockKeyhole size={17} aria-hidden="true" />
    <input
      id="sg-login-password"
      type={showLoginPassword ? "text" : "password"}
      autoComplete="current-password"
      required
      placeholder={
        language === "EN"
          ? "Enter your password"
          : language === "AR"
            ? "أدخل كلمة المرور"
            : "Masukkan kata sandi Anda"
      }
      value={authPassword}
      onChange={(event) => setAuthPassword(event.target.value)}
    />
    <button
      type="button"
      className="sg-login-eye-v4"
      aria-label={showLoginPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      aria-pressed={showLoginPassword}
      onClick={() => setShowLoginPassword((value) => !value)}
    >
      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>

  <div className="sg-login-recovery-links">
    <button
      type="button"
      onClick={() => { setAuthStep("forgot-email"); setAuthError(""); setLoginRecoveryNotice(""); }}
    >
      {language === "EN" ? "Forgot Email?" : language === "AR" ? "نسيت البريد الإلكتروني؟" : "Lupa Email?"}
    </button>

    <button
      type="button"
      onClick={() => {
        setAuthStep("forgot-password");
        setAuthError("");
        setLoginRecoveryNotice("");
        setAuthPassword("");
      }}
    >
      {language === "EN" ? "Forgot Password?" : language === "AR" ? "نسيت كلمة المرور؟" : "Lupa Kata Sandi?"}
    </button>
  </div>

  {loginRecoveryNotice && (
    <p role="status" className="sg-login-recovery-notice">
      {loginRecoveryNotice}
    </p>
  )}

  <button type="submit" className="sg-login-submit-v4" disabled={authBusy}>
    <span>{authBusy ? "..." : authLabels.login}</span>
    <ArrowRight size={18} aria-hidden="true" />
  </button>
</form>
                ) : authStep === "otp-method" ? (
                  <div className="sg-auth-login-form">
                    <p>
                      {language === "EN"
                        ? "Choose one available verification method."
                        : language === "AR"
                          ? "اختر طريقة تحقق واحدة متاحة."
                          : "Pilih satu metode verifikasi yang tersedia."}
                    </p>
                    {loginAvailableMethods.map((method) => (
                      <button
                        key={method}
                        type="button"
                        disabled={authBusy}
                        onClick={() => void selectLoginMethod(method)}
                      >
                        {method === "authenticator"
                          ? "Google Authenticator"
                          : method === "email"
                            ? "Email"
                            : "WhatsApp"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={submitEmailOtp} className="sg-auth-login-form">
                    <label htmlFor="sg-login-otp">{authLabels.otp}</label>
                    <input
                      id="sg-login-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      dir="ltr"
                      required
                      className="sg-auth-otp-input"
                      value={authCode}
                      onChange={(event) =>
                        setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                    />

                    <button
                      type="submit"
                      disabled={authBusy || authCode.length !== 6}
                    >
                      {authBusy ? "..." : authLabels.verify}
                    </button>
                  </form>
                )}

                {authError && (
                  <p role="alert" className="sg-auth-login-error">
                    {authError}
                  </p>
                )}
              </div>
            )}

            {authStep === "options" && (
            <div className="sg-auth-modal-actions">

  <a
    href="https://api.segaloka.com/auth/google/start"
    className="sg-auth-provider sg-auth-google"
  >
    <span
  aria-hidden="true"
  style={{
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }}
>
  <img
    src="/images/auth/google.svg"
    alt=""
    width={22}
    height={22}
    style={{ objectFit: "contain" }}
  />
</span>
    <strong>{t("auth.google")}</strong>
  </a>

  <button
    type="button"
    className="sg-auth-provider sg-auth-email"
    onClick={() => {
      setAuthError("");
      setAuthStep(authMode === "register" ? "register-email" : "login-email");
    }}
  >
    <img
      src="/images/auth/phone.svg"
      alt=""
      width={24}
      height={24}
    />
    <strong>{t("auth.phone")}</strong>
  </button>

  <button
    type="button"
    className="sg-auth-provider sg-auth-email"
    onClick={() => {
      setAuthError("");
      setAuthStep(authMode === "register" ? "register-email" : "login-email");
    }}
  >
    <img
      src="/images/auth/email.svg"
      alt=""
      width={24}
      height={24}
    />
    <strong>{t("auth.email")}</strong>
  </button>

</div>
            )}
{authStep === "login" && (
  <div className="sg-login-social-v4">
    <div className="sg-login-divider-v4">
      <span>{language === "EN" ? "or" : language === "AR" ? "أو" : "atau"}</span>
    </div>
    <div className="sg-login-providers-v4">
      <a href="https://api.segaloka.com/auth/google/start">
        <img src="/images/auth/google.svg" alt="" width={18} height={18} />
        <span>Google</span>
      </a>
      <button
        type="button"
        disabled
        title="Login WhatsApp belum tersedia"
      >
        <svg
  width="19"
  height="19"
  viewBox="0 0 32 32"
  aria-hidden="true"
  focusable="false"
>
  <path
    fill="#25D366"
    d="M16 .5C7.44.5.5 7.44.5 16c0 2.74.72 5.42 2.08 7.78L.5 31.5l7.93-2.08A15.43 15.43 0 0 0 16 31.5c8.56 0 15.5-6.94 15.5-15.5S24.56.5 16 .5z"
  />
  <path
    fill="#fff"
    d="M24.55 20.24c-.36-.18-2.12-1.05-2.45-1.17-.33-.12-.57-.18-.81.18-.24.36-.93 1.17-1.14 1.41-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.79-1.07-.95-1.79-2.12-2-2.48-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61h-.69c-.24 0-.63.09-.96.45-.33.36-1.26 1.23-1.26 3s1.29 3.48 1.47 3.72c.18.24 2.54 3.88 6.15 5.44.86.37 1.53.59 2.05.75.86.27 1.64.23 2.26.14.69-.1 2.12-.87 2.42-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42z"
  />
</svg>
        <span>WhatsApp</span>
      </button>
    </div>
  </div>
)}



            <div className="sg-auth-legal" hidden={authStep === "forgot-email" || authStep === "forgot-password" || authStep === "forgot-otp" || authStep === "forgot-new-password"}>
              {t("auth.consentPrefix")}{" "}
              <a href="/syarat-ketentuan" target="_blank" rel="noopener noreferrer">
                {t("auth.terms")}
              </a>
              {" "}{t("auth.and")}{" "}
              <a href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer">
                {t("auth.privacy")}
              </a>
              {" Segaloka."}
            </div>
{authStep === "login" && (
  <div className="sg-login-register-v4">
    <span>
      {language === "EN"
        ? "Don't have an account?"
        : language === "AR"
          ? "ليس لديك حساب؟"
          : "Belum punya akun?"}
    </span>
    <button
      type="button"
      onClick={() => {
        setAuthMode("register");
        setAuthStep("register-email");
        setAuthError("");
        setLoginRecoveryNotice("");
      }}
    >
      {language === "EN"
        ? "Register now"
        : language === "AR"
          ? "سجّل الآن"
          : "Daftar sekarang"}
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  </div>
)}


            

          </div>
        </div>
      , document.body)}
</header>
  );
}