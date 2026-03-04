import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAppStore } from '@/store/useAppStore';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

export const unstable_settings = {
  initialRouteName: 'index',
};

/**
 * RootLayout is the top-level component for the entire app.
 * We initialise push notifications here so the listeners are active for the
 * whole session – including when the app is opened via a notification tap.
 */
export default function RootLayout() {
  const { expoPushToken, notification, error } =
    usePushNotifications();

  const addNotification = useAppStore((s) => s.addNotification);

  // Mirror every incoming notification into our global Zustand store so any
  // screen can display the notification badge / list.
  useEffect(() => {
    if (!notification) return;

    addNotification({
      id: notification.request.identifier,
      title: notification.request.content.title ?? 'Notification',
      body: notification.request.content.body ?? '',
      type: (notification.request.content.data?.type as 'sos' | 'danger' | 'help_request' | 'route_suggestion') ?? 'route_suggestion',
      read: false,
      createdAt: new Date(),
      userId: '', // Set to actual user ID from your auth store
      data: notification.request.content.data ?? {},
    });
  }, [notification]);

  // Log the push token to the console (send this to your backend in production)
  useEffect(() => {
    if (expoPushToken) {
      console.log('[App] Expo Push Token registered:', expoPushToken);
    }
    if (error) {
      console.warn('[App] Push notification error:', error);
    }
  }, [expoPushToken, error]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
      <Toast />
    </>
  );
}
