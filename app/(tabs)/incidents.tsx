import { AppColors, lastSectionStyle } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
  getIncidentById,
  updateIncident,
  deleteIncident,
  type IncidentRecord,
} from "../../utils/incidentApi";
import { useAppStore } from "../../store/useAppStore";

export default function IncidentsScreen() {
  const user = useAppStore((s) => s.user);
  const isSOSActive = useAppStore((s) => s.isSOSActive);
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentDetail | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filtering state
  const [filter, setFilter] = useState<'all' | 'mine' | 'others'>('all');

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  // Add form state
  const [newIncident, setNewIncident] = useState({
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

  // Edit form state
  const [editingIncident, setEditingIncident] = useState<IncidentDetail | null>(null);
  const [editForm, setEditForm] = useState({
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
  const editMapWebViewRef = useRef<WebView>(null);

  const [open, setOpen] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTimingOpen, setEditTimingOpen] = useState(false);
  const { viewIncidentId } = useLocalSearchParams<{ viewIncidentId?: string }>();

  // Fetch/reload incidents when user is not in active SOS mode
  useEffect(() => {
    if (!isSOSActive) {
      loadIncidents();
    }
  }, [isSOSActive]);

  // Effect: Auto-select an incident if viewIncidentId search parameter is passed
  useEffect(() => {
    if (viewIncidentId) {
      const found = incidents.find((i) => i.id === viewIncidentId);
      if (found) {
        setSelectedIncident(found);
      } else {
        const fetchAndSelect = async () => {
          try {
            const data = await getIncidentById(viewIncidentId);
            if (data) {
              setSelectedIncident(mapRecordToDetail(data));
            }
          } catch (err) {
            console.warn("Failed to fetch specific incident details:", err);
          }
        };
        fetchAndSelect();
      }
    }
  }, [viewIncidentId, incidents]);

  // Back button interception for Android hardware back button
  useEffect(() => {
    const backAction = () => {
      if (selectedIncident) {
        setSelectedIncident(null);
        return true; // Intercepted
      }
      if (showAddForm) {
        setShowAddForm(false);
        return true; // Intercepted
      }
      if (editingIncident) {
        setEditingIncident(null);
        return true; // Intercepted
      }
      return false; // Let normal navigation take place
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [selectedIncident, showAddForm, editingIncident]);

  const mapRecordToDetail = (record: IncidentRecord): IncidentDetail => ({
    id: record.id,
    userId: record.userId,
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
      const records = await getAllIncidents(10, 0);
      const mapped = records.map(mapRecordToDetail);
      setIncidents(mapped);
      setOffset(mapped.length);
      setHasMore(records.length === 10);
    } catch (error: any) {
      console.error("Failed to load incidents:", error);
      Alert.alert("Error", "Failed to load incidents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreIncidents = async () => {
    if (isMoreLoading || !hasMore) return;
    setIsMoreLoading(true);
    try {
      const records = await getAllIncidents(10, offset);
      const mapped = records.map(mapRecordToDetail);
      if (records.length < 10) {
        setHasMore(false);
      }
      setIncidents((prev) => [...prev, ...mapped]);
      setOffset((prevOffset) => prevOffset + mapped.length);
    } catch (error: any) {
      console.error("Failed to load more incidents:", error);
      Alert.alert("Error", "Failed to load more incidents.");
    } finally {
      setIsMoreLoading(false);
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
      setOffset((prevOffset) => prevOffset + 1);
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

  // Incident Filtering logic
  const filteredIncidents = incidents.filter((inc) => {
    if (filter === "mine") {
      return inc.userId === user?.id;
    }
    if (filter === "others") {
      return inc.userId !== user?.id;
    }
    return true;
  });

  // Edit / Update handlers
  const startEditingIncident = (incident: IncidentDetail) => {
    setEditingIncident(incident);
    setEditForm({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      victim: incident.victim,
      attackers: incident.attackers,
      deathToll: String(incident.deathToll),
      injuryCount: String(incident.injuryCount),
      peopleHelped: String(incident.peopleHelped),
      latitude: String(incident.location.latitude),
      longitude: String(incident.location.longitude),
      timing: incident.timing,
    });
  };

  const handleUpdateIncident = async () => {
    if (!editingIncident) return;
    if (!editForm.title.trim() || !editForm.description.trim()) {
      Alert.alert(
        "Missing fields",
        "Please enter at least a title and description.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        latitude: parseFloat(editForm.latitude) || 0,
        longitude: parseFloat(editForm.longitude) || 0,
        severityLevel: editForm.severity.trim().toLowerCase() || "medium",
        timing: editForm.timing || "Unknown",
        victim: editForm.victim.trim() || "Unknown",
        attackers: editForm.attackers.trim() || "N/A",
        deathToll: Number.parseInt(editForm.deathToll, 10) || 0,
        injuryCount: Number.parseInt(editForm.injuryCount, 10) || 0,
        peopleHelped: Number.parseInt(editForm.peopleHelped, 10) || 0,
      };

      const updated = await updateIncident(editingIncident.id, payload);
      const mapped = mapRecordToDetail(updated);

      setIncidents((prev) =>
        prev.map((inc) => (inc.id === editingIncident.id ? mapped : inc))
      );

      if (selectedIncident?.id === editingIncident.id) {
        setSelectedIncident(mapped);
      }

      setEditingIncident(null);
      Alert.alert("Success", "Incident updated successfully.");
    } catch (error: any) {
      console.error("Failed to update incident:", error);
      Alert.alert("Error", error.message || "Failed to update incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const confirmDeleteIncident = (incidentId: string, shouldCloseDetail = false) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this incident report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteIncident(incidentId);
              setIncidents((prev) => prev.filter((inc) => inc.id !== incidentId));
              if (shouldCloseDetail) {
                setSelectedIncident(null);
              }
              Alert.alert("Deleted", "Incident report has been deleted.");
            } catch (error: any) {
              console.error("Failed to delete incident:", error);
              Alert.alert("Error", "Could not delete incident report.");
            }
          }
        }
      ]
    );
  };

  if (selectedIncident) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.detailHeader]}>
          <TouchableOpacity onPress={() => setSelectedIncident(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          {selectedIncident.userId === user?.id && (
            <View style={styles.detailActionRow}>
              <TouchableOpacity
                style={[styles.detailActionButton, styles.editDetailBtn]}
                onPress={() => startEditingIncident(selectedIncident)}
              >
                <Ionicons name="pencil" size={14} color="#fff" />
                <Text style={styles.detailActionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailActionButton, styles.deleteDetailBtn]}
                onPress={() => confirmDeleteIncident(selectedIncident.id, true)}
              >
                <Ionicons name="trash" size={14} color="#fff" />
                <Text style={styles.detailActionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView style={styles.content}>
          <View style={lastSectionStyle}>
            <View style={styles.detailCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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
                {selectedIncident.title?.toLowerCase().includes('sos') && (
                  <View style={styles.sosLiveIndicator}>
                    <View style={styles.sosLiveDot} />
                    <Text style={styles.sosLiveText}>LIVE SOS</Text>
                  </View>
                )}
              </View>

              <Text style={styles.detailTitle}>{selectedIncident.title}</Text>
              <Text style={styles.detailDate}>
                {format(selectedIncident.date, "MMM dd, yyyy - hh:mm a")}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.detailDescription}>
                {selectedIncident.description}
              </Text>

              {selectedIncident.title?.toLowerCase().includes('sos') && (
                <TouchableOpacity
                  style={styles.goHelpBtn}
                  onPress={() => {
                    setSelectedIncident(null);
                    router.navigate({
                      pathname: "/",
                      params: { incidentId: selectedIncident.id }
                    });
                  }}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={styles.goHelpBtnText}>Go to Help</Text>
                </TouchableOpacity>
              )}

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

          {/* Filtering Chips Container */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'mine' && styles.filterChipActive]}
              onPress={() => setFilter('mine')}
            >
              <Text style={[styles.filterChipText, filter === 'mine' && styles.filterChipTextActive]}>
                Your Incidents
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'others' && styles.filterChipActive]}
              onPress={() => setFilter('others')}
            >
              <Text style={[styles.filterChipText, filter === 'others' && styles.filterChipTextActive]}>
                Other's Incidents
              </Text>
            </TouchableOpacity>
          </View>

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
                <TextInput
                  style={[styles.input, { flex: 1, color: getSeverityColor(newIncident.severity) }]}
                  value={newIncident.severity?.toUpperCase()}
                  placeholder="Select severity"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
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
                <TextInput
                  style={[styles.input, { flex: 1, color: AppColors.foreground }]}
                  value={newIncident.timing || "Select timing"}
                  placeholder="Select timing"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
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

              <View style={styles.locationSectionHeader}>
                <Ionicons name="location" size={16} color={AppColors.themeColor} />
                <Text style={styles.locationSectionTitle}>Incident Location</Text>
              </View>

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
            filteredIncidents.map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={styles.incidentCard}
                onPress={() => setSelectedIncident(incident)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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

                  {incident.title?.toLowerCase().includes('sos') && (
                    <View style={styles.cardSosBadge}>
                      <View style={styles.sosLiveDot} />
                      <Text style={styles.cardSosBadgeText}>LIVE SOS</Text>
                    </View>
                  )}
                </View>

                <Text style={incident.userId === user?.id ? [styles.incidentTitle, { color: AppColors.themeColor }] : styles.incidentTitle}>
                  {incident.title} {incident.userId === user?.id ? "👤" : ""}
                </Text>
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

                {incident.title?.toLowerCase().includes('sos') && (
                  <TouchableOpacity
                    style={styles.cardGoHelpBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.navigate({
                        pathname: "/",
                        params: { incidentId: incident.id }
                      });
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={14} color="#fff" />
                    <Text style={styles.cardGoHelpBtnText}>Go to Help</Text>
                  </TouchableOpacity>
                )}

                {incident.userId === user?.id && (
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.editCardButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        startEditingIncident(incident);
                      }}
                    >
                      <Ionicons name="pencil" size={13} color="#fff" />
                      <Text style={styles.cardActionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.deleteCardButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmDeleteIncident(incident.id);
                      }}
                    >
                      <Ionicons name="trash" size={13} color="#fff" />
                      <Text style={styles.cardActionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}

          {/* Load More Button */}
          {!isLoading && filteredIncidents.length > 0 && (
            <View style={styles.paginationContainer}>
              {hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreIncidents}
                  disabled={isMoreLoading}
                >
                  {isMoreLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.noMoreText}>No more incidents</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Incident Fullscreen Modal */}
      <Modal visible={editingIncident !== null} animationType="slide" onRequestClose={() => setEditingIncident(null)}>
        <View style={[styles.container, { paddingTop: 40 }]}>
          <View style={[styles.header, styles.detailHeader]}>
            <Text style={styles.headerTitle}>Edit Incident</Text>
            <TouchableOpacity onPress={() => setEditingIncident(null)}>
              <Text style={styles.backButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            <View style={lastSectionStyle}>
              <View style={styles.formCard}>
                <TextInput
                  style={styles.input}
                  value={editForm.title}
                  onChangeText={(value) =>
                    setEditForm((prev) => ({ ...prev, title: value }))
                  }
                  placeholder="Title"
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.description}
                  onChangeText={(value) =>
                    setEditForm((prev) => ({ ...prev, description: value }))
                  }
                  placeholder="Description"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.severityRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: getSeverityColor(editForm.severity) }]}
                    value={editForm.severity?.toUpperCase()}
                    placeholder="Select severity"
                    placeholderTextColor="#94a3b8"
                    editable={false}
                  />
                  <TouchableOpacity
                    style={styles.severityButton}
                    onPress={() => setEditOpen(true)}
                  >
                    <Ionicons name="chevron-down" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Modal visible={editOpen} transparent animationType="fade">
                  <Pressable
                    style={styles.backdrop}
                    onPress={() => setEditOpen(false)}
                  />
                  <View style={styles.modalBox}>
                    <Text style={styles.title}>Select Severity</Text>
                    {["low", "medium", "high", "critical"].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.option}
                        onPress={() => {
                          setEditForm((prev) => ({ ...prev, severity: item }));
                          setEditOpen(false);
                        }}
                      >
                        <Text style={[styles.optionText, { color: editForm.severity === item ? AppColors.themeColor : AppColors.foreground }]}>
                          {editForm.severity === item && (
                            <Ionicons name="checkmark" size={15} color={AppColors.themeColor} />
                          )}
                          {editForm.severity === item ? ' ' : ''}
                          {item.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Modal>

                <TextInput
                  style={styles.input}
                  value={editForm.victim}
                  onChangeText={(value) =>
                    setEditForm((prev) => ({ ...prev, victim: value }))
                  }
                  placeholder="Victim"
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  style={styles.input}
                  value={editForm.attackers}
                  onChangeText={(value) =>
                    setEditForm((prev) => ({ ...prev, attackers: value }))
                  }
                  placeholder="Attackers"
                  placeholderTextColor="#94a3b8"
                />

                <View style={styles.numberInputsRow}>
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={editForm.deathToll}
                    onChangeText={(value) =>
                      setEditForm((prev) => ({ ...prev, deathToll: value }))
                    }
                    placeholder="Deaths"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={editForm.injuryCount}
                    onChangeText={(value) =>
                      setEditForm((prev) => ({ ...prev, injuryCount: value }))
                    }
                    placeholder="Injuries"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.numberInput]}
                    value={editForm.peopleHelped}
                    onChangeText={(value) =>
                      setEditForm((prev) => ({ ...prev, peopleHelped: value }))
                    }
                    placeholder="Helpers"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.severityRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: AppColors.foreground }]}
                    value={editForm.timing || "Select timing"}
                    placeholder="Select timing"
                    placeholderTextColor="#94a3b8"
                    editable={false}
                  />
                  <TouchableOpacity
                    style={styles.severityButton}
                    onPress={() => setEditTimingOpen(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Modal visible={editTimingOpen} transparent animationType="fade">
                  <Pressable
                    style={styles.backdrop}
                    onPress={() => setEditTimingOpen(false)}
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
                          setEditForm((prev) => ({ ...prev, timing: item }));
                          setEditTimingOpen(false);
                        }}
                      >
                        <Text style={[styles.optionText, { color: editForm.timing === item ? AppColors.themeColor : AppColors.foreground }]}>
                          {editForm.timing === item && (
                            <Ionicons name="checkmark" size={15} color={AppColors.themeColor} />
                          )}
                          {editForm.timing === item ? ' ' : ''}
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Modal>

                <View style={styles.locationSectionHeader}>
                  <Ionicons name="location" size={16} color={AppColors.themeColor} />
                  <Text style={styles.locationSectionTitle}>Incident Location</Text>
                </View>

                <View style={styles.coordRow}>
                  <View style={styles.coordInputWrapper}>
                    <Ionicons name="navigate" size={14} color={AppColors.themeColor} style={styles.coordIcon} />
                    <TextInput
                      style={styles.coordInput}
                      value={editForm.latitude}
                      onChangeText={(value) => {
                        setEditForm((prev) => ({ ...prev, latitude: value }));
                        const latNum = parseFloat(value);
                        const lngNum = parseFloat(editForm.longitude);
                        if (!isNaN(latNum) && !isNaN(lngNum)) {
                          editMapWebViewRef.current?.injectJavaScript(`movePinTo(${latNum}, ${lngNum}); true;`);
                        }
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
                      value={editForm.longitude}
                      onChangeText={(value) => {
                        setEditForm((prev) => ({ ...prev, longitude: value }));
                        const latNum = parseFloat(editForm.latitude);
                        const lngNum = parseFloat(value);
                        if (!isNaN(latNum) && !isNaN(lngNum)) {
                          editMapWebViewRef.current?.injectJavaScript(`movePinTo(${latNum}, ${lngNum}); true;`);
                        }
                      }}
                      placeholder="Longitude"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>

                <View style={styles.mapContainer}>
                  <WebView
                    ref={editMapWebViewRef}
                    source={{
                      html: buildMapHtml(
                        parseFloat(editForm.latitude) || 23.8103,
                        parseFloat(editForm.longitude) || 90.4125
                      )
                    }}
                    onMessage={(event) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === "locationSelected") {
                          setEditForm((prev) => ({
                            ...prev,
                            latitude: data.lat.toFixed(6),
                            longitude: data.lng.toFixed(6),
                          }));
                        }
                      } catch { }
                    }}
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
                    onPress={handleUpdateIncident}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditingIncident(null)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
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

  // Added Custom Styles for Filters & Card Editing
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: "rgba(240, 145, 41, 0.16)",
  },
  filterChipActive: {
    backgroundColor: AppColors.themeColor,
    borderColor: AppColors.themeColor,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.foreground,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  cardActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    paddingTop: 10,
    justifyContent: "flex-end",
  },
  cardActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editCardButton: {
    backgroundColor: "#3b82f6",
  },
  deleteCardButton: {
    backgroundColor: "#ef4444",
  },
  cardActionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  detailActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editDetailBtn: {
    backgroundColor: "#3b82f6",
  },
  deleteDetailBtn: {
    backgroundColor: "#ef4444",
  },
  detailActionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Pagination Styles
  paginationContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginTop: 10,
  },
  loadMoreButton: {
    backgroundColor: AppColors.themeColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  noMoreText: {
    color: AppColors.muted,
    fontSize: 14,
    fontStyle: "italic",
  },
  sosLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 6,
  },
  sosLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  sosLiveText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  goHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  goHelpBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  cardSosBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardGoHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 12,
    gap: 6,
  },
  cardGoHelpBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
