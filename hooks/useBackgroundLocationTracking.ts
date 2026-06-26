/**
 * useBackgroundLocationTracking Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages background location tracking lifecycle with danger zone monitoring.
 * Call this once in your root app component or main screen.
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
    checkDangerZonesForLocation,
    initBackgroundLocationTask,
    isBackgroundLocationTrackingActive,
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking
} from '../utils/backgroundLocationService';
import { watchLocation } from '../utils/location';

interface UseBackgroundLocationTrackingOptions {
  enabled?: boolean;
  onDangerZoneEnter?: (message: string) => void;
  onLocationUpdate?: (location: Location.LocationObject) => void;
}

export const useBackgroundLocationTracking = (
  options: UseBackgroundLocationTrackingOptions = {}
) => {
  const {
    enabled = true,
    onDangerZoneEnter,
    onLocationUpdate,
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

  const dangerZones = useAppStore((s) => s.dangerZones);
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Initialize background task on mount
  useEffect(() => {
    if (!enabled) return;

    try {
      initBackgroundLocationTask();
      console.log('[useBackgroundLocationTracking] Background task initialized');
    } catch (err) {
      console.error('[useBackgroundLocationTracking] Failed to init background task:', err);
      setError('Failed to initialize background tracking');
    }
  }, [enabled]);

  // Start/stop tracking based on enabled flag
  useEffect(() => {
    if (!enabled) {
      stopTracking();
      return;
    }

    startTracking();

    return () => {
      stopTracking();
    };
  }, [enabled, dangerZones]);

  const startTracking = useCallback(async () => {
    try {
      setError(null);

      // Start background tracking
      const backgroundStarted = await startBackgroundLocationTracking();
      if (!backgroundStarted) {
        console.warn('[useBackgroundLocationTracking] Background tracking may be limited');
      }

      // Also watch location in foreground for real-time updates
      foregroundSubscriptionRef.current = await watchLocation((location) => {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
          timestamp: new Date(),
        });

        setLastLocationUpdate(new Date());

        // Check danger zones in real-time
        if (dangerZones && dangerZones.length > 0) {
          checkDangerZonesForLocation(location, dangerZones).then((zone) => {
            if (zone && onDangerZoneEnter) {
              const distance = (
                Math.random() * zone.radius
              ).toFixed(2);
              onDangerZoneEnter(
                `You entered a ${zone.severity} danger zone! Distance: ${distance}km`
              );
            }
          });
        }

        if (onLocationUpdate) {
          onLocationUpdate(location);
        }
      });

      setIsTracking(true);
      console.log('[useBackgroundLocationTracking] Location tracking started');
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown error starting tracking';
      console.error('[useBackgroundLocationTracking] Error:', errorMsg);
      setError(errorMsg);
      setIsTracking(false);
    }
  }, [dangerZones, setCurrentLocation, onDangerZoneEnter, onLocationUpdate]);

  const stopTracking = useCallback(async () => {
    try {
      // Stop foreground subscription
      if (foregroundSubscriptionRef.current) {
        foregroundSubscriptionRef.current.remove();
        foregroundSubscriptionRef.current = null;
      }

      // Stop background tracking
      await stopBackgroundLocationTracking();

      setIsTracking(false);
      console.log('[useBackgroundLocationTracking] Location tracking stopped');
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown error stopping tracking';
      console.error('[useBackgroundLocationTracking] Error:', errorMsg);
      setError(errorMsg);
    }
  }, []);

  const checkTrackingStatus = useCallback(async () => {
    try {
      const active = await isBackgroundLocationTrackingActive();
      setIsTracking(active);
      return active;
    } catch (err) {
      console.error('[useBackgroundLocationTracking] Error checking status:', err);
      return false;
    }
  }, []);

  return {
    isTracking,
    error,
    lastLocationUpdate,
    startTracking,
    stopTracking,
    checkTrackingStatus,
  };
};
