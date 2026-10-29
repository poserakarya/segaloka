export type VisaProgressStage =
  | "payment"
  | "consultation"
  | "documents"
  | "submission"
  | "result"
  | "completed";

export type VisaProgressStatus =
  | "waiting"
  | "active"
  | "done";

export type VisaProgressItem = {
  stage: VisaProgressStage;
  status: VisaProgressStatus;
};

export type VisaProgressSnapshot = {
  currentStage: VisaProgressStage;

  /**
   * Canonical timestamp when the whole Visa process
   * was marked completed.
   *
   * UI must not manufacture this timestamp.
   * Production value will come from the order backend.
   */
  completedAt: string | null;
};

export const VISA_PROGRESS_ORDER:
  readonly VisaProgressStage[] = [
    "payment",
    "consultation",
    "documents",
    "submission",
    "result",
    "completed",
  ];

export function getVisaProgressItems(
  snapshot: VisaProgressSnapshot,
): VisaProgressItem[] {
  const currentIndex =
    VISA_PROGRESS_ORDER.indexOf(
      snapshot.currentStage,
    );

  if (currentIndex < 0) {
    throw new Error(
      "Invalid Visa progress stage.",
    );
  }

  return VISA_PROGRESS_ORDER.map(
    (stage, index) => ({
      stage,

      status:
        index < currentIndex
          ? "done"
          : index === currentIndex
            ? "active"
            : "waiting",
    }),
  );
}

export function isVisaCompleted(
  snapshot: VisaProgressSnapshot,
): boolean {
  return (
    snapshot.currentStage ===
    "completed"
  );
}

export function assertVisaProgressSnapshot(
  snapshot: VisaProgressSnapshot,
): void {
  const completed =
    isVisaCompleted(snapshot);

  if (
    completed &&
    !snapshot.completedAt
  ) {
    throw new Error(
      "Completed Visa progress requires completedAt.",
    );
  }

  if (
    !completed &&
    snapshot.completedAt
  ) {
    throw new Error(
      "completedAt is only valid for completed Visa progress.",
    );
  }

  if (
    snapshot.completedAt &&
    !Number.isFinite(
      Date.parse(snapshot.completedAt),
    )
  ) {
    throw new Error(
      "Invalid Visa completedAt timestamp.",
    );
  }
}