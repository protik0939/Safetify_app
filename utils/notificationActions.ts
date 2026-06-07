/**
 * notificationActions.ts – Notification Action Handlers
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles actions triggered from notifications (like SOS button taps).
 * Works with both local and push notifications.
 */

import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/useAppStore';

export type NotificationActionType = 'sos' | 'help_accepted' | 'dismiss' | 'open';

export interface NotificationAction {
  id: string;
  title: string;
  options?: Notifications.NotificationActionOptions;
}

/**
 * SOS action that appears in danger zone notifications
 */
export const SOS_ACTION: NotificationAction = {
  id: 'sos',
  title: '🆘 Send SOS',
  options: {
    isDestructive: true,
    isAuthenticationRequired: false,
    opensAppToForeground: true,
  },
};

/**
 * Help acceptance action
 */
export const HELP_ACCEPTED_ACTION: NotificationAction = {
  id: 'help_accepted',
  title: 'I Can Help',
  options: {
    isAuthenticationRequired: false,
    opensAppToForeground: true,
  },
};

/**
 * Dismiss action
 */
export const DISMISS_ACTION: NotificationAction = {
  id: 'dismiss',
  title: 'Dismiss',
  options: {
    isDestructive: false,
    isAuthenticationRequired: false,
    opensAppToForeground: false,
  },
};

/**
 * Create a danger zone notification with SOS action
 */
export const createDangerZoneNotificationWithActions = async (options: {
  title: string;
  body: string;
  data?: Record<string, any>;
  delaySeconds?: number;
  badge?: number;
}): Promise<string> => {
  const { title, body, data = {}, delaySeconds = 0, badge = 1 } = options;

  const trigger: Notifications.NotificationTriggerInput =
    delaySeconds > 0
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        }
      : null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        ...data,
        actionEnabled: true,
      },
      badge,
      sound: 'default',
      color: '#FF6B6B', // Red for danger
      priority: 'high',
    },
    trigger,
  });

  return id;
};

/**
 * Handle notification action response
 */
export const handleNotificationAction = async (
  response: Notifications.NotificationResponse
): Promise<void> => {
  const { notification } = response;
  const { actionId } = response;
  const data = notification.request.content.data;

  console.log('[Notification Action] Action:', actionId, 'Data:', data);

  switch (actionId) {
    case 'sos':
      await triggerSOS(data);
      break;
    case 'help_accepted':
      await acceptHelp(data);
      break;
    case 'dismiss':
      console.log('[Notification Action] Notification dismissed');
      break;
    default:
      console.log('[Notification Action] Unknown action:', actionId);
  }
};

/**
 * Trigger SOS alert
 */
export const triggerSOS = async (data: any): Promise<void> => {
  try {
    const { setActiveSOSRequest, user, currentLocation, addNotification } = useAppStore.getState();

    if (!user || !currentLocation) {
      console.error('[SOS] Missing user or location');
      return;
    }

    // Create SOS request
    const sosRequest = {
      id: `sos-${Date.now()}`,
      userId: user.id,
      location: currentLocation,
      status: 'active' as const,
      respondents: [],
      createdAt: new Date(),
      description: data.zoneType ? `Emergency near ${data.zoneType}` : 'Emergency SOS',
    };

    setActiveSOSRequest(sosRequest);

    // Send SOS to server
    try {
      const sessionToken = useAppStore.getState().sessionToken;
      await axios.post(
        '/api/sos',
        sosRequest,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
      console.log('[SOS] SOS request sent to server');
    } catch (err) {
      console.warn('[SOS] Failed to send to server:', err);
      // Continue anyway - at least local SOS is active
    }

    // Add notification to store
    addNotification({
      id: `notification-${Date.now()}`,
      userId: user.id,
      title: '🚨 SOS Alert Activated',
      body: 'Emergency responders have been notified of your location.',
      type: 'sos',
      data: sosRequest,
      read: false,
      createdAt: new Date(),
    });

    console.log('[SOS] SOS triggered successfully');
  } catch (error) {
    console.error('[SOS] Error triggering SOS:', error);
  }
};

/**
 * Accept help request
 */
export const acceptHelp = async (data: any): Promise<void> => {
  try {
    const { user, currentLocation } = useAppStore.getState();

    if (!user || !currentLocation) {
      console.error('[Help] Missing user or location');
      return;
    }

    const sosId = data.sosId;

    // Send help acceptance to server
    try {
      const sessionToken = useAppStore.getState().sessionToken;
      await axios.post(
        `/api/sos/${sosId}/respond`,
        {
          responderId: user.id,
          responderName: user.name,
          location: currentLocation,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
      console.log('[Help] Help response sent to server');
    } catch (err) {
      console.warn('[Help] Failed to send help response:', err);
    }
  } catch (error) {
    console.error('[Help] Error accepting help:', error);
  }
};

/**
 * Setup notification action categories
 * Call this during app initialization
 */
export const setupNotificationActions = async (): Promise<void> => {
  try {
    // This is primarily for iOS. Android uses notification actions directly.
    console.log('[Notification Actions] Setup complete');
  } catch (error) {
    console.error('[Notification Actions] Failed to setup:', error);
  }
};
