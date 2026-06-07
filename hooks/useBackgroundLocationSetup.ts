/**
 * useBackgroundLocationSetup Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Main hook to initialize the entire background location tracking and safety system.
 * Call this once in your app root component.
 */

import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
    handleNotificationAction,
    setupNotificationActions,
} from '../utils/notificationActions';
import { useBackgroundLocationTracking } from './useBackgroundLocationTracking';
import { usePushNotifications } from './usePushNotifications';

export interface UseBackgroundLocationSetupOptions {
  /**
   * Enable background location tracking. Default: true
   */
  enabled?: boolean;

  /**
   * Minimum interval between danger zone notifications (ms). Default: 5 minutes
   */
  dangerZoneNotificationCooldown?: number;

  /**
   * Callback when entering a danger zone
   */
  onDangerZoneEnter?: (zoneName: string, severity: string) => void;

  /**
   * Callback on any error
   */
  onError?: (error: string) => void;
}

/**
 * Main setup hook for background location tracking and safety features
 */
export const useBackgroundLocationSetup = (
  options: UseBackgroundLocationSetupOptions = {}
) => {
  const {
    enabled = true,
    dangerZoneNotificationCooldown = 5 * 60 * 1000, // 5 minutes
    onDangerZoneEnter,
    onError,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const notificationResponseListener = useRef<{ remove(): void } | null>(null);

  const {
    dangerZones,
    setBackgroundTrackingEnabled,
    recordDangerZoneNotification,
    lastDangerZoneNotificationTime,
    isBackgroundTrackingEnabled,
  } = useAppStore();

  // Initialize location tracking and notifications
  const locationTracking = useBackgroundLocationTracking({
    enabled,
    onDangerZoneEnter: (message) => {
      console.log('[Background Setup] Danger zone alert:', message);
      if (onDangerZoneEnter) {
        onDangerZoneEnter(message, 'high');
      }
    },
  });

  const notificationState = usePushNotifications();

  // Setup notification action listeners
  useEffect(() => {
    if (!enabled) return;

    const setupListeners = async () => {
      try {
        // Setup notification actions
        await setupNotificationActions();

        // Listen for notification responses (when user taps a notification)
        notificationResponseListener.current =
          Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('[Background Setup] Notification response received');
            handleNotificationAction(response);
          });

        console.log('[Background Setup] Notification listeners configured');
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to setup notification listeners';
        console.error('[Background Setup]', errorMsg);
        setSetupError(errorMsg);
        if (onError) onError(errorMsg);
      }
    };

    setupListeners();

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
        notificationResponseListener.current = null;
      }
    };
  }, [enabled, onError]);

  // Initialize background tracking on mount
  useEffect(() => {
    if (!enabled) {
      setIsInitialized(false);
      setBackgroundTrackingEnabled(false);
      return;
    }

    const init = async () => {
      try {
        setSetupError(null);

        // Enable background tracking
        setBackgroundTrackingEnabled(true);

        console.log('[Background Setup] Safety system initialized');
        console.log('[Background Setup] Background tracking:', locationTracking.isTracking);
        console.log('[Background Setup] Permission granted:', notificationState.permissionGranted);

        setIsInitialized(true);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to initialize safety system';
        console.error('[Background Setup]', errorMsg);
        setSetupError(errorMsg);
        setIsInitialized(false);
        if (onError) onError(errorMsg);
      }
    };

    init();

    return () => {
      setBackgroundTrackingEnabled(false);
    };
  }, [enabled, setBackgroundTrackingEnabled, onError]);

  /**
   * Manually check danger zones with cooldown prevention
   */
  const checkDangerZonesNow = async () => {
    try {
      const now = Date.now();
      const timeSinceLastNotification = now - lastDangerZoneNotificationTime;

      // Respect cooldown period
      if (timeSinceLastNotification < dangerZoneNotificationCooldown) {
        console.log(
          '[Background Setup] Cooldown active. Next check in',
          Math.ceil(
            (dangerZoneNotificationCooldown - timeSinceLastNotification) / 1000
          ),
          'seconds'
        );
        return;
      }

      // Would need access to current location here
      // This is a placeholder for manual danger zone checking
      console.log('[Background Setup] Danger zone check initiated');
    } catch (err) {
      console.error('[Background Setup] Error checking danger zones:', err);
    }
  };

  /**
   * Get current tracking status
   */
  const getStatus = () => ({
    isInitialized,
    isTracking: locationTracking.isTracking,
    permissionGranted: notificationState.permissionGranted,
    error: setupError || locationTracking.error || notificationState.error,
    lastLocationUpdate: locationTracking.lastLocationUpdate,
    dangerZonesMonitored: dangerZones?.length || 0,
    isBackgroundTrackingEnabled,
  });

  return {
    isInitialized,
    setupError,
    locationTracking,
    notificationState,
    checkDangerZonesNow,
    getStatus,
  };
};
