/**
 * batteryOptimizationSettings.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles opening Android system settings for battery optimization and auto-start
 */

import { Linking, Platform } from 'react-native';

/**
 * Open Android settings to disable battery restrictions for the app
 */
export const openBatteryOptimizationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'android') {
      console.warn('[Battery Settings] Not on Android, skipping');
      return;
    }

    // Try opening device settings first
    await Linking.openSettings();

    // Alternative: Open specific battery settings page
    // Uncomment if the above doesn't work on your device
    // const packageName = 'com.safetify.app';
    // await Linking.openURL(`package:${packageName}`);
  } catch (error) {
    console.error('[Battery Settings] Failed to open settings:', error);
    // Fallback: Try to open with the package name
    try {
      await Linking.openURL('package:com.safetify.app');
    } catch (fallbackError) {
      console.error('[Battery Settings] Fallback also failed:', fallbackError);
    }
  }
};

/**
 * Open Android settings to enable auto-start permission
 */
export const openAutoStartSettings = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'android') {
      console.warn('[Auto Start Settings] Not on Android, skipping');
      return;
    }

    // Open device settings
    await Linking.openSettings();

    // Alternative: Try opening app info directly
    // Uncomment if needed
    // const packageName = 'com.safetify.app';
    // await Linking.openURL(`package:${packageName}`);
  } catch (error) {
    console.error('[Auto Start Settings] Failed to open settings:', error);
    try {
      await Linking.openURL('package:com.safetify.app');
    } catch (fallbackError) {
      console.error('[Auto Start Settings] Fallback also failed:', fallbackError);
    }
  }
};

/**
 * Open the app info page directly
 * Shows battery restrictions, auto-start, and other permissions
 */
export const openAppInfo = async (): Promise<void> => {
  try {
    if (Platform.OS !== 'android') {
      console.warn('[App Info] Not on Android, skipping');
      return;
    }

    const packageName = 'com.safetify.app';
    await Linking.openURL(`package:${packageName}`);
  } catch (error) {
    console.error('[App Info] Failed to open app info:', error);
    // Try alternative method
    try {
      await Linking.openSettings();
    } catch (fallbackError) {
      console.error('[App Info] Fallback also failed:', fallbackError);
    }
  }
};

/**
 * Check if we're on Android (where these settings matter)
 */
export const isAndroid = (): boolean => {
  return Platform.OS === 'android';
};
