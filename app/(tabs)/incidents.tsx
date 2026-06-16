import { AppColors, lastSectionStyle } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import type { IncidentDetail } from "../../types";
import {
  createIncident,
  getAllIncidents,
  type IncidentRecord,
} from "../../utils/incidentApi";
import { useAppStore } from "../../store/useAppStore";

export default function IncidentsScreen() {
  const user = useAppStore((s) => s.user);
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentDetail | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "",
    victim: "",
    attackers: "",
    deathToll: "",
    injuryCount: "",
    peopleHelped: "",
    latitude: "",
    longitude: "",
    timing: "",
  });

  const mapWebViewRef = useRef<WebView>(null);

  const [open, setOpen] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const mapRecordToDetail = (record: IncidentRecord): IncidentDetail => ({
    id: record.id,
    location: {
      latitude: record.latitude,
      longitude: record.longitude,
      timestamp: new Date(record.createdAt),
    },
    title: record.title ?? "Untitled Incident",
    description: record.description ?? "",
    date: new Date(record.reportedAt),
    severity: record.severityLevel ?? "medium",
    victim: record.victim ?? "Unknown",
    attackers: record.attackers ?? "N/A",
    deathToll: record.deathToll ?? 0,
    injuryCount: record.injuryCount ?? 0,
    peopleHelped: record.peopleHelped ?? 0,
    timing: record.timing ?? "Unknown",
    stories: record.stories ?? [],
  });

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const records = await getAllIncidents();
      setIncidents(records.map(mapRecordToDetail));
    } catch (error: any) {
      console.error("Failed to load incidents:", error);
      Alert.alert("Error", "Failed to load incidents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      default:
        return "#3b82f6";
    }
  };

  const resetForm = () => {
    setNewIncident({
      title: "",
      description: "",
      severity: "",
      victim: "",
      attackers: "",
      deathToll: "0",
      injuryCount: "0",
      peopleHelped: "0",
      latitude: "",
      longitude: "",
      timing: "",
    });
  };

  // Move map pin when user manually types coordinates
  const movePinToCoords = (lat: string, lng: string) => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      const js = `movePinTo(${latNum}, ${lngNum}); true;`;
      mapWebViewRef.current?.injectJavaScript(js);
    }
  };

  // Handle messages from the WebView map (when user taps)
  const handleMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "locationSelected") {
        const lat = data.lat.toFixed(6);
        const lng = data.lng.toFixed(6);
        setNewIncident((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      }
    } catch { }
  };

  const buildMapHtml = (initLat: number, initLng: number) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; width: 100%; }
        #map { height: 100%; width: 100%; }
        .custom-pin {
          background: #f09129;
          border: 3px solid #fff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(240,145,41,0.5);
        }
        .leaflet-control-attribution { display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: true }).setView([${initLat}, ${initLng}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        var pinIcon = L.divIcon({
          className: '',
          html: '<div style="width:24px;height:24px;background:#f09129;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(240,145,41,0.6);"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        });

        var marker = L.marker([${initLat}, ${initLng}], { icon: pinIcon, draggable: true }).addTo(map);

        function sendLocation(lat, lng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locationSelected', lat: lat, lng: lng }));
        }

        marker.on('dragend', function(e) {
          var pos = e.target.getLatLng();
          sendLocation(pos.lat, pos.lng);
        });

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          sendLocation(e.latlng.lat, e.latlng.lng);
        });

        function movePinTo(lat, lng) {
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
        }
      </script>
    </body>
    </html>
  `;

  const handleCancelAddIncident = () => {
    resetForm();
    setShowAddForm(false);
  };

  const handleSaveIncident = async () => {
    if (!newIncident.title.trim() || !newIncident.description.trim()) {
      Alert.alert(
        "Missing fields",
        "Please enter at least a title and description.",
      );
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to report an incident.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userId: user.id,
        title: newIncident.title.trim(),
        description: newIncident.description.trim(),
        latitude: parseFloat(newIncident.latitude) || 0,
        longitude: parseFloat(newIncident.longitude) || 0,
        severityLevel: newIncident.severity.trim().toLowerCase() || "medium",
        timing: newIncident.timing || "Unknown",
        victim: newIncident.victim.trim() || "Unknown",
        attackers: newIncident.attackers.trim() || "N/A",
        deathToll: Number.parseInt(newIncident.deathToll, 10) || 0,
        injuryCount: Number.parseInt(newIncident.injuryCount, 10) || 0,
        peopleHelped: Number.parseInt(newIncident.peopleHelped, 10) || 0,
        stories: [],
      };

      const created = await createIncident(payload);
      setIncidents((previous) => [mapRecordToDetail(created), ...previous]);
      resetForm();
      setShowAddForm(false);
      Alert.alert("Success", "Incident reported successfully.");
    } catch (error: any) {
      console.error("Failed to create incident:", error);
      Alert.alert("Error", error.message || "Failed to report incident. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedIncident) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedIncident(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={lastSectionStyle}>
            <View style={styles.detailCard}>
              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor: getSeverityColor(
                      selectedIncident.severity,
                    ),
                  },
                ]}
              >
                <Text style={styles.severityText}>
                  {selectedIncident.severity.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.detailTitle}>{selectedIncident.title}</Text>
              <Text style={styles.detailDate}>
                {format(selectedIncident.date, "MMM dd, yyyy - hh:mm a")}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.detailDescription}>
                {selectedIncident.description}
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {selectedIncident.deathToll}
                  </Text>
                  <Text style={styles.statLabel}>Deaths</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {selectedIncident.injuryCount}
                  </Text>
                  <Text style={styles.statLabel}>Injuries</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {selectedIncident.peopleHelped}
                  </Text>
                  <Text style={styles.statLabel}>Helpers</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Victim</Text>
                <Text style={styles.infoValue}>{selectedIncident.victim}</Text>
              </View>

              {selectedIncident.attackers !== "N/A" && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Attackers</Text>
                  <Text style={styles.infoValue}>
                    {selectedIncident.attackers}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.storiesTitle}>
                <Ionicons name="book" size={20} color={AppColors.themeColor} />{" "}
                Incident Stories
              </Text>
              {selectedIncident.stories.map((story, index) => (
                <View key={index} style={styles.storyItem}>
                  <Text style={styles.storyBullet}>•</Text>
                  <Text style={styles.storyText}>{story}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Reports</Text>
        <Text style={styles.headerSubtitle}>
          Recent safety incidents in your area
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={lastSectionStyle}>
          <TouchableOpacity
            style={styles.addIncidentButton}
            onPress={() => setShowAddForm((previous) => !previous)}
          >
            <Text style={styles.addIncidentButtonText}>
              {showAddForm ? "Close Form" : "Add Incident"}
            </Text>
          </TouchableOpacity>

          {showAddForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Incident</Text>

              <TextInput
                style={styles.input}
                value={newIncident.title}
                onChangeText={(value) =>
                  setNewIncident((previous) => ({ ...previous, title: value }))
                }
                placeholder="Title"
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                value={newIncident.description}
                onChangeText={(value) =>
                  setNewIncident((previous) => ({
                    ...previous,
                    description: value,
                  }))
                }
                placeholder="Description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />

              <View style={styles.severityRow}>
                {/* Display field */}
                <TextInput
                  style={[styles.input, { flex: 1, color: getSeverityColor(newIncident.severity) }]}
                  value={newIncident.severity?.toLocaleUpperCase()}
                  placeholder="Select severity"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />

                {/* Button */}
                <TouchableOpacity
                  style={styles.severityButton}
                  onPress={() => setOpen(true)}
                >
                  <Ionicons name="chevron-down" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Modal visible={open} transparent animationType="fade">
                <Pressable
                  style={styles.backdrop}
                  onPress={() => setOpen(false)}
                />

                <View style={styles.modalBox}>
                  <Text style={styles.title}>Select Severity</Text>

                  {["low", "medium", "high", "critical"].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.option}
                      onPress={() => {
                        setNewIncident((prev) => ({
                          ...prev,
                          severity: item,
                        }));
                        setOpen(false);
                      }}
                    >
                      <Text style={[styles.optionText, { color: newIncident.severity === item ? AppColors.themeColor : AppColors.foreground }]}>
                        {newIncident.severity === item && (
                          <Ionicons name="checkmark" size={15} color={AppColors.themeColor} />
                        )}
                        {newIncident.severity === item ? ' ' : ''}
                        {item.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Modal>

              <TextInput
                style={styles.input}
                value={newIncident.victim}
                onChangeText={(value) =>
                  setNewIncident((previous) => ({ ...previous, victim: value }))
                }
                placeholder="Victim"
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.input}
                value={newIncident.attackers}
                onChangeText={(value) =>
                  setNewIncident((previous) => ({
                    ...previous,
                    attackers: value,
                  }))
                }
                placeholder="Attackers"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.numberInputsRow}>
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={newIncident.deathToll}
                  onChangeText={(value) =>
                    setNewIncident((previous) => ({
                      ...previous,
                      deathToll: value,
                    }))
                  }
                  placeholder="Deaths"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={newIncident.injuryCount}
                  onChangeText={(value) =>
                    setNewIncident((previous) => ({
                      ...previous,
                      injuryCount: value,
                    }))
                  }
                  placeholder="Injuries"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={newIncident.peopleHelped}
                  onChangeText={(value) =>
                    setNewIncident((previous) => ({
                      ...previous,
                      peopleHelped: value,
                    }))
                  }
                  placeholder="Helpers"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.severityRow}>
                {/* Display field */}
                <TextInput
                  style={[styles.input, { flex: 1, color: AppColors.foreground }]}
                  value={newIncident.timing || "Select timing"}
                  placeholder="Select timing"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />

                {/* Button */}
                <TouchableOpacity
                  style={styles.severityButton}
                  onPress={() => setTimingOpen(true)}
                >
                  <Ionicons name="time-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Modal visible={timingOpen} transparent animationType="fade">
                <Pressable
                  style={styles.backdrop}
                  onPress={() => setTimingOpen(false)}
                />

                <View style={styles.modalBox}>
                  <Text style={styles.title}>Select Timing</Text>

                  {[
                    "Morning (08:00 – 11:00 AM)",
                    "Midday (11:00 AM – 02:00 PM)",
                    "Afternoon (02:00 – 05:00 PM)",
                    "Evening (05:00 – 08:00 PM)",
                    "Night (08:00 – 11:00 PM)",
                    "Late Night (11:00 PM – 02:00 AM)",
                    "Deep Night (02:00 – 05:00 AM)",
                    "Dawn Watch (05:00 – 08:00 AM)",
                  ].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.option}
                      onPress={() => {
                        setNewIncident((prev) => ({
                          ...prev,
                          timing: item,
                        }));
                        setTimingOpen(false);
                      }}
                    >
                      <Text style={[styles.optionText, { color: newIncident.timing === item ? AppColors.themeColor : AppColors.foreground }]}>
                        {newIncident.timing === item && (
                          <Ionicons name="checkmark" size={15} color={AppColors.themeColor} />
                        )}
                        {newIncident.timing === item ? ' ' : ''}
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Modal>

              {/* Location Section */}
              <View style={styles.locationSectionHeader}>
                <Ionicons name="location" size={16} color={AppColors.themeColor} />
                <Text style={styles.locationSectionTitle}>Incident Location</Text>
              </View>

              {/* Lat / Lng row */}
              <View style={styles.coordRow}>
                <View style={styles.coordInputWrapper}>
                  <Ionicons name="navigate" size={14} color={AppColors.themeColor} style={styles.coordIcon} />
                  <TextInput
                    style={styles.coordInput}
                    value={newIncident.latitude}
                    onChangeText={(value) => {
                      setNewIncident((prev) => ({ ...prev, latitude: value }));
                      movePinToCoords(value, newIncident.longitude);
                    }}
                    placeholder="Latitude"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.coordInputWrapper}>
                  <Ionicons name="navigate-outline" size={14} color={AppColors.themeColor} style={styles.coordIcon} />
                  <TextInput
                    style={styles.coordInput}
                    value={newIncident.longitude}
                    onChangeText={(value) => {
                      setNewIncident((prev) => ({ ...prev, longitude: value }));
                      movePinToCoords(newIncident.latitude, value);
                    }}
                    placeholder="Longitude"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              {/* Interactive Map */}
              <View style={styles.mapContainer}>
                <WebView
                  ref={mapWebViewRef}
                  source={{
                    html: buildMapHtml(
                      parseFloat(newIncident.latitude) || 23.8103,
                      parseFloat(newIncident.longitude) || 90.4125
                    )
                  }}
                  onMessage={handleMapMessage}
                  style={styles.mapWebView}
                  scrollEnabled={false}
                  javaScriptEnabled
                  domStorageEnabled
                  originWhitelist={['*']}
                />
                <View style={styles.mapHint}>
                  <Ionicons name="information-circle-outline" size={13} color={AppColors.muted} />
                  <Text style={styles.mapHintText}>Tap on map or drag pin to set location</Text>
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.saveButton, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSaveIncident}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelAddIncident}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color={AppColors.themeColor} size="large" />
              <Text style={{ marginTop: 12, color: AppColors.foreground }}>
                Loading incidents...
              </Text>
            </View>
          ) : (
            incidents.map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={styles.incidentCard}
                onPress={() => setSelectedIncident(incident)}
              >
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(incident.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {incident.severity.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={styles.incidentDate}>
                  {format(incident.date, "MMM dd, yyyy")}
                </Text>
                <Text style={styles.incidentDescription} numberOfLines={2}>
                  {incident.description}
                </Text>

                <View style={styles.incidentStats}>
                  <Text style={styles.incidentStat}>
                    <Ionicons
                      name="skull"
                      size={15}
                      color={AppColors.themeColor}
                    />{" "}
                    {incident.deathToll}
                  </Text>
                  <Text style={styles.incidentStat}>
                    <Ionicons
                      name="bandage"
                      size={15}
                      color={AppColors.themeColor}
                    />{" "}
                    {incident.injuryCount}
                  </Text>
                  <Text style={styles.incidentStat}>
                    <Ionicons
                      name="people"
                      size={15}
                      color={AppColors.themeColor}
                    />{" "}
                    {incident.peopleHelped}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: AppColors.background,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AppColors.foreground,
  },
  backButton: {
    fontSize: 16,
    color: AppColors.themeColor,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addIncidentButton: {
    backgroundColor: AppColors.themeColor,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  addIncidentButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  formCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.foreground,
    marginBottom: 12,
  },
  input: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    color: AppColors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  numberInputsRow: {
    flexDirection: "row",
    gap: 8,
  },
  numberInput: {
    flex: 1,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: "#f0912b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  incidentCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  severityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.foreground,
    marginBottom: 4,
  },
  incidentDate: {
    fontSize: 12,
    color: AppColors.foreground,
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: AppColors.foreground,
    marginBottom: 12,
  },
  incidentStats: {
    flexDirection: "row",
    gap: 16,
  },
  incidentStat: {
    fontSize: 14,
    color: AppColors.foreground,
  },
  detailCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 14,
    color: AppColors.foreground,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: AppColors.foreground,
    lineHeight: 24,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppColors.themeColor,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.foreground,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: AppColors.foreground,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: AppColors.foreground,
  },
  storiesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.foreground,
    marginBottom: 16,
  },
  storyItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  storyBullet: {
    fontSize: 16,
    color: AppColors.themeColor,
    marginRight: 8,
  },
  storyText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.foreground,
    lineHeight: 20,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  severityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },

  severityButton: {
    backgroundColor: AppColors.themeColor,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 10,
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },

  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },

  locationSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  locationSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.themeColor,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coordRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  coordInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  coordIcon: {
    marginRight: 6,
  },
  coordInput: {
    flex: 1,
    color: AppColors.foreground,
    paddingVertical: 10,
    fontSize: 13,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 12,
    backgroundColor: AppColors.surface,
  },
  mapWebView: {
    height: 220,
    width: "100%",
    backgroundColor: "transparent",
  },
  mapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: AppColors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  mapHintText: {
    fontSize: 11,
    color: AppColors.muted,
    flex: 1,
  },
});
