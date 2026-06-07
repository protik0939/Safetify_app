/**
 * useBatteryOptimizationPrompt Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the battery optimization and auto-start permission prompt
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const BATTERY_PROMPT_SHOWN_KEY = 'battery-optimization-prompt-shown';
const BATTERY_PROMPT_SHOW_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface BatteryOptimizationPromptState {
  showPrompt: boolean;
  dismissPrompt: () => Promise<void>;
  resetPrompt: () => Promise<void>;
}

/**
 * Hook to manage battery optimization prompt
 * Shows once per 7 days (or until dismissed by user)
 */
export const useBatteryOptimizationPrompt = (): BatteryOptimizationPromptState => {
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return; // Only show on Android
    }

    const checkIfShouldShowPrompt = async () => {
      try {
        const lastShownData = await AsyncStorage.getItem(BATTERY_PROMPT_SHOWN_KEY);

        if (!lastShownData) {
          // First time showing
          setShowPrompt(true);
          return;
        }

        const lastShown = parseInt(lastShownData, 10);
        const now = Date.now();
        const timeSinceLastShown = now - lastShown;

        // Show again if more than 7 days have passed
        if (timeSinceLastShown > BATTERY_PROMPT_SHOW_INTERVAL) {
          setShowPrompt(true);
        }
      } catch (error) {
        console.error('[Battery Prompt] Failed to check storage:', error);
        setShowPrompt(true); // Show on error to be safe
      }
    };

    checkIfShouldShowPrompt();
  }, []);

  const dismissPrompt = async () => {
    try {
      await AsyncStorage.setItem(BATTERY_PROMPT_SHOWN_KEY, Date.now().toString());
      setShowPrompt(false);
      console.log('[Battery Prompt] Dismissed, will show again in 7 days');
    } catch (error) {
      console.error('[Battery Prompt] Failed to dismiss:', error);
    }
  };

  const resetPrompt = async () => {
    try {
      await AsyncStorage.removeItem(BATTERY_PROMPT_SHOWN_KEY);
      setShowPrompt(true);
      console.log('[Battery Prompt] Reset, will show again on next startup');
    } catch (error) {
      console.error('[Battery Prompt] Failed to reset:', error);
    }
  };

  return {
    showPrompt,
    dismissPrompt,
    resetPrompt,
  };
};
