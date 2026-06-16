import {
  authHeaders,
  fetchWithBaseUrlFallback,
} from "./authApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IncidentPayload {
  userId: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  severityLevel?: string;
  timing: string;
  victim?: string;
  attackers?: string;
  deathToll?: number;
  injuryCount?: number;
  peopleHelped?: number;
  stories?: string[];
}

export interface IncidentRecord {
  id: string;
  userId: string;
  title: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  severityLevel: string | null;
  timing: string;
  status: string | null;
  victim: string | null;
  attackers: string | null;
  deathToll: number;
  injuryCount: number;
  peopleHelped: number;
  stories: string[];
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const headers = await authHeaders();
  const res = await fetchWithBaseUrlFallback(path, {
    ...init,
    headers: { ...headers, ...init.headers },
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (raw as any)?.message ||
      (raw as any)?.error ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return (raw as ApiResponse<T>).data ?? raw;
}

// ---------------------------------------------------------------------------
// Incident API calls
// ---------------------------------------------------------------------------

/** Create a new incident report. */
export async function createIncident(
  payload: IncidentPayload,
): Promise<IncidentRecord> {
  return apiFetch<IncidentRecord>("/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Get all incidents. */
export async function getAllIncidents(): Promise<IncidentRecord[]> {
  return apiFetch<IncidentRecord[]>("/incidents", {
    method: "GET",
  });
}

/** Get a single incident by ID. */
export async function getIncidentById(
  id: string,
): Promise<IncidentRecord> {
  return apiFetch<IncidentRecord>(`/incidents/${id}`, {
    method: "GET",
  });
}

/** Get incidents created by a specific user. */
export async function getIncidentsByUserId(
  userId: string,
): Promise<IncidentRecord[]> {
  return apiFetch<IncidentRecord[]>(`/incidents/user/${userId}`, {
    method: "GET",
  });
}

/** Update an incident. */
export async function updateIncident(
  id: string,
  payload: Partial<IncidentPayload>,
): Promise<IncidentRecord> {
  return apiFetch<IncidentRecord>(`/incidents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Delete an incident. */
export async function deleteIncident(id: string): Promise<void> {
  return apiFetch<void>(`/incidents/${id}`, {
    method: "DELETE",
  });
}
