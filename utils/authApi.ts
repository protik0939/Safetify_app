import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Android emulator uses 10.0.2.2 to reach the host machine's localhost
export const BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.110.189:5000/api/v1"
    : "http://localhost:5000/api/v1";

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as any)?.message ||
      (data as any)?.error ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

export async function registerUser(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
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
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.json().catch(() => ({}));
  // 🔍 DEBUG – remove once confirmed working
  console.log("[loginUser] raw response:", JSON.stringify(raw, null, 2));

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
    "[loginUser] mapped data – token:",
    data.token,
    "user.id:",
    data.user?.id,
  );

  if (data.token) await saveSessionToken(data.token);
  return data;
}
