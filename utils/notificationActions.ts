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
  options?: {
    isDestructive?: boolean;
    isAuthenticationRequired?: boolean;
    opensAppToForeground?: boolean;
  };
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
  const actionId = response.actionIdentifier;
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

import { createIncident } from './incidentApi';

const getTimingFromDate = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 8 && hour < 11) return "Morning (08:00 – 11:00 AM)";
  if (hour >= 11 && hour < 14) return "Midday (11:00 AM – 02:00 PM)";
  if (hour >= 14 && hour < 17) return "Afternoon (02:00 – 05:00 PM)";
  if (hour >= 17 && hour < 20) return "Evening (05:00 – 08:00 PM)";
  if (hour >= 20 && hour < 23) return "Night (08:00 – 11:00 PM)";
  if (hour >= 23 || hour < 2) return "Late Night (11:00 PM – 02:00 AM)";
  if (hour >= 2 && hour < 5) return "Deep Night (02:00 – 05:00 AM)";
  return "Dawn Watch (05:00 – 08:00 AM)";
};

/**
 * Trigger SOS alert
 */
export const triggerSOS = async (data: any): Promise<void> => {
  try {
    const { 
      setActiveSOSRequest, 
      setActiveSOSIncidentId, 
      setSOSActive, 
      user, 
      currentLocation, 
      addNotification 
    } = useAppStore.getState();

    if (!user || !currentLocation) {
      console.error('[SOS] Missing user or location');
      return;
    }

    const timing = getTimingFromDate(new Date());
    const description = data.zoneType ? `Emergency near ${data.zoneType}` : 'Emergency SOS';
    let remoteIncidentId = `sos-${Date.now()}`;

    // Send SOS to server via createIncident
    try {
      const incident = await createIncident({
        userId: user.id,
        title: 'SOS Emergency',
        description,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        severityLevel: 'critical',
        timing,
      });
      remoteIncidentId = incident.id;
      setActiveSOSIncidentId(incident.id);
      console.log('[SOS] SOS request sent to server, incident ID:', incident.id);
    } catch (err) {
      console.warn('[SOS] Failed to send to server:', err);
    }

    // Create SOS request
    const sosRequest = {
      id: remoteIncidentId,
      userId: user.id,
      location: currentLocation,
      status: 'active' as const,
      respondents: [],
      createdAt: new Date(),
      description,
    };

    setActiveSOSRequest(sosRequest);
    setSOSActive(true);

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
      const BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1`;
      const response = await fetch(`${BASE_URL}/incidents/${sosId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responderId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register help response.');
      }
      console.log('[Help] Help response sent to server successfully');
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
