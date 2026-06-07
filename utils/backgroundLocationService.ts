/**
 * Background Location Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles continuous background location tracking and danger zone monitoring.
 * Uses TaskManager for background tasks (Android) and Location.startLocationUpdatesAsync
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { DangerZone } from '../types';
import { checkIfInDangerZone, getDistance } from './location';
import { scheduleLocalNotification } from './notifications';

// Task name for background location updates
export const BACKGROUND_LOCATION_TASK_NAME = 'background-location-updates';
export const DANGER_ZONE_CHECK_INTERVAL = 30000; // Check every 30 seconds

/**
 * Initialize background location task
 * This must be called once during app initialization
 */
export const initBackgroundLocationTask = () => {
  // Define the background task
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('[Background Location] Error:', error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      
      if (locations && locations.length > 0) {
        const location = locations[locations.length - 1];
        
        // Store location and trigger danger zone check
        try {
          await checkDangerZonesForLocation(location);
        } catch (err) {
          console.error('[Background Location] Failed to check danger zones:', err);
        }
      }
    }
  });
};

/**
 * Start background location tracking
 * Requires location permission and background permission
 */
export const startBackgroundLocationTracking = async (): Promise<boolean> => {
  try {
    // Request foreground permission first
    const foregroundPermission = await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== 'granted') {
      console.error('[Background Location] Foreground permission denied');
      return false;
    }

    // Request background permission
    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    if (backgroundPermission.status !== 'granted') {
      console.warn('[Background Location] Background permission not granted (optional)');
      // Continue anyway - will work in foreground only
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000, // Update every 30 seconds
      distanceInterval: 50, // Or when moved 50 meters
      foregroundService: {
        notificationTitle: 'Safetify Location Tracking',
        notificationBody: 'Your location is being tracked for safety monitoring',
        notificationColor: '#FF6B6B',
      },
    });

    console.log('[Background Location] Background tracking started successfully');
    return true;
  } catch (error) {
    console.error('[Background Location] Failed to start tracking:', error);
    return false;
  }
};

/**
 * Stop background location tracking
 */
export const stopBackgroundLocationTracking = async (): Promise<boolean> => {
  try {
    const isTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME);
    
    if (isTaskRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
      console.log('[Background Location] Background tracking stopped');
    }
    
    return true;
  } catch (error) {
    console.error('[Background Location] Failed to stop tracking:', error);
    return false;
  }
};

/**
 * Check if background location tracking is running
 */
export const isBackgroundLocationTrackingActive = async (): Promise<boolean> => {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME);
  } catch (error) {
    console.error('[Background Location] Failed to check status:', error);
    return false;
  }
};

/**
 * Check user location against all danger zones and send notifications
 */
export const checkDangerZonesForLocation = async (
  location: Location.LocationObject,
  dangerZones: DangerZone[] = []
): Promise<DangerZone | null> => {
  try {
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    // Check each danger zone
    for (const zone of dangerZones) {
      const isInDanger = checkIfInDangerZone(
        userLat,
        userLon,
        zone.center.latitude,
        zone.center.longitude,
        zone.radius
      );

      if (isInDanger) {
        // Calculate distance to zone center
        const distance = getDistance(userLat, userLon, zone.center.latitude, zone.center.longitude);
        
        // Send notification
        await sendDangerZoneNotification(zone, distance);
        
        return zone;
      }
    }

    return null;
  } catch (error) {
    console.error('[Background Location] Error checking danger zones:', error);
    return null;
  }
};

/**
 * Send danger zone alert notification
 */
export const sendDangerZoneNotification = async (
  zone: DangerZone,
  distance: number
): Promise<string> => {
  const severityEmoji = {
    low: '⚠️',
    medium: '⚡',
    high: '🔥',
    critical: '🚨',
  };

  const emoji = severityEmoji[zone.severity] || '⚠️';

  const notificationId = await scheduleLocalNotification({
    title: `${emoji} Danger Zone Alert`,
    body: `You are ${distance.toFixed(2)}km from a ${zone.severity} danger zone (${zone.type}). ${distance < 1 ? 'Tap to request help.' : ''}`,
    data: {
      type: 'danger_zone',
      zoneId: zone.id,
      severity: zone.severity,
      distance: distance.toFixed(2),
      zoneLat: zone.center.latitude,
      zoneLon: zone.center.longitude,
      userCanSOS: distance < 1, // Enable SOS button if very close
    },
    badge: 1,
  });

  return notificationId;
};

/**
 * Get all currently active background tasks
 */
export const getActiveBackgroundTasks = async (): Promise<string[]> => {
  try {
    const tasks = await TaskManager.getRegisteredTasksAsync();
    return tasks
      .filter(task => task.taskName === BACKGROUND_LOCATION_TASK_NAME)
      .map(task => task.taskName);
  } catch (error) {
    console.error('[Background Location] Failed to get active tasks:', error);
    return [];
  }
};
