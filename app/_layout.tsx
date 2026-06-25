import { useBackgroundLocationSetup } from "@/hooks/useBackgroundLocationSetup";
import { useAppStore } from "@/store/useAppStore";
import Toast from "@/components/AppToast";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import "react-native-reanimated";
import { getAllIncidents } from "@/utils/incidentApi";
import { sendOTP, verifyOTP, clearSessionToken } from "@/utils/authApi";
import { Ionicons } from "@expo/vector-icons";

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

    const data = notification.request.content.data;
    const title = notification.request.content.title ?? "Notification";
    const body = notification.request.content.body ?? "";

    if (data?.type === "sos_alert" && data?.incidentId) {
      Alert.alert(
        "🚨 Nearby SOS Alert!",
        body || "Someone needs help nearby. Tap to view on map and respond.",
        [
          { text: "Ignore", style: "cancel" },
          {
            text: "Help Now",
            style: "destructive",
            onPress: () => {
              router.push({
                pathname: "/",
                params: { incidentId: data.incidentId as any }
              });
            }
          }
        ]
      );
    }

    addNotification({
      id: notification.request.identifier,
      title,
      body,
      type:
        (data?.type === "sos_alert"
          ? "sos"
          : (data?.type as any)) ?? "route_suggestion",
      read: false,
      createdAt: new Date(),
      userId: user?.id || "",
      data: data ?? {},
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
      <EmailVerificationModal />
    </>
  );
}

function EmailVerificationModal() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const logout = useAppStore((s) => s.logout);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const visible = isAuthenticated && user && !user.emailVerified;

  const handleSendEmail = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await sendOTP(user.email);
      setOtpSent(true);
      setSuccessMessage("An 8-digit verification code has been sent!");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!user?.email || otp.length !== 8) {
      setErrorMessage("Please enter the 8-digit verification code.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await verifyOTP(user.email, otp);
      setSuccessMessage("Email verified successfully!");
      setUser({ ...user, emailVerified: true });
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSessionToken();
      logout();
      router.replace("/login");
    } catch (err) {
      console.warn("Failed to logout during email verification:", err);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={modalStyles.container}>
        <View style={modalStyles.card}>
          <View style={modalStyles.iconContainer}>
            <Ionicons name="shield-half" size={70} color="#f0912b" />
          </View>
          <Text style={modalStyles.title}>Verify Your Email</Text>
          <Text style={modalStyles.subtitle}>
            Safetify requires email verification to protect our community.
          </Text>

          <View style={modalStyles.emailBox}>
            <Text style={modalStyles.emailLabel}>Registered Email</Text>
            <Text style={modalStyles.emailValue}>{user?.email}</Text>
          </View>

          {successMessage ? (
            <Text style={modalStyles.successText}>{successMessage}</Text>
          ) : null}
          {errorMessage ? (
            <Text style={modalStyles.errorText}>{errorMessage}</Text>
          ) : null}

          {isLoading ? (
            <ActivityIndicator size="large" color="#f0912b" style={modalStyles.loader} />
          ) : (
            <View style={modalStyles.formContainer}>
              {!otpSent ? (
                <TouchableOpacity style={modalStyles.primaryButton} onPress={handleSendEmail}>
                  <Text style={modalStyles.buttonText}>Send Email</Text>
                </TouchableOpacity>
              ) : (
                <View style={modalStyles.otpSection}>
                  <TextInput
                    style={modalStyles.otpInput}
                    placeholder="Enter 8-digit code"
                    placeholderTextColor="rgba(30, 49, 95, 0.4)"
                    keyboardType="number-pad"
                    maxLength={8}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text.replace(/[^0-9]/g, ""));
                      setErrorMessage("");
                    }}
                  />
                  <TouchableOpacity style={modalStyles.primaryButton} onPress={handleVerifyOTP}>
                    <Text style={modalStyles.buttonText}>Verify OTP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={modalStyles.secondaryButton} onPress={handleSendEmail}>
                    <Text style={modalStyles.secondaryButtonText}>Resend Email</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={modalStyles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={modalStyles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  iconContainer: {
    backgroundColor: "rgba(240, 145, 43, 0.08)",
    padding: 20,
    borderRadius: 50,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1e315f",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(30, 49, 95, 0.68)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  emailBox: {
    width: "100%",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "rgba(240, 145, 43, 0.16)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(30, 49, 95, 0.5)",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e315f",
  },
  formContainer: {
    width: "100%",
    gap: 12,
  },
  otpSection: {
    width: "100%",
    gap: 12,
  },
  otpInput: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(30, 49, 95, 0.16)",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e315f",
    marginBottom: 8,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#f09129",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f09129",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(30, 49, 95, 0.16)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1e315f",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 12,
  },
  logoutButtonText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
  loader: {
    marginTop: 24,
  },
  successText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
});
