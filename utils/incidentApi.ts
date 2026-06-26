import {
  authHeaders,
  fetchWithBaseUrlFallback,
  clearSessionToken,
} from "./authApi";
import { router } from "expo-router";
import { useAppStore } from "../store/useAppStore";

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
  status?: string;
  images?: string[];
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
  incidentResponders?: Array<{
    id: string;
    responderId: string;
    status: string;
    responder: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  images?: Array<{
    id: string;
    url: string;
    helperValidationId: string | null;
  }>;
  helperValidations?: Array<{
    id: string;
    responderId: string;
    isTrue: boolean;
    comment: string | null;
    createdAt: string;
    responder: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    images?: Array<{
      id: string;
      url: string;
    }>;
  }>;
  truthfulnessPercentage?: number | null;
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

  if (res.status === 401) {
    await clearSessionToken();
    useAppStore.getState().logout();
    router.replace("/login");
  }

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
export async function getAllIncidents(limit?: number, offset?: number): Promise<IncidentRecord[]> {
  const query = [];
  if (limit !== undefined) query.push(`limit=${limit}`);
  if (offset !== undefined) query.push(`offset=${offset}`);
  const queryString = query.length > 0 ? `?${query.join("&")}` : "";
  return apiFetch<IncidentRecord[]>(`/incidents${queryString}`, {
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

/** Get incidents created or responded by a user (History). */
export async function getIncidentHistory(
  userId: string,
): Promise<IncidentRecord[]> {
  return apiFetch<IncidentRecord[]>(`/incidents/history/${userId}`, {
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

/** Abort incident response (remove responder from SOS). */
export async function abortIncidentResponse(
  incidentId: string,
  responderId: string,
): Promise<void> {
  return apiFetch<void>(`/incidents/${incidentId}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responderId }),
  });
}

/** Submit helper validation (vote True/False with comments and proof images) */
export async function validateIncident(
  incidentId: string,
  payload: {
    responderId: string;
    isTrue: boolean;
    comment?: string;
    images?: string[];
  }
): Promise<IncidentRecord> {
  return apiFetch<IncidentRecord>(`/incidents/${incidentId}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

