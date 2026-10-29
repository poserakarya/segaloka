import { PDFDocument } from "pdf-lib";

import type {
  VisaApplicantResult,
  VisaResultProgress,
} from "@/lib/visa/visa-result";

export type VisaDownloadFilter =
  | "all"
  | "approved"
  | "rejected"
  | "issued";

type VisaDownloadFile = {
  fileName: string;
  fileType: "pdf" | "jpg" | "jpeg" | "png";
  fileUrl?: string;
};

export type VisaDownloadSummary = {
  applicants: number;
  availableFiles: number;
  unavailableFiles: number;
};

function selectApplicants(
  progress: VisaResultProgress,
  filter: VisaDownloadFilter,
): VisaApplicantResult[] {
  return progress.applicants.filter((applicant) => {
    if (filter === "all") return true;
    if (filter === "issued") return applicant.status === "approved";
    return applicant.status === filter;
  });
}

function collectFiles(
  applicant: VisaApplicantResult,
): VisaDownloadFile[] {
  return applicant.evidence.filter(
    (file) =>
      applicant.status === "approved"
        ? file.type === "approval_letter"
        : applicant.status === "rejected"
          ? file.type === "rejection_letter"
          : false,
  );
}

function collectFilesForFilter(
  applicant: VisaApplicantResult,
  filter: VisaDownloadFilter,
): VisaDownloadFile[] {
  if (filter === "issued") {
    return applicant.status === "approved"
      ? applicant.documents
      : [];
  }

  if (filter === "approved") {
    return applicant.status === "approved"
      ? applicant.evidence.filter(
          (file) => file.type === "approval_letter",
        )
      : [];
  }

  if (filter === "rejected") {
    return applicant.status === "rejected"
      ? applicant.evidence.filter(
          (file) => file.type === "rejection_letter",
        )
      : [];
  }

  return collectFiles(applicant);
}
export function getVisaDownloadSummary(
  progress: VisaResultProgress,
  filter: VisaDownloadFilter,
): VisaDownloadSummary {
  const applicants = selectApplicants(progress, filter);

  const files = applicants.flatMap((applicant) =>
    collectFilesForFilter(applicant, filter),
  );

  return {
    applicants: applicants.length,
    availableFiles: files.filter((file) => !!file.fileUrl).length,
    unavailableFiles: files.filter((file) => !file.fileUrl).length,
  };
}

function getSafeUrl(fileUrl: string): string {
  const url = new URL(fileUrl, window.location.origin);

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    throw new Error("Unsupported document URL.");
  }

  return url.toString();
}

async function appendDocument(
  target: PDFDocument,
  file: VisaDownloadFile,
): Promise<void> {
  if (!file.fileUrl) return;

  const response = await fetch(getSafeUrl(file.fileUrl), {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve ${file.fileName}: ${response.status}`,
    );
  }

  const bytes = await response.arrayBuffer();

  if (file.fileType === "pdf") {
    const source = await PDFDocument.load(bytes);
    const pages = await target.copyPages(
      source,
      source.getPageIndices(),
    );

    for (const page of pages) {
      target.addPage(page);
    }

    return;
  }

  const image =
    file.fileType === "png"
      ? await target.embedPng(bytes)
      : await target.embedJpg(bytes);

  const page = target.addPage([595.28, 841.89]);

  const margin = 32;
  const width = page.getWidth() - margin * 2;
  const height = page.getHeight() - margin * 2;

  const scale = Math.min(
    width / image.width,
    height / image.height,
    1,
  );

  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;

  page.drawImage(image, {
    x: (page.getWidth() - imageWidth) / 2,
    y: (page.getHeight() - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight,
  });
}

export async function downloadVisaResultsPdf(
  progress: VisaResultProgress,
  filter: VisaDownloadFilter,
): Promise<void> {
  const applicants = selectApplicants(progress, filter);

  const target = await PDFDocument.create();

  let appendedFiles = 0;

  for (const applicant of applicants) {
    const files = collectFilesForFilter(applicant, filter);

    for (const file of files) {
      if (!file.fileUrl) continue;

      await appendDocument(target, file);
      appendedFiles++;
    }
  }

  if (appendedFiles === 0) {
    throw new Error("No downloadable Visa documents available.");
  }

  const bytes = await target.save();

  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `Segaloka-Visa-${filter}.pdf`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}