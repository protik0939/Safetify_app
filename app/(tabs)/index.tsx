import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import SafetifyLogo from '../../assets/images/safetifyLogo.svg';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentLocation, watchLocation } from '../../utils/location';
import { generateMockDangerZones } from '../../utils/mockData';

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
  zones: ReturnType<typeof generateMockDangerZones>
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

    // Receive location updates from React Native
    document.addEventListener('message', handleMsg);
    window.addEventListener('message', handleMsg);
    function handleMsg(e) {
      try {
        var d = JSON.parse(e.data);
        if (d.type === 'updateLocation') {
          userMarker.setLatLng([d.lat, d.lng]);
          map.panTo([d.lat, d.lng]);
        }
      } catch(_) {}
    }
  </script>
</body>
</html>`;
};

export default function DashboardScreen() {
  const { setCurrentLocation, setDangerZones, dangerZones } = useAppStore();
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-500)).current;
  const webViewRef = useRef<WebView>(null);
  const [mapCenter, setMapCenter] = useState({ latitude: 23.7808, longitude: 90.4132 });

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

      setDangerZones(generateMockDangerZones());

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

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const leafletHTML = buildLeafletHTML(mapCenter.latitude, mapCenter.longitude, dangerZones);

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
          <Text style={styles.permissionIcon}><Ionicons name='location' color={'white'} size={40} /></Text>
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
              menuVisible ? <Ionicons name="chevron-up" size={24} color="#fff" /> : <Ionicons name="menu" size={24} color="#fff" />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  permissionIcon: {
    fontSize: 60,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#ef4444',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
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
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 0,
    paddingLeft: 5,
  },
  dangerZonesPanel: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#334155',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dangerZoneType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  dangerZoneCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
