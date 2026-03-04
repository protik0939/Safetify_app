/**
 * usePushNotifications Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * This hook manages the full push notification lifecycle:
 *
 *  1. PERMISSION  — asks the user to allow notifications on first run.
 *  2. TOKEN       — obtains an Expo Push Token that identifies THIS device
 *                   on Expo's push service (only on real devices).
 *  3. FOREGROUND  — a listener that fires while the app is open.
 *  4. RESPONSE    — a listener that fires when the user TAPS a notification
 *                   (works in foreground, background, and terminated state).
 *
 * Concept map
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Your Server  ──► Expo Push API ──► FCM / APNs ──► Device │
 * │                                                             │
 * │   OR (for local/test notifications):                        │
 * │   scheduleNotificationAsync() ─────────────────► Device    │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Token types
 *   • Expo Push Token  – used with Expo's managed push service (easiest)
 *   • FCM/APNs Token   – raw platform token for your own server integration
 */

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// ── Type-only imports ─────────────────────────────────────────────────────────
// These are erased at compile time and generate NO runtime require() calls,
// so they are safe to use even in Expo Go.
import type * as DeviceModule from "expo-device";
import type * as NotificationsModule from "expo-notifications";

/**
 * True when running inside Expo Go.
 *
 * expo-notifications' DevicePushTokenAutoRegistration.fx.js registers a push
 * token listener the moment expo-notifications/build/index.js is loaded
 * (it runs at module evaluation time, not inside any function). Since SDK 53
 * this causes an unrecoverable ERROR in Expo Go.
 *
 * The only way to suppress it is to never call require("expo-notifications")
 * in Expo Go at all. We use lazy conditional require() below so Metro does
 * not execute the module in Expo Go.
 *
 * Use `expo run:android` / `expo run:ios` for a development build where full
 * push-notification support is available.
 */
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PushNotificationState {
  /** The Expo push token for this device – send this to your backend */
  expoPushToken: string | null;
  /** The most recently received notification object */
  notification: NotificationsModule.Notification | null;
  /** Whether the user has granted notification permission */
  permissionGranted: boolean;
  /** Any error that occurred during setup */
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePushNotifications(): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<NotificationsModule.Notification | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<{ remove(): void } | null>(null);
  const responseListener = useRef<{ remove(): void } | null>(null);

  useEffect(() => {
    (async () => {
      // ── Expo Go guard ───────────────────────────────────────────────────────
      // Do NOT require("expo-notifications") in Expo Go. Its module-level code
      // (DevicePushTokenAutoRegistration.fx.js) fires addPushTokenListener()
      // immediately on load, which throws an unrecoverable ERROR in SDK 53+.
      if (IS_EXPO_GO) {
        console.info(
          "[Push] Skipping push notifications: Expo Go does not support " +
            "remote notifications since SDK 53. Run `expo run:android` or " +
            "`expo run:ios` to use a development build.",
        );
        return;
      }

      // Lazy import – only executed here, never at module load time.
      const Notifications = await import("expo-notifications") as typeof NotificationsModule;

    // ── Global notification handler ─────────────────────────────────────────
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // ── 1. Request permission & get push token ──────────────────────────────
    registerForPushNotificationsAsync(Notifications)
      .then((result) => {
        if (result.token) {
          setExpoPushToken(result.token);
          setPermissionGranted(true);
        } else {
          setPermissionGranted(false);
          if (result.error) setError(result.error);
        }
      })
      .catch((err) => setError(String(err)));

    // ── 2. Foreground listener ──────────────────────────────────────────────
    notificationListener.current =
      Notifications.addNotificationReceivedListener((incoming) => {
        console.log("[Push] Notification received in foreground:", incoming);
        setNotification(incoming);
      });

    // ── 3. Response (tap) listener ──────────────────────────────────────────
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("[Push] User tapped notification. Data payload:", data);
        // Navigation example:
        // router.push(data.screen as string);
      });

      // ── Cleanup ─────────────────────────────────────────────────────────────
      return () => {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    })();
  }, []);

  return { expoPushToken, notification, permissionGranted, error };
}

// ─── Helper: request permission & resolve token ───────────────────────────────
async function registerForPushNotificationsAsync(
  Notifications: typeof NotificationsModule,
): Promise<{ token: string | null; error: string | null }> {
  const Device = await import("expo-device") as typeof DeviceModule;

  // Push tokens only work on physical devices.
  if (!Device.isDevice) {
    console.warn(
      "[Push] Running on simulator – local notifications work, remote push tokens do not.",
    );
    return { token: null, error: null };
  }

  // Android: create a notification channel (required for Android 8+)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("safetify-alerts", {
      name: "Safetify Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ef4444",
      sound: "default",
    });
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return {
      token: null,
      error: "Permission to send push notifications was denied.",
    };
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log("[Push] Expo Push Token:", token);
    return { token, error: null };
  } catch (err) {
    return { token: null, error: String(err) };
  }
}
