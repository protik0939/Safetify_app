import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import Toast from '@/components/AppToast';
import { WebView } from 'react-native-webview';
import SafetifyLogo from '../../assets/images/safetifyLogo.svg';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentLocation, watchLocation } from '../../utils/location';
import { generateMockDangerZones } from '../../utils/mockData';
import { getAllIncidents, type IncidentRecord } from '../../utils/incidentApi';
import { AppColors } from '@/constants/theme';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high':     return '#f97316';
    case 'medium':   return '#eab308';
    case 'low':      return '#3b82f6';
    default:         return '#6b7280';
  }
};

const buildLeafletHTML = (
  lat: number,
  lng: number,
  zones: ReturnType<typeof generateMockDangerZones>,
  incidents: IncidentRecord[],
) => {
  const zonesJSON = JSON.stringify(
    zones.map((z) => ({
      lat: z.center.latitude,
      lng: z.center.longitude,
      radius: z.radius * 1000,
      severity: z.severity,
      color: getSeverityColor(z.severity),
    }))
  );

  const incidentsJSON = JSON.stringify(
    incidents.map((inc) => ({
      lat: inc.latitude,
      lng: inc.longitude,
      severity: inc.severityLevel || 'medium',
      color: getSeverityColor(inc.severityLevel || 'medium'),
      title: inc.title || 'Incident',
      victimName: inc.user?.name || inc.victim || 'Someone',
      status: inc.status,
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #0f172a; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // User location marker
    var userIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.35);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: '',
    });
    var userMarker = L.marker([${lat}, ${lng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

    // Danger zones
    var zones = ${zonesJSON};
    zones.forEach(function(z) {
      L.circle([z.lat, z.lng], {
        radius: z.radius,
        color: z.color,
        fillColor: z.color,
        fillOpacity: 0.20,
        weight: 2,
      }).addTo(map);

      var pinIcon = L.divIcon({
        html: '<div style="width:12px;height:12px;border-radius:50%;background:' + z.color + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        className: '',
      });
      L.marker([z.lat, z.lng], { icon: pinIcon }).addTo(map);
    });

    // Incident heatmap markers
    var incidents = ${incidentsJSON};
    incidents.forEach(function(inc) {
      // Heatmap circle for each incident
      L.circle([inc.lat, inc.lng], {
        radius: 300,
        color: inc.color,
        fillColor: inc.color,
        fillOpacity: 0.25,
        weight: 1,
        opacity: 0.6,
      }).addTo(map);

      // Show name bubble ONLY for active SOS incidents
      var isSOSActive = inc.title && inc.title.toLowerCase().includes('sos') && inc.status !== 'resolved';
      var bubbleColor = inc.severity === 'critical' ? '#dc2626' : (inc.severity === 'high' ? '#f97316' : '#eab308');
      
      var incIcon;
      if (isSOSActive) {
        var labelText = '🚨 ' + inc.victimName;
        incIcon = L.divIcon({
          html: '<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">' +
                '<div style="background:' + bubbleColor + ';color:#fff;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;box-shadow:0 1px 4px rgba(0,0,0,0.3);">' + labelText + '</div>' +
                '<div style="width:10px;height:10px;border-radius:50%;background:' + inc.color + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>' +
                '</div>',
          iconSize: [80, 30],
          iconAnchor: [40, 26],
          className: '',
        });
      } else {
        // Normal pin, no name bubble
        incIcon = L.divIcon({
          html: '<div style="width:10px;height:10px;border-radius:50%;background:' + inc.color + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
          className: '',
        });
      }
      
      var marker = L.marker([inc.lat, inc.lng], { icon: incIcon }).addTo(map);
      marker.bindPopup('<b>' + inc.title + '</b><br><b>Victim:</b> ' + inc.victimName + '<br><b>Severity:</b> ' + inc.severity.toUpperCase());
    });

    // Receive location updates from React Native
    document.addEventListener('message', handleMsg);
    window.addEventListener('message', handleMsg);
    function handleMsg(e) {
      try {
        var d = JSON.parse(e.data);
        if (d.type === 'updateLocation') {
          userMarker.setLatLng([d.lat, d.lng]);
          map.panTo([d.lat, d.lng]);
        } else if (d.type === 'updateSOSState') {
          updateSOSState(d.users);
        }
      } catch(_) {}
    }

    var sosMarkers = {};
    function updateSOSState(users) {
      var currentIds = users.map(function(u) { return u.userId; });
      Object.keys(sosMarkers).forEach(function(id) {
        if (currentIds.indexOf(id) === -1) {
          map.removeLayer(sosMarkers[id]);
          delete sosMarkers[id];
        }
      });

      users.forEach(function(u) {
        if (u.lat === undefined || u.lng === undefined) return;

        var color = u.role === 'victim' ? '#dc2626' : '#16a34a';
        var borderShadow = u.role === 'victim' ? '0 0 10px #dc2626' : '0 0 15px #16a34a';

        var markerIcon;
        if (u.role === 'victim') {
          markerIcon = L.divIcon({
            html: '<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">' +
                  '<div style="background:' + color + ';color:#fff;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;box-shadow:0 1px 4px rgba(0,0,0,0.3);">' + u.name + '</div>' +
                  '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:' + borderShadow + ';"></div>' +
                  '</div>',
            iconSize: [60, 30],
            iconAnchor: [30, 26],
            className: '',
          });
        } else {
          // Responder shield shape to show he is responding to help the person
          markerIcon = L.divIcon({
            html: '<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">' +
                  '<div style="background:#16a34a;color:#fff;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;box-shadow:0 1px 4px rgba(0,0,0,0.3);">🛡️ ' + u.name + ' (Helper)</div>' +
                  '<div style="width:14px;height:16px;background:#16a34a;border:2px solid #fff;border-radius:2px 2px 7px 7px;box-shadow:' + borderShadow + ';display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:7px;font-weight:bold;line-height:1;">🛡️</span></div>' +
                  '</div>',
            iconSize: [100, 30],
            iconAnchor: [50, 26],
            className: '',
          });
        }

        if (sosMarkers[u.userId]) {
          sosMarkers[u.userId].setLatLng([u.lat, u.lng]);
        } else {
          sosMarkers[u.userId] = L.marker([u.lat, u.lng], { icon: markerIcon }).addTo(map);
        }
      });
    }
  </script>
</body>
</html>`;
};

export default function DashboardScreen() {
  const { setCurrentLocation, setDangerZones, dangerZones } = useAppStore();
  const user = useAppStore((s) => s.user);
  const isSOSActive = useAppStore((s) => s.isSOSActive);
  const activeSOSIncidentId = useAppStore((s) => s.activeSOSIncidentId);
  const currentLocation = useAppStore((s) => s.currentLocation);

  const { incidentId } = useLocalSearchParams<{ incidentId?: string }>();

  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-500)).current;
  const webViewRef = useRef<WebView>(null);
  const [mapCenter, setMapCenter] = useState({ latitude: 23.7808, longitude: 90.4132 });
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);

  // WebSocket Live SOS Tracking state
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [isHelperMode, setIsHelperMode] = useState(false);
  const [isProtectingAccepted, setIsProtectingAccepted] = useState(false);
  const [sosUsers, setSosUsers] = useState<any[]>([]);
  const [victimName, setVictimName] = useState<string | null>(null);
  const [victimLocation, setVictimLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const requestLocationPermission = async () => {
    setIsRequestingLocation(true);
    const location = await getCurrentLocation();

    if (location) {
      setLocationPermissionGranted(true);
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
        accuracy: location.coords.accuracy || undefined,
      });

      setMapCenter({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Location access granted!',
      });

      // Only set mock danger zones if we don't have any cached danger zones yet
      const currentDangerZones = useAppStore.getState().dangerZones;
      if (!currentDangerZones || currentDangerZones.length === 0) {
        setDangerZones(generateMockDangerZones());
      }

      watchLocation((newLocation) => {
        const lat = newLocation.coords.latitude;
        const lng = newLocation.coords.longitude;
        setCurrentLocation({
          latitude: lat,
          longitude: lng,
          timestamp: new Date(),
          accuracy: newLocation.coords.accuracy || undefined,
        });
        setMapCenter({ latitude: lat, longitude: lng });
        // Push live location update into the WebView map
        webViewRef.current?.injectJavaScript(
          `handleMsg({ data: JSON.stringify({ type: 'updateLocation', lat: ${lat}, lng: ${lng} }) }); true;`
        );
      });
    } else {
      setLocationPermissionGranted(false);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Location access denied',
      });
    }
    setIsRequestingLocation(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchIncidents();
    }, [])
  );

  useEffect(() => {
    requestLocationPermission();

    // Refresh active incidents list in the background every 15s to capture live/resolved status
    const interval = setInterval(() => {
      fetchIncidents();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await getAllIncidents();
      setIncidents(data);
      
      // Update store caches too
      const { setCachedIncidents, setDangerZones: storeSetDangerZones } = useAppStore.getState();
      setCachedIncidents(data);
      
      // Update danger zones from the fetched incidents
      const mappedDangerZones = data.map((incident) => {
        const getSeverity = (level: string | null): 'low' | 'medium' | 'high' | 'critical' => {
          if (!level) return 'medium';
          const l = level.toLowerCase();
          if (l === 'low' || l === 'medium' || l === 'high' || l === 'critical') {
            return l as 'low' | 'medium' | 'high' | 'critical';
          }
          return 'medium';
        };

        const getRadius = (severity: 'low' | 'medium' | 'high' | 'critical'): number => {
          switch (severity) {
            case 'critical': return 0.5;
            case 'high': return 0.4;
            case 'medium': return 0.3;
            case 'low': return 0.2;
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
      storeSetDangerZones(mappedDangerZones);
    } catch (error) {
      console.warn('Failed to load incidents for map (using offline fallback):', error);
      // Fallback to locally cached incidents
      const cached = useAppStore.getState().cachedIncidents;
      if (cached && cached.length > 0) {
        setIncidents(cached);
      }
    }
  };

  // Helper to dynamically construct WS url
  const getWebSocketUrl = () => {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const wsProto = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = baseUrl.replace(/^https?:\/\//, '');
    return `${wsProto}://${host}/ws`;
  };

  // Effect: Handle opening from push notification
  useEffect(() => {
    if (incidentId) {
      console.log('[Dashboard] Opened from notification for SOS incident:', incidentId);
      setActiveSosId(incidentId);
      setIsHelperMode(true);
      setIsProtectingAccepted(false);
    }
  }, [incidentId]);

  // Effect: Sync our own SOS activation with activeSosId
  useEffect(() => {
    if (isSOSActive && activeSOSIncidentId) {
      setActiveSosId(activeSOSIncidentId);
      setIsHelperMode(false);
      setIsProtectingAccepted(true); // Victim has already "accepted" their own SOS
    } else if (!isSOSActive && !incidentId) {
      setActiveSosId(null);
      setIsHelperMode(false);
      setSosUsers([]);
      fetchIncidents(); // Refresh the normal incidents list on the map
    }
  }, [isSOSActive, activeSOSIncidentId, incidentId]);

  // Effect: Handle WebSocket connection and state synchronization
  useEffect(() => {
    if (!activeSosId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setSosUsers([]);
      return;
    }

    // Skip connecting to WebSocket as responder if we haven't tapped "Protect him" yet
    if (isHelperMode && !isProtectingAccepted) {
      // Show the victim's static location
      const findIncident = incidents.find(i => i.id === activeSosId);
      if (findIncident) {
        setVictimName(findIncident.user?.name || 'Someone');
        setVictimLocation({ latitude: findIncident.latitude, longitude: findIncident.longitude });
        setMapCenter({ latitude: findIncident.latitude, longitude: findIncident.longitude });
      }
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log('[MapWS] Connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[MapWS] Connection opened. Joining room:', activeSosId);
      socket.send(JSON.stringify({
        type: 'join_sos',
        data: {
          userId: user?.id || 'unknown',
          incidentId: activeSosId,
          role: isHelperMode ? 'responder' : 'victim',
          name: user?.name || 'User',
          lat: currentLocation?.latitude,
          lng: currentLocation?.longitude,
        }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'sos_state') {
          console.log('[MapWS] Received SOS state update:', payload.data);
          const users = payload.data.users || [];
          setSosUsers(users);

          // Update Leaflet map markers inside WebView
          const js = `handleMsg({ data: JSON.stringify({ type: 'updateSOSState', users: ${JSON.stringify(users)} }) }); true;`;
          webViewRef.current?.injectJavaScript(js);

          // If in helper mode, track victim's live location
          if (isHelperMode) {
            const victim = users.find((u: any) => u.role === 'victim');
            if (victim && victim.lat !== undefined && victim.lng !== undefined) {
              setVictimName(victim.name);
              setVictimLocation({ latitude: victim.lat, longitude: victim.lng });
              // Also update map center to victim
              setMapCenter({ latitude: victim.lat, longitude: victim.lng });
            }
          }
        }
      } catch (err) {
        console.error('[MapWS] Error parsing message:', err);
      }
    };

    socket.onclose = () => {
      console.log('[MapWS] Connection closed');
    };

    socket.onerror = (err) => {
      console.error('[MapWS] Socket error:', err);
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [activeSosId, isHelperMode, isProtectingAccepted, incidents]);

  // Effect: Stream our location updates to the WebSocket server
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentLocation) {
      wsRef.current.send(JSON.stringify({
        type: 'update_location',
        data: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        }
      }));
    }
  }, [currentLocation]);

  // Handler: Responder accepts to help ("Protect Him" tap)
  const handleProtectHim = async () => {
    if (!activeSosId || !user) return;
    try {
      const BASE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1`;
      const response = await fetch(`${BASE_URL}/incidents/${activeSosId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responderId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register help response.');
      }

      setIsProtectingAccepted(true);
      Toast.show({
        type: 'success',
        text1: 'On Your Way!',
        text2: 'Victim has been notified you are coming.',
      });
    } catch (err) {
      console.error('[Protect] Error:', err);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  };

  // Handler: Cancel SOS tracking or close SOS card
  const handleStopSosTracking = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setActiveSosId(null);
    setIsHelperMode(false);
    setIsProtectingAccepted(false);
    setSosUsers([]);
    setVictimName(null);
    setVictimLocation(null);
    // Reload normal incidents map
    fetchIncidents();
  };

  const leafletHTML = buildLeafletHTML(mapCenter.latitude, mapCenter.longitude, dangerZones, incidents);

  const toggleMenu = () => {
    const toValue = menuVisible ? -500 : 0;
    setMenuVisible(!menuVisible);
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const LEGEND = [
    { label: 'Critical', color: '#dc2626' },
    { label: 'High', color: '#f97316' },
    { label: 'Medium', color: '#eab308' },
    { label: 'Low', color: '#3b82f6' },
  ];

  if (!locationPermissionGranted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}><Ionicons name='location' color={AppColors.themeColor} size={40} /></Text>
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            Safetify needs your location to provide safety alerts and show nearby danger zones.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestLocationPermission}
            disabled={isRequestingLocation}
          >
            {isRequestingLocation ? (
              <View style={styles.permissionButtonLoading}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.permissionButtonText}>Checking Location Access</Text>
              </View>
            ) : (
              <Text style={styles.permissionButtonText}>Grant Location Access</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: leafletHTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs
      />

      <View style={styles.topPanel}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <SafetifyLogo width={28} height={28} />
            <Text style={styles.headerTitle}>Safetify</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu} activeOpacity={0.7}>
            {
              menuVisible ? <Ionicons name="chevron-up" size={24} color="#rgba(15, 23, 42, 0.97)" /> : <Ionicons name="menu" size={24} color="rgba(15, 23, 42, 0.97)" />}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.dangerZonesPanel, { transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dangerZonesList}
        >
          {dangerZones.map((zone) => (
            <View key={zone.id} style={styles.dangerZoneCard}>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(zone.severity) }]}>
                <Text style={styles.severityText}>{zone.severity.toUpperCase()}</Text>
              </View>
              <Text style={styles.dangerZoneType}>{zone.type}</Text>
              <Text style={styles.dangerZoneCount}>{zone.count} incidents</Text>
            </View>
          ))}
          {incidents.length > 0 && (
            <View style={styles.dangerZoneCard}>
              <View style={[styles.severityBadge, { backgroundColor: AppColors.themeColor }]}>
                <Text style={styles.severityText}>LIVE</Text>
              </View>
              <Text style={styles.dangerZoneType}>Reported Incidents</Text>
              <Text style={styles.dangerZoneCount}>{incidents.length} total reports</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Severity legend chips over the map */}
      <View style={styles.legendContainer}>
        {LEGEND.map((item) => (
          <View key={item.label} style={[styles.legendChip, { backgroundColor: item.color }]}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Real-time SOS bottom overlay card (only visible to responders to avoid overlapping victim UI) */}
      {activeSosId && isHelperMode && (
        <View style={styles.sosCardOverlay}>
          <View style={styles.sosCardHeader}>
            <View style={styles.sosStatusDot} />
            <Text style={styles.sosCardTitle}>
              {isHelperMode ? "Emergency SOS Nearby" : "Emergency SOS Active"}
            </Text>
          </View>

          <Text style={styles.sosCardDetail}>
            {isHelperMode
              ? `Protecting: ${victimName || 'Someone in Danger'}`
              : "Sharing your live location with nearby helpers."}
          </Text>

          <View style={styles.helpersSection}>
            <Text style={styles.helpersCountTitle}>
              <Ionicons name="people" size={16} color={AppColors.foreground} />{' '}
              {sosUsers.filter(u => u.role === 'responder').length} Helper(s) En Route
            </Text>
            {sosUsers.filter(u => u.role === 'responder').length > 0 ? (
              <Text style={styles.helperNamesList}>
                {sosUsers.filter(u => u.role === 'responder').map(u => u.name).join(', ')}
              </Text>
            ) : (
              <Text style={styles.helperNamesPlaceholder}>Waiting for responders to accept...</Text>
            )}
          </View>

          {isHelperMode && !isProtectingAccepted && (
            <TouchableOpacity
              style={styles.protectButton}
              onPress={handleProtectHim}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.protectButtonText}>Protect Him</Text>
            </TouchableOpacity>
          )}

          {isHelperMode && isProtectingAccepted && (
            <View style={styles.acceptedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text style={styles.acceptedBannerText}>You are on the way to help</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeSosCardBtn}
            onPress={handleStopSosTracking}
            activeOpacity={0.7}
          >
            <Text style={styles.closeSosCardBtnText}>
              {isHelperMode ? "Close View" : "Stop Tracking"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Real-time helpers list floating button (visible only to the victim to prevent overlapping with "Send live details") */}
      {!isHelperMode && activeSosId && (
        <TouchableOpacity
          style={styles.victimHelpersFloatingBtn}
          onPress={() => {
            const responders = sosUsers.filter(u => u.role === 'responder');
            const names = responders.map(r => r.name).join('\n') || 'None yet';
            Alert.alert(
              'En Route Helpers',
              `Total: ${responders.length} helper(s)\n\nNames:\n${names}`,
              [{ text: 'OK' }]
            );
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={18} color="#fff" />
          <Text style={styles.victimHelpersFloatingBtnText}>
            Helpers ({sosUsers.filter(u => u.role === 'responder').length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  map: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: AppColors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  permissionIcon: {
    fontSize: 60,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.foreground,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: AppColors.foreground,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: AppColors.themeColor,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: '600',
  },
  topPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: AppColors.background,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: AppColors.foreground,
  },
  headerSubtitle: {
    fontSize: 8,
    color: AppColors.foreground,
    marginTop: 0,
    paddingLeft: 5,
  },
  dangerZonesPanel: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    backgroundColor: AppColors.background,
    paddingBottom: 12,
    zIndex: 9,
    margin: 10,
    borderRadius: 15,
  },
  dangerZonesList: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  menuButton: {
    padding: 8,
    gap: 5,
    justifyContent: 'center',
  },
  menuLine: {
    width: 24,
    height: 2.5,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginVertical: 2,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    gap: 6,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  legendText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dangerZoneCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 150,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  severityText: {
    color: AppColors.foreground,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dangerZoneType: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.foreground,
    marginBottom: 4,
  },
  dangerZoneCount: {
    fontSize: 12,
    color: AppColors.foreground,
  },
  sosCardOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  sosCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sosStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  sosCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sosCardDetail: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 16,
  },
  helpersSection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  helpersCountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
  },
  helperNamesList: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  helperNamesPlaceholder: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  protectButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  protectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  acceptedBanner: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  acceptedBannerText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
  },
  closeSosCardBtn: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeSosCardBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  victimHelpersFloatingBtn: {
    position: 'absolute',
    top: 170,
    right: 16,
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 100,
  },
  victimHelpersFloatingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
