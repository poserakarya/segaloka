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
  title: "Kebijakan Privasi | Segaloka",
  description:
    "Kebijakan privasi platform Segaloka.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      document={getLegalDocument(
        "kebijakan-privasi",
      )}
    />
  );
}