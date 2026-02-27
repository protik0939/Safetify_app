import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Toast from 'react-native-toast-message';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentLocation, watchLocation } from '../../utils/location';
import { generateMockDangerZones } from '../../utils/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { setCurrentLocation, setDangerZones, dangerZones } = useAppStore();
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-180)).current;
  const [mapRegion, setMapRegion] = useState({
    latitude: 23.7808,
    longitude: 90.4132,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

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

      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Location access granted!',
      });

      setDangerZones(generateMockDangerZones());

      watchLocation((newLocation) => {
        setCurrentLocation({
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          timestamp: new Date(),
          accuracy: newLocation.coords.accuracy || undefined,
        });
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

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
            <Text style={styles.permissionButtonText}>
              {isRequestingLocation ? 'Requesting...' : 'Grant Location Access'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        region={mapRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {dangerZones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={{
                latitude: zone.center.latitude,
                longitude: zone.center.longitude,
              }}
              radius={zone.radius * 1000}
              fillColor={`${getSeverityColor(zone.severity)}40`}
              strokeColor={getSeverityColor(zone.severity)}
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: zone.center.latitude,
                longitude: zone.center.longitude,
              }}
              pinColor={getSeverityColor(zone.severity)}
            />
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.topPanel}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🛡️ Safetify</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color="#fff" />
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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
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
    top: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    paddingBottom: 14,
    zIndex: 9,
  },
  dangerZonesList: {
    paddingHorizontal: 20,
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
