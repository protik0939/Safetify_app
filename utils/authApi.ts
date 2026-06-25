import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { router } from "expo-router";

const PRIMARY_BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1`;

// Current local API fallback (used only if the hosted API is unavailable).
const FALLBACK_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:5000/api/v1"
    : "http://localhost:5000/api/v1";

export const BASE_URL = PRIMARY_BASE_URL;

const SESSION_TOKEN_KEY = "safetify_session_token";

/** Persist the better-auth session token so it survives app restarts. */
export async function saveSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
}

/** Retrieve the stored session token (null if not logged in). */
export async function getSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

/** Remove the session token on logout. */
export async function clearSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
}

/** Build Authorization header from the stored token, if present. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ---------------------------------------------------------------------------
// Types – mirroring the better-auth / Prisma `user` model exactly
// ---------------------------------------------------------------------------

export interface RegisterPayload {
  name: string;
  email: string;
  contactNo: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Fields returned by better-auth on the `user` object. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  address: string;
  contactNo: string;
  bloodGroup: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  accountStatus: string;
  deletedAt: string | null;
}

/** Top-level response from /auth/register and /auth/login. */
export interface AuthResponse {
  user: AuthUser;
  /** better-auth session token (used as Bearer token for subsequent calls). */
  token: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    await clearSessionToken();
    useAppStore.getState().logout();
    router.replace("/login");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchWithBaseUrlFallback(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const primaryUrl = `${PRIMARY_BASE_URL}${path}`;

  try {
    const primaryRes = await fetch(primaryUrl, init);
    // If endpoint is missing/unavailable, retry with current local API.
    if (![404, 502, 503, 504].includes(primaryRes.status)) {
      return primaryRes;
    }
  } catch {
    // Network-level failure on primary API will fall back below.
  }

  return fetch(`${FALLBACK_BASE_URL}${path}`, init);
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

export async function registerUser(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const res = await fetchWithBaseUrlFallback("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.json().catch(() => ({}));
  // 🔍 DEBUG – remove once confirmed working
  console.log("[registerUser] raw response:", JSON.stringify(raw, null, 2));

  if (!res.ok) {
    const message =
      (raw as any)?.message ||
      (raw as any)?.error ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  // Support both flat { token, user } and wrapped { data: { token, user } }
  const data: AuthResponse = (raw as any)?.data ?? raw;
  console.log(
    "[registerUser] mapped data – token:",
    data.token,
    "user.id:",
    data.user?.id,
  );

  if (data.token) await saveSessionToken(data.token);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetchWithBaseUrlFallback("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.json().catch(() => ({}));
  // 🔍 DEBUG – remove once confirmed working
  // console.log("[loginUser] raw response:", JSON.stringify(raw, null, 2));

  if (!res.ok) {
    const message = `Request failed (${res.status})`;
    throw new Error(message);
  }

  // Support both flat { token, user } and wrapped { data: { token, user } }
  const data: AuthResponse = raw?.data ?? raw;
  console.log(
    "[loginUser] mapped data – token:",
    data.token,
    "user.id:",
    data.user?.id,
  );

  if (data.token) await saveSessionToken(data.token);
  return data;
}

export async function getUser(userId: string): Promise<any> {
  try {
    const headers = await authHeaders();
    const res = await fetchWithBaseUrlFallback(`/user/${userId}`, {
      method: "GET",
      headers,
    });
    return handleResponse<any>(res);
  } catch (e) {
    console.error("Error fetching user:", e);
    return null;
  }
}

export async function updateUser(userId: string, payload: any): Promise<any> {
  const headers = await authHeaders();
  // Using PUT as PATCH might not be supported and returning 404.
  const res = await fetchWithBaseUrlFallback(`/user/${userId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(res);
}

export async function sendOTP(email: string): Promise<any> {
  const res = await fetchWithBaseUrlFallback("/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse<any>(res);
}

export async function verifyOTP(email: string, otp: string): Promise<any> {
  const res = await fetchWithBaseUrlFallback("/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  return handleResponse<any>(res);
}
