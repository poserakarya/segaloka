export type ChatLifecycleState =
  | "locked"
  | "active"
  | "grace_period"
  | "closed";

export type ChatLifecycleInput = {
  paymentConfirmed: boolean;

  /**
   * Canonical completion timestamp from the order system.
   * Must eventually come from the backend/database.
   */
  completedAt: string | null;

  /**
   * Injected current time makes the rule deterministic
   * and testable. Production server supplies trusted time.
   */
  now: Date;
};

export type ChatLifecycleResult = {
  state: ChatLifecycleState;

  canRead: boolean;
  canSearch: boolean;

  canSendMessage: boolean;
  canSendAttachment: boolean;

  closesAt: string | null;
  remainingMs: number | null;
};

export const VISA_CHAT_GRACE_PERIOD_MS =
  48 * 60 * 60 * 1000;

export function getVisaChatLifecycle(
  input: ChatLifecycleInput,
): ChatLifecycleResult {
  if (!input.paymentConfirmed) {
    return {
      state: "locked",

      canRead: false,
      canSearch: false,

      canSendMessage: false,
      canSendAttachment: false,

      closesAt: null,
      remainingMs: null,
    };
  }

  if (!input.completedAt) {
    return {
      state: "active",

      canRead: true,
      canSearch: true,

      canSendMessage: true,
      canSendAttachment: true,

      closesAt: null,
      remainingMs: null,
    };
  }

  const completedAtMs =
    Date.parse(input.completedAt);

  if (!Number.isFinite(completedAtMs)) {
    throw new Error(
      "Invalid Visa completion timestamp.",
    );
  }

  const closesAtMs =
    completedAtMs +
    VISA_CHAT_GRACE_PERIOD_MS;

  const remainingMs =
    Math.max(
      0,
      closesAtMs - input.now.getTime(),
    );

  if (remainingMs > 0) {
    return {
      state: "grace_period",

      canRead: true,
      canSearch: true,

      canSendMessage: true,
      canSendAttachment: true,

      closesAt:
        new Date(closesAtMs).toISOString(),

      remainingMs,
    };
  }

  return {
    state: "closed",

    /*
     * Closing the chat does NOT delete history.
     * Traveler and Vendor can still review/search it.
     */
    canRead: true,
    canSearch: true,

    canSendMessage: false,
    canSendAttachment: false,

    closesAt:
      new Date(closesAtMs).toISOString(),

    remainingMs: 0,
  };
}