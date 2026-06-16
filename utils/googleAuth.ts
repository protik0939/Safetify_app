import * as WebBrowser from "expo-web-browser";
import {
  fetchWithBaseUrlFallback,
  saveSessionToken,
  type AuthResponse,
} from "./authApi";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

/**
 * Google Sign-In via better-auth's built-in social OAuth flow.
 *
 * 1. Opens `{backend}/api/v1/auth/signin/social?provider=google` in a browser.
 * 2. better-auth redirects to Google → user authenticates.
 * 3. Google redirects back to `{backend}/api/v1/auth/callback/google`.
 * 4. better-auth creates/finds user, creates session, redirects to `callbackURL`
 *    with the session token.
 * 5. We extract the token, fetch the user profile, and return.
 */
export async function signInWithGoogle(): Promise<AuthResponse> {
  // The deep-link the backend will redirect to after successful auth.
  // better-auth appends the session token as a query parameter.
  const callbackURL = "safetify://google-auth";

  const authUrl = `${BACKEND_URL}/api/v1/auth/signin/social?provider=google&callbackURL=${encodeURIComponent(callbackURL)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackURL);

  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled or failed");
  }

  // The redirect URL contains the session token.
  // Format: safetify://google-auth?token=<session_token>  OR  safetify://google-auth?session_token=...
  const { url } = result;
  const urlObj = new URL(url);
  const token =
    urlObj.searchParams.get("token") ||
    urlObj.searchParams.get("session_token") ||
    urlObj.searchParams.get("better-auth.session_token") ||
    "";

  if (!token) {
    // Sometimes better-auth puts it in the hash fragment
    const hash = urlObj.hash;
    const hashParams = new URLSearchParams(hash.replace(/^#\/?/, ""));
    const hashToken =
      hashParams.get("token") || hashParams.get("session_token") || "";
    if (hashToken) {
      return completeSignIn(hashToken);
    }
    throw new Error(
      "No session token received. The authentication may not have completed.",
    );
  }

  return completeSignIn(token);
}

/**
 * After we have a session token, fetch the user profile and return
 * the same AuthResponse shape the rest of the app expects.
 */
async function completeSignIn(token: string): Promise<AuthResponse> {
  await saveSessionToken(token);

  // Fetch the current user from our own /auth/session endpoint
  const sessionRes = await fetchWithBaseUrlFallback("/auth/session", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (sessionRes.ok) {
    const raw = await sessionRes.json().catch(() => ({}));
    // Response shape: { success, message, data: { session, user } }
    const data = (raw as any)?.data ?? raw;
    const user = data?.user;

    if (user) {
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified ?? true,
          image: user.image ?? null,
          address: user.address ?? "",
          contactNo: user.contactNo ?? "",
          bloodGroup: user.bloodGroup ?? "",
          bio: user.bio ?? "Safetify User",
          createdAt: user.createdAt ?? new Date().toISOString(),
          updatedAt: user.updatedAt ?? new Date().toISOString(),
          role: user.role ?? "USER",
          accountStatus: user.accountStatus ?? "ACTIVE",
          deletedAt: user.deletedAt ?? null,
        },
      };
    }
  }

  throw new Error("Failed to fetch user profile after Google sign-in");
}
