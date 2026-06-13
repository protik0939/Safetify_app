/**
 * Example: BackgroundSafetySetup Component
 * ─────────────────────────────────────────────────────────────────────────────
 * This component demonstrates how to integrate the background location tracking
 * and danger zone alert system into your app.
 *
 * Usage: Add this to your root layout or main app component
 */

import { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "@/components/AppToast";
import { useBackgroundLocationSetup } from "../hooks/useBackgroundLocationSetup";
import { useAppStore } from "../store/useAppStore";

export function BackgroundSafetySetup() {
  const setupStatus = useBackgroundLocationSetup({
    enabled: true,
    dangerZoneNotificationCooldown: 5 * 60 * 1000, // 5 minutes
    onDangerZoneEnter: (zoneName, severity) => {
      console.log(`⚠️ Entered ${severity} danger zone!`);
      Toast.show({
        type: "error",
        text1: "Danger Zone Alert",
        text2: zoneName,
        duration: 5000,
      });
    },
    onError: (error) => {
      console.error("🚨 Safety system error:", error);
      Toast.show({
        type: "error",
        text1: "Safety System Error",
        text2: error,
        duration: 5000,
      });
    },
  });

  const { isBackgroundTrackingEnabled, dangerZones } = useAppStore();
  const [statusDetails, setStatusDetails] = useState<any>(null);

  // Update status details
  useEffect(() => {
    if (setupStatus.isInitialized) {
      const status = setupStatus.getStatus();
      setStatusDetails(status);
    }
  }, [setupStatus.isInitialized, setupStatus.locationTracking.isTracking]);

  if (!setupStatus.isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Initializing Safety System...</Text>
        {setupStatus.setupError && (
          <Text style={styles.error}>{setupStatus.setupError}</Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Safety System Status</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: setupStatus.locationTracking.isTracking
                ? "#4CAF50"
                : "#FF6B6B",
            },
          ]}
        >
          <Text style={styles.statusText}>
            {setupStatus.locationTracking.isTracking
              ? "🟢 Active"
              : "🔴 Inactive"}
          </Text>
        </View>
      </View>

      {/* Error Display */}
      {setupStatus.setupError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>⚠️ Error</Text>
          <Text style={styles.errorText}>{setupStatus.setupError}</Text>
        </View>
      )}

      {/* Status Details */}
      {statusDetails && (
        <View style={styles.statusBox}>
          <Text style={styles.sectionTitle}>Tracking Details</Text>

          <View style={styles.statusItem}>
            <Text style={styles.label}>Background Tracking</Text>
            <Text style={styles.value}>
              {statusDetails.isBackgroundTrackingEnabled
                ? "✅ Enabled"
                : "❌ Disabled"}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.label}>Permission Status</Text>
            <Text style={styles.value}>
              {statusDetails.permissionGranted ? "✅ Granted" : "❌ Denied"}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.label}>Danger Zones Monitored</Text>
            <Text style={styles.value}>
              {statusDetails.dangerZonesMonitored}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.label}>Last Update</Text>
            <Text style={styles.value}>
              {statusDetails.lastLocationUpdate
                ? new Date(
                    statusDetails.lastLocationUpdate,
                  ).toLocaleTimeString()
                : "Never"}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.label}>Tracking Duration</Text>
            <Text style={styles.value}>
              {setupStatus.locationTracking.isTracking
                ? calculateDuration(new Date())
                : "Not tracking"}
            </Text>
          </View>
        </View>
      )}

      {/* Danger Zones List */}
      {dangerZones && dangerZones.length > 0 && (
        <View style={styles.dangerZonesBox}>
          <Text style={styles.sectionTitle}>
            📍 Active Danger Zones ({dangerZones.length})
          </Text>
          {dangerZones.slice(0, 5).map((zone) => (
            <View key={zone.id} style={styles.zoneItem}>
              <Text style={styles.zoneName}>{zone.type}</Text>
              <Text style={styles.zoneDetails}>
                Severity: <Text style={styles.severity}>{zone.severity}</Text> •
                Radius: {zone.radius}km
              </Text>
            </View>
          ))}
          {dangerZones.length > 5 && (
            <Text style={styles.moreZones}>
              +{dangerZones.length - 5} more zones
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsBox}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <Button
          title={
            setupStatus.locationTracking.isTracking
              ? "Stop Tracking"
              : "Start Tracking"
          }
          onPress={() => {
            if (setupStatus.locationTracking.isTracking) {
              setupStatus.locationTracking.stopTracking();
            } else {
              setupStatus.locationTracking.startTracking();
            }
          }}
          color={
            setupStatus.locationTracking.isTracking ? "#FF6B6B" : "#4CAF50"
          }
        />

        <View style={styles.spacer} />

        <Button
          title="Check Danger Zones Now"
          onPress={() => setupStatus.checkDangerZonesNow()}
          color="#2196F3"
        />

        <View style={styles.spacer} />

        <Button
          title="Check Status"
          onPress={() => {
            const status = setupStatus.getStatus();
            console.log("Current Status:", status);
            Toast.show({
              type: "info",
              text1: "Status Logged",
              text2: `Check console for details`,
              duration: 3000,
            });
          }}
          color="#9C27B0"
        />
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.sectionTitle}>ℹ️ How It Works</Text>
        <Text style={styles.infoText}>
          • Your location is tracked every 30 seconds in the background
        </Text>
        <Text style={styles.infoText}>
          • When you enter a danger zone, you'll receive a notification
        </Text>
        <Text style={styles.infoText}>
          • Tap the notification to send an SOS alert to nearby responders
        </Text>
        <Text style={styles.infoText}>
          • Notifications are throttled to prevent spam (5 min cooldown)
        </Text>
      </View>
    </ScrollView>
  );
}

// Helper function to calculate duration
function calculateDuration(since: Date): string {
  const seconds = Math.floor((Date.now() - since.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "#ffebee",
    borderLeftWidth: 4,
    borderLeftColor: "#ff1744",
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  errorTitle: {
    color: "#d32f2f",
    fontWeight: "bold",
    marginBottom: 4,
  },
  errorText: {
    color: "#c62828",
    fontSize: 12,
  },
  statusBox: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  statusItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dangerZonesBox: {
    backgroundColor: "#fff3e0",
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  zoneItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ffe0b2",
  },
  zoneName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  zoneDetails: {
    fontSize: 12,
    color: "#666",
  },
  severity: {
    fontWeight: "bold",
    color: "#e65100",
  },
  moreZones: {
    fontSize: 12,
    color: "#ff9800",
    fontWeight: "600",
    marginTop: 8,
  },
  actionsBox: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  spacer: {
    height: 10,
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    padding: 16,
    marginBottom: 32,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  infoText: {
    fontSize: 12,
    color: "#1565c0",
    marginBottom: 8,
    lineHeight: 18,
  },
});
