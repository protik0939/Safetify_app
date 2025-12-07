import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentLocation, watchLocation } from '../../utils/location';
import { generateMockDangerZones } from '../../utils/mockData';
import SOSButton from '../../components/SOSButton';
import Toast from 'react-native-toast-message';

export default function DashboardScreen() {
  const { setCurrentLocation, setDangerZones, dangerZones } = useAppStore();
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
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
          <Text style={styles.permissionIcon}>📍</Text>
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
            <Text style={styles.headerSubtitle}>Stay Safe, Stay Connected</Text>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.dangerZonesList}
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
      </View>

      <SOSButton />
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
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  dangerZonesList: {
    paddingHorizontal: 20,
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
