export type TrackingActor =
  | "SYSTEM"
  | "SEGALOKA"
  | "VENDOR"
  | "TRAVELER";

export type TrackingStatus =
  | "INFORMATIONAL"
  | "WAITING_VENDOR"
  | "WAITING_TRAVELER"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "REVISION_REQUIRED"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type TrackingActionType =
  | "CONFIRM"
  | "REQUEST_CHANGE"
  | "UPLOAD_DOCUMENT"
  | "UPLOAD_REVISION"
  | "DOWNLOAD_DOCUMENT"
  | "VIEW_DOCUMENT"
  | "OPEN_CHAT"
  | "VIEW_DETAILS";

export type TrackingAction = {
  id: string;
  type: TrackingActionType;
  label: string;
  enabled?: boolean;
};

export type TrackingLocation = {
  name: string;
  address?: string;
  mapUrl?: string;
};

export type TrackingSchedule = {
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  location?: TrackingLocation;
};

export type TrackingEvent = {
  id: string;

  title: string;
  description?: string;

  status: TrackingStatus;
  actor: TrackingActor;
  actorName?: string;

  createdAt: string;

  travelerId?: string;
  travelerName?: string;

  schedule?: TrackingSchedule;

  actions?: TrackingAction[];

  metadata?: Record<string, string | number | boolean | null>;
};

export type TrackingTimelineProps = {
  title?: string;
  description?: string;
  events: TrackingEvent[];
  currentTravelerId?: string;
  emptyText?: string;
  onAction?: (
    event: TrackingEvent,
    action: TrackingAction,
  ) => void;
};
