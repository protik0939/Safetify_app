import { useBackgroundLocationSetup } from "@/hooks/useBackgroundLocationSetup";
import { useAppStore } from "@/store/useAppStore";
import Toast from "@/components/AppToast";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { getAllIncidents } from "@/utils/incidentApi";

export const unstable_settings = {
  initialRouteName: "index",
};

/**
 * RootLayout is the top-level component for the entire app.
 * We initialise push notifications here so the listeners are active for the
 * whole session – including when the app is opened via a notification tap.
 */
export default function RootLayout() {
  const user = useAppStore((s) => s.user);
  const setup = useBackgroundLocationSetup({ enabled: !!user });
  const { expoPushToken, notification, error } = setup.notificationState;

  const addNotification = useAppStore((s) => s.addNotification);

  // Mirror every incoming notification into our global Zustand store so any
  // screen can display the notification badge / list.
  useEffect(() => {
    if (!notification) return;

    addNotification({
      id: notification.request.identifier,
      title: notification.request.content.title ?? "Notification",
      body: notification.request.content.body ?? "",
      type:
        (notification.request.content.data?.type as
          | "sos"
          | "danger"
          | "help_request"
          | "route_suggestion") ?? "route_suggestion",
      read: false,
      createdAt: new Date(),
      userId: "", // Set to actual user ID from your auth store
      data: notification.request.content.data ?? {},
    });
  }, [notification]);

  // Log and register push token to backend when authenticated
  useEffect(() => {
    if (expoPushToken) {
      console.log("[App] Expo Push Token registered:", expoPushToken);
    }
    if (error) {
      console.warn("[App] Push notification error:", error);
    }

    if (user && expoPushToken) {
      const BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1`;
      fetch(`${BASE_URL}/user/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          pushToken: expoPushToken,
        }),
      })
      .then((res) => res.json())
      .then((data) => {
        console.log("[App] Registered push token on backend:", data);
      })
      .catch((err) => {
        console.warn("[App] Failed to register push token on backend:", err);
      });
    }
  }, [user, expoPushToken, error]);
  
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setCachedIncidents = useAppStore((s) => s.setCachedIncidents);
  const setDangerZones = useAppStore((s) => s.setDangerZones);

  // Download and cache incident data on startup or when auth changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const downloadIncidentData = async () => {
      try {
        console.log("[App Layout] Downloading incident data for offline use...");
        const incidents = await getAllIncidents();
        
        // Cache raw incidents
        setCachedIncidents(incidents);

        // Map and cache danger zones
        const mappedDangerZones = incidents.map((incident) => {
          const getSeverity = (level: string | null): "low" | "medium" | "high" | "critical" => {
            if (!level) return "medium";
            const l = level.toLowerCase();
            if (l === "low" || l === "medium" || l === "high" || l === "critical") {
              return l as "low" | "medium" | "high" | "critical";
            }
            return "medium";
          };

          const getRadius = (severity: "low" | "medium" | "high" | "critical"): number => {
            switch (severity) {
              case "critical": return 0.5;
              case "high": return 0.4;
              case "medium": return 0.3;
              case "low": return 0.2;
              default: return 0.3;
            }
          };

          const severity = getSeverity(incident.severityLevel);
          const radius = getRadius(severity);
          return {
            id: incident.id,
            center: {
              latitude: incident.latitude,
              longitude: incident.longitude,
              timestamp: new Date(incident.createdAt),
            },
            radius,
            severity,
            type: incident.title || "Incident",
            count: 1,
            lastUpdated: new Date(incident.updatedAt),
          };
        });

        setDangerZones(mappedDangerZones);
        console.log(`[App Layout] Successfully downloaded and cached ${incidents.length} incidents.`);
      } catch (error) {
        console.warn("[App Layout] Failed to download incident data (offline or server error). Using last cached data.", error);
      }
    };

    downloadIncidentData();
  }, [isAuthenticated, setCachedIncidents, setDangerZones]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" backgroundColor="#f09129" translucent={false} />
      <Toast />
    </>
  );
}
