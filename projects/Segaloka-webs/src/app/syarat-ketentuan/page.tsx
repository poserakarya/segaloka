import type {
  Metadata,
} from "next";

import {
  LegalPage,
} from "@/components/legal/LegalPage";

import {
  getLegalDocument,
} from "@/data/legal-content";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | Segaloka",
  description:
    "Syarat dan ketentuan penggunaan platform Segaloka.",
};

export default function TermsPage() {
  return (
    <LegalPage
      document={getLegalDocument(
        "syarat-ketentuan",
      )}
    />
  );
}