/**
 * notifications.ts – Notification scheduling utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * These functions let you schedule LOCAL notifications directly from the app
 * without any server. Perfect for:
 *   • Testing the notification UI during development
 *   • Offline alerts (danger-zone entry, SOS countdown, etc.)
 *
 * Notification anatomy
 * ┌──────────────────────────────────────────────────────────────┐
 * │  Title   – bold headline                                     │
 * │  Body    – main message text                                 │
 * │  Data    – arbitrary JSON your app reads when user taps      │
 * │  Trigger – WHEN to fire (null = immediately)                 │
 * └──────────────────────────────────────────────────────────────┘
 */

import * as Notifications from "expo-notifications";

// ─── Core helper ──────────────────────────────────────────────────────────────
/**
 * Schedule (or immediately fire) a local notification.
 * Returns the notification identifier so you can cancel it later.
 */
export async function scheduleLocalNotification(options: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Seconds from now before the notification fires. Default = 0 (immediate) */
  delaySeconds?: number;
  /** Badge count to set on the app icon (iOS) */
  badge?: number;
}): Promise<string> {
  const { title, body, data = {}, delaySeconds = 0, badge = 1 } = options;

  const trigger: Notifications.NotificationTriggerInput =
    delaySeconds > 0
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        }
      : null; // null = fire immediately

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      badge,
      sound: "default",
      // Android-specific channel (must match the channel created in the hook)
      // @ts-ignore – channelId is an Android-only field
      channelId: "safetify-alerts",
    },
    trigger,
  });

  console.log(
    `[Notifications] Scheduled "${title}" with id=${id}, delay=${delaySeconds}s`,
  );
  return id;
}

/** Cancel a previously scheduled notification by its id */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
  console.log(`[Notifications] Cancelled notification id=${id}`);
}

/** Cancel every pending scheduled notification */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("[Notifications] All scheduled notifications cancelled");
}

/** Get all currently scheduled (pending) notifications */
export async function getPendingNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  console.log("[Notifications] Pending count:", pending.length);
  return pending;
}

/** Reset the app icon badge count to zero (iOS) */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ─── Pre-built notification templates for Safetify ───────────────────────────

/** Fires immediately – simulates an SOS alert received from another user */
export function sendSOSAlert(userName: string, location: string) {
  return scheduleLocalNotification({
    title: "🚨 SOS Alert Nearby!",
    body: `${userName} needs help at ${location}. Tap to respond.`,
    data: { type: "sos_alert", screen: "/incidents" },
  });
}

/** Fires immediately – simulates entering a danger zone */
export function sendDangerZoneWarning(zoneName: string, severity: string) {
  return scheduleLocalNotification({
    title: `⚠️ Danger Zone Detected`,
    body: `You are near a ${severity} danger zone: ${zoneName}. Stay alert.`,
    data: { type: "danger_zone", severity },
  });
}

/** Fires immediately – simulates an emergency contact update */
export function sendEmergencyContactAlert(contactName: string) {
  return scheduleLocalNotification({
    title: "📱 Emergency Contact Alert",
    body: `${contactName} has triggered an SOS. Your support may be needed.`,
    data: { type: "contact_sos" },
  });
}

/** Fires after a countdown – simulates a check-in reminder */
export function sendCheckInReminder(delaySeconds: number = 10) {
  return scheduleLocalNotification({
    title: "🔔 Safety Check-In",
    body: "You haven't checked in. Are you safe? Tap to confirm.",
    data: { type: "check_in_reminder" },
    delaySeconds,
  });
}

/** Fires immediately – simulates an SOS resolved confirmation */
export function sendSOSResolvedNotification() {
  return scheduleLocalNotification({
    title: "✅ SOS Resolved",
    body: "Your SOS request has been marked as resolved. Stay safe!",
    data: { type: "sos_resolved", screen: "/history" },
    badge: 0,
  });
}
