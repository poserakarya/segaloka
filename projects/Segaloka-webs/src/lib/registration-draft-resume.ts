export async function resolveRegistrationDraft(
  applicationType: "travel" | "vendor",
  payload: Record<string, unknown>,
): Promise<string> {
  const response = await fetch("/api/registration/applications/draft", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ applicationType, payload }),
  });

  const result = await response.json();

  if (response.ok) {
    if (typeof result.id !== "string") {
      throw new Error("INVALID_APPLICATION_ID");
    }
    return result.id;
  }

  if (response.status !== 409 || result.code !== "APPLICATION_EXISTS") {
    throw new Error(result.code || "REGISTRATION_DRAFT_FAILED");
  }

  const mineResponse = await fetch("/api/registration/applications/mine", {
    cache: "no-store",
  });

  if (!mineResponse.ok) {
    throw new Error("REGISTRATION_RESUME_UNAVAILABLE");
  }

  const mine = await mineResponse.json();
  const existing = Array.isArray(mine.items)
    ? mine.items.find(
        (item: { id?: string; applicationType?: string }) =>
          item.id === result.id && item.applicationType === applicationType,
      )
    : null;

  if (!existing || !["draft", "revision_required"].includes(existing.status)) {
    throw new Error("APPLICATION_ALREADY_SUBMITTED");
  }

  const updateResponse = await fetch(
    `/api/registration/applications/${existing.id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload }),
    },
  );

  if (!updateResponse.ok) {
    const error = await updateResponse.json().catch(() => ({}));
    throw new Error(error.code || "REGISTRATION_UPDATE_FAILED");
  }

  return existing.id;
}

export async function getRegistrationDocumentTypes(
  applicationId: string,
): Promise<Set<string>> {
  const response = await fetch(
    `/api/registration/applications/${applicationId}/documents`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("REGISTRATION_DOCUMENT_METADATA_FAILED");
  }

  const result = await response.json();

  if (!Array.isArray(result.items)) {
    throw new Error("REGISTRATION_DOCUMENT_METADATA_INVALID");
  }

  return new Set(
    result.items
      .map((item: { documentType?: string }) => item.documentType)
      .filter((value: unknown): value is string => typeof value === "string"),
  );
}

export type ExistingRegistrationDraft = {
  id: string;
  applicationType: "travel" | "vendor";
  status: "draft" | "revision_required";
  payload: Record<string, unknown>;
};

export async function loadExistingRegistrationDraft(
  applicationType: "travel" | "vendor",
): Promise<ExistingRegistrationDraft | null> {
  const response = await fetch("/api/registration/applications/mine", {
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("REGISTRATION_DRAFT_LOAD_FAILED");
  }

  const result = await response.json();

  if (!Array.isArray(result.items)) {
    throw new Error("REGISTRATION_DRAFT_RESPONSE_INVALID");
  }

  const existing = result.items.find(
    (item: {
      applicationType?: string;
      status?: string;
    }) =>
      item.applicationType === applicationType &&
      (item.status === "draft" ||
        item.status === "revision_required"),
  );

  if (!existing) {
    return null;
  }

  if (
    typeof existing.id !== "string" ||
    !existing.payload ||
    typeof existing.payload !== "object" ||
    Array.isArray(existing.payload)
  ) {
    throw new Error("REGISTRATION_DRAFT_INVALID");
  }

  return {
    id: existing.id,
    applicationType,
    status: existing.status,
    payload: existing.payload,
  };
}