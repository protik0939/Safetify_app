/**
 * BatteryOptimizationModal Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal that prompts user to configure battery restrictions and auto-start
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useBatteryOptimizationPrompt } from "../hooks/useBatteryOptimizationPrompt";
import {
    openAutoStartSettings,
    openBatteryOptimizationSettings,
} from "../utils/batteryOptimizationSettings";

export function BatteryOptimizationModal() {
  const { showPrompt, dismissPrompt } = useBatteryOptimizationPrompt();

  if (Platform.OS !== "android" || !showPrompt) {
    return null;
  }

  return (
    <Modal
      visible={showPrompt}
      transparent
      animationType="fade"
      hardwareAccelerated
      onRequestClose={dismissPrompt}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.headerSection}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="battery-alert"
                    size={48}
                    color="#FF6B6B"
                  />
                </View>
                <Text style={styles.title}>Enable Full Protection</Text>
                <Text style={styles.subtitle}>
                  Configure your device settings for better app performance
                </Text>
              </View>

              {/* Info Boxes */}
              <View style={styles.infoSection}>
                {/* Battery Restriction Info */}
                <View style={styles.infoBox}>
                  <View style={styles.infoHeader}>
                    <MaterialCommunityIcons
                      name="battery-charging"
                      size={24}
                      color="#4CAF50"
                    />
                    <Text style={styles.infoTitle}>Battery Restriction</Text>
                  </View>
                  <Text style={styles.infoText}>
                    Set to &quot;No restriction&quot; to ensure Safetify continues
                    monitoring your location in the background for safety
                    alerts.
                  </Text>
                </View>

                {/* Auto-start Info */}
                <View style={styles.infoBox}>
                  <View style={styles.infoHeader}>
                    <MaterialCommunityIcons
                      name="autorenew"
                      size={24}
                      color="#2196F3"
                    />
                    <Text style={styles.infoTitle}>Auto-start Permission</Text>
                  </View>
                  <Text style={styles.infoText}>
                    Allow auto-start to automatically enable location tracking
                    when your device restarts.
                  </Text>
                </View>
              </View>

              {/* Warning */}
              <View style={styles.warningBox}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="#FF9800"
                />
                <Text style={styles.warningText}>
                  Without these settings, background location tracking may stop,
                  and you won&apos;t receive danger zone alerts.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsSection}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={async () => {
                    await openBatteryOptimizationSettings();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="battery-charging"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>
                    Set Battery Restriction
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={async () => {
                    await openAutoStartSettings();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="autorenew"
                    size={20}
                    color="#2196F3"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.secondaryButtonText}>
                    Allow Auto-start
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={dismissPrompt}
                  activeOpacity={0.6}
                >
                  <Text style={styles.dismissButtonText}>
                    I&apos;ll configure later
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer Note */}
              <Text style={styles.footerNote}>
                You can configure these settings anytime in your device
                settings.
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    maxHeight: "90%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#b0b0b0",
    textAlign: "center",
    lineHeight: 20,
  },
  infoSection: {
    marginBottom: 24,
    gap: 12,
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#b0b0b0",
    lineHeight: 19,
    marginLeft: 36,
  },
  warningBox: {
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  warningText: {
    fontSize: 12,
    color: "#FFB74D",
    marginLeft: 12,
    flex: 1,
    lineHeight: 17,
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "rgba(33, 150, 243, 0.15)",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#2196F3",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2196F3",
    marginLeft: 8,
  },
  dismissButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  dismissButtonText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  buttonIcon: {
    marginRight: 0,
  },
  footerNote: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
});
