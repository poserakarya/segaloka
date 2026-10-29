"use client";

import { useState } from "react";

type CouponCopyButtonProps = {
  code: string;
};

export function CouponCopyButton({
  code,
}: CouponCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyCoupon() {
    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      const textarea =
        document.createElement("textarea");

      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.select();

      document.execCommand("copy");

      document.body.removeChild(textarea);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    }
  }

  return (
    <button
      type="button"
      className={[
        "reference-coupon-copy",
        copied ? "copied" : "",
      ].join(" ")}
      onClick={copyCoupon}
      aria-label={`Salin kode kupon ${code}`}
    >
      {copied ? "Tersalin" : "Copy"}
    </button>
  );
}
